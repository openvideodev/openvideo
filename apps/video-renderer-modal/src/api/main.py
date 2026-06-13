"""Modal service for headless video rendering using Playwright and @openvideo/engine-pixi."""

import os
import json
import base64
import http.server
import socketserver
import threading
import tempfile
import urllib.request
import subprocess
from typing import Dict, Any, Optional, Union
import modal
from playwright.async_api import async_playwright
from dotenv import load_dotenv

# Load local environment variables from .env file
load_dotenv()

# 1. Define Modal App
app = modal.App("openvideo-video-renderer")

# 2. Define path to renderer.html locally
RENDERER_HTML_MOUNT_PATH = os.path.abspath(
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "renderer.html")
)

# 3. Define Modal Container Image with all required rendering dependencies
image = (
    modal.Image.debian_slim()
    .apt_install("curl", "ffmpeg")
    # Install Node.js 22 (required to load/run @openvideo/engine-pixi in Playwright browser)
    .run_commands(
        "curl -fsSL https://deb.nodesource.com/setup_22.x | bash -",
        "apt-get install -y nodejs",
    )
    # Install Playwright Python client, boto3 for R2 uploading, and python-dotenv
    .pip_install("playwright>=1.40.0", "boto3>=1.28.0", "python-dotenv>=1.0.0")
    # Download Chromium browser and its system dependencies (libnss3, libgbm1, etc.)
    .run_commands("playwright install --with-deps chromium")
    # Install the specific engine-pixi version into /app inside the container
    .run_commands(
        "mkdir -p /app",
        "cd /app && npm install @openvideo/engine-pixi@1.1.5"
    )
    # Mount renderer.html dynamically from the host workspace
    .add_local_file(RENDERER_HTML_MOUNT_PATH, "/app/renderer.html")
)

# 4. Define Modal Secrets for Cloudflare R2 Credentials
r2_secret = modal.Secret.from_dict({
    "R2_ACCOUNT_ID": os.getenv("R2_ACCOUNT_ID", "45c4145a0d2fc6bb6d856863e2ed67ca"),
    "R2_ACCESS_KEY_ID": os.getenv("R2_ACCESS_KEY_ID", "b76fe800b0a13560574355b996136ab1"),
    "R2_SECRET_ACCESS_KEY": os.getenv("R2_SECRET_ACCESS_KEY", "3baf720d3eb33490f4bc029bd02d396e4288436cf5ca6c1c93db666c0c5bea7f"),
    "R2_BUCKET_NAME": os.getenv("R2_BUCKET_NAME", "scenify-dev"),
    "R2_PUBLIC_DOMAIN": os.getenv("R2_PUBLIC_DOMAIN", "https://cdn.scenify.io")
})

# renderer.html is already mounted directly via image.add_local_file

# ---------------------------------------------------------------------------
# Path configuration (handles both Modal container and local environments)
# ---------------------------------------------------------------------------

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
RENDERER_HTML_PATH = "/app/renderer.html"
ENGINE_DIST_PATH = "/app/node_modules/@openvideo/engine-pixi/dist"

IS_LOCAL = not os.path.exists(RENDERER_HTML_PATH)

# Local testing path overrides
if IS_LOCAL:
    local_html = os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", "renderer.html"))
    if os.path.exists(local_html):
        RENDERER_HTML_PATH = local_html

    local_dist = os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", "..", "..", "packages", "engine-pixi", "dist"))
    if os.path.exists(local_dist):
        ENGINE_DIST_PATH = local_dist
    else:
        local_node_modules_dist = os.path.abspath(
            os.path.join(CURRENT_DIR, "..", "..", "node_modules", "@openvideo", "engine-pixi", "dist")
        )
        if os.path.exists(local_node_modules_dist):
            ENGINE_DIST_PATH = local_node_modules_dist


# ---------------------------------------------------------------------------
# Threaded HTTP Server to serve renderer.html and engine-pixi bundle
# ---------------------------------------------------------------------------

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom request handler to serve local renderer.html and engine-pixi package dist."""
    
    def __init__(self, *args, **kwargs):
        directory = os.path.dirname(RENDERER_HTML_PATH)
        super().__init__(*args, directory=directory, **kwargs)

    def translate_path(self, path: str) -> str:
        # Route requests starting with /engine-pixi/ to the local or container engine dist directory
        if path.startswith("/engine-pixi/"):
            rel_path = path[len("/engine-pixi/"):]
            rel_path = os.path.normpath(rel_path).lstrip("/")
            return os.path.join(ENGINE_DIST_PATH, rel_path)
        # Route requests starting with /temp-clips/ to the server's temp directory
        elif path.startswith("/temp-clips/"):
            rel_path = path[len("/temp-clips/"):]
            rel_path = os.path.normpath(rel_path).lstrip("/")
            temp_dir = getattr(self.server, "temp_dir", None)
            if temp_dir:
                return os.path.join(temp_dir, rel_path)
        # Route root requests to renderer.html
        elif path == "/" or path == "/index.html":
            return RENDERER_HTML_PATH
        return super().translate_path(path)

    def log_message(self, format, *args):
        # Silence HTTP server logs to keep console clean unless debugging
        pass


class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    """Threaded HTTP server to handle concurrent playwright connections."""
    pass


# ---------------------------------------------------------------------------
# Video Pre-transcoding (Opus audio compatibility step)
# ---------------------------------------------------------------------------

def pretranscode_videos(project: dict, temp_dir: str, port: int) -> dict:
    """Pre-transcodes any external video clips to container format with AAC audio.
    
    This is required to make audio streams compatible with WebCodecs inside Chromium.
    """
    clips = project.get("clips", {})
    if not clips:
        return project

    import concurrent.futures
    import ssl
    import hashlib
    import shutil
    
    ssl_context = ssl._create_unverified_context()
    transcoded_clips = {}
    
    cache_dir = os.path.join(tempfile.gettempdir(), "openvideo_transcode_cache")

    def process_clip(clip_id, clip):
        if (
            isinstance(clip, dict)
            and clip.get("type") == "Video"
            and clip.get("src", "").startswith("http")
            and clip.get("audio") != False
        ):
            try:
                src_url = clip["src"]
                # Compute SHA256 of the source URL for caching
                url_hash = hashlib.sha256(src_url.encode("utf-8")).hexdigest()
                cached_file = os.path.join(cache_dir, f"transcoded-{url_hash}.mp4")
                
                temp_output = os.path.join(temp_dir, f"clip-{clip_id}.mp4")
                
                # Check if we have a cached version
                if os.path.exists(cached_file):
                    print(f"[pretranscode] Using cached transcoded clip for {clip_id}...")
                    shutil.copy(cached_file, temp_output)
                else:
                    temp_input = os.path.join(temp_dir, f"input-{clip_id}.mp4")
                    print(f"[pretranscode] Downloading clip {clip_id} from {src_url}...")
                    
                    req = urllib.request.Request(src_url, headers={"User-Agent": "OpenVideo/1.0"})
                    with urllib.request.urlopen(req, context=ssl_context) as response:
                        with open(temp_input, "wb") as out_file:
                            out_file.write(response.read())

                    print(f"[pretranscode] Transcoding clip {clip_id} to MP4/AAC audio...")
                    subprocess.run(
                        [
                            "ffmpeg",
                            "-i", temp_input,
                            "-c:v", "copy",
                            "-c:a", "aac",
                            "-b:a", "128k",
                            temp_output,
                            "-y"
                        ],
                        check=True,
                        capture_output=True,
                        timeout=300
                    )

                    if os.path.exists(temp_input):
                        os.remove(temp_input)

                    # Save to cache for future runs
                    try:
                        os.makedirs(cache_dir, exist_ok=True)
                        shutil.copy(temp_output, cached_file)
                        print(f"[pretranscode] Saved transcoded clip {clip_id} to cache.")
                    except Exception as cache_err:
                        print(f"[pretranscode] Warning: Failed to save to cache: {cache_err}")

                # Reference the local serving URL instead of a Base64 data URL
                new_clip = dict(clip)
                new_clip["src"] = f"http://127.0.0.1:{port}/temp-clips/clip-{clip_id}.mp4"
                print(f"[pretranscode] Successfully processed clip {clip_id} and served locally.")
                return clip_id, new_clip
            except Exception as e:
                print(f"[pretranscode] Warning: Failed to transcode clip {clip_id}: {e}. Keeping original source.")
                return clip_id, clip
        else:
            return clip_id, clip

    # Run in parallel to speed up rendering startup
    with concurrent.futures.ThreadPoolExecutor() as executor:
        futures = {executor.submit(process_clip, cid, clip): cid for cid, clip in clips.items()}
        for future in concurrent.futures.as_completed(futures):
            cid = futures[future]
            try:
                clip_id, processed_clip = future.result()
                transcoded_clips[clip_id] = processed_clip
            except Exception as e:
                print(f"[pretranscode] Error in thread for clip {cid}: {e}")
                transcoded_clips[cid] = clips[cid]

    new_project = dict(project)
    new_project["clips"] = transcoded_clips
    return new_project


# ---------------------------------------------------------------------------
# R2/Cloudflare storage uploader implementation
# ---------------------------------------------------------------------------

def upload_to_r2(file_data: bytes, key: str) -> str:
    """Upload raw bytes to Cloudflare R2 and return the public URL."""
    account_id = os.getenv("R2_ACCOUNT_ID")
    access_key_id = os.getenv("R2_ACCESS_KEY_ID")
    secret_access_key = os.getenv("R2_SECRET_ACCESS_KEY")
    bucket_name = os.getenv("R2_BUCKET_NAME", "scenify-dev")
    public_domain = os.getenv("R2_PUBLIC_DOMAIN", "https://cdn.scenify.io")

    if not all([account_id, access_key_id, secret_access_key]):
        raise ValueError("R2 credentials not fully configured in environment variables.")

    endpoint = f"https://{account_id}.r2.cloudflarestorage.com"
    
    # Auto-detect Content-Type from suffix
    content_type = "video/mp4"
    if key.lower().endswith(".mp3"):
        content_type = "audio/mpeg"
    elif key.lower().endswith(".png"):
        content_type = "image/png"
    elif key.lower().endswith(".jpg") or key.lower().endswith(".jpeg"):
        content_type = "image/jpeg"

    print(f"[modal-renderer] Uploading {len(file_data)} bytes to R2 bucket '{bucket_name}' under key '{key}'...")
    
    try:
        import boto3
        from botocore.config import Config

        s3 = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            config=Config(signature_version="s3v4")
        )

        s3.put_object(
            Bucket=bucket_name,
            Key=key,
            Body=file_data,
            ContentType=content_type,
        )

        public_url = f"{public_domain.rstrip('/')}/{key.lstrip('/')}"
        print(f"[modal-renderer] R2 upload successful! Public URL: {public_url}")
        return public_url
    except Exception as e:
        print(f"[modal-renderer] boto3 R2 upload failed: {e}")
        raise e


# ---------------------------------------------------------------------------
# Core Modal Video Rendering Function
# ---------------------------------------------------------------------------

@app.function(
    image=image,
    timeout=600,  # 10 minutes maximum rendering budget
    memory=2048,  # 2GB RAM
    cpu=4.0,      # 4 CPU cores
    secrets=[r2_secret]
)
async def render_video(project: dict, options: Optional[dict] = None) -> Union[bytes, dict]:
    """Render an OpenVideo project JSON to a compiled MP4 video binary using Playwright and engine-pixi.
    
    Parameters:
    - project (dict): The timeline project settings and clips JSON definition.
    - options (dict): Options like output resolution, fps, bitrate, audio settings, etc.
    
    Returns:
    - bytes: Raw MP4 video file binary content.
    """
    if options is None:
        options = {}

    with tempfile.TemporaryDirectory() as temp_dir:
        print("[modal-renderer] Initializing Threaded HTTP Server...")
        server = ThreadedHTTPServer(("127.0.0.1", 0), CustomHTTPRequestHandler)
        server.temp_dir = temp_dir
        ip, port = server.server_address

        server_thread = threading.Thread(target=server.serve_forever)
        server_thread.daemon = True
        server_thread.start()
        print(f"[modal-renderer] HTTP Server running on http://127.0.0.1:{port}")

        try:
            format_opt = options.get("format", "mp4")
            video_codec = options.get("videoCodec", "avc1.640033")
            bitrate = options.get("bitrate", 12_000_000)
            audio = options.get("audio", True)
            audio_codec = options.get("audioCodec", "opus")
            audio_sample_rate = options.get("audioSampleRate", 48_000)
            prioritize_speed = options.get("prioritizeSpeed", False)
            timeout_ms = options.get("timeout", 600_000)

            # 1. Run Pre-transcoder to optimize browser audio rendering if enabled
            if audio:
                print("[modal-renderer] Running pre-transcoding pipeline...")
                project = pretranscode_videos(project, temp_dir, port)

            # 2. Configure PixiJS Compositor options
            settings = project.get("settings", {})
            compositor_options = {
                "width": options.get("width") or settings.get("width") or 1920,
                "height": options.get("height") or settings.get("height") or 1080,
                "fps": options.get("fps") or settings.get("fps") or 30,
                "backgroundColor": options.get("backgroundColor") or settings.get("backgroundColor") or "#000000",
                "format": format_opt,
                "videoCodec": video_codec,
                "bitrate": int(bitrate * 0.7) if prioritize_speed else bitrate,
                "audio": audio,
                "audioCodec": audio_codec,
                "audioSampleRate": audio_sample_rate,
                "prioritizeSpeed": prioritize_speed
            }

            print(f"[modal-renderer] Launching Playwright Chromium (headless={not IS_LOCAL})...")
            async with async_playwright() as p:
                browser = await p.chromium.launch(
                    headless=not IS_LOCAL,
                    args=[
                        "--no-sandbox",
                        "--disable-dev-shm-usage",
                        "--disable-setuid-sandbox",
                        "--disable-background-timer-throttling",
                        "--disable-renderer-backgrounding",
                        "--disable-backgrounding-occluded-windows",
                        "--enable-features=WebCodecs,MediaRecorder,AudioEncoder,VideoEncoder",
                        "--enable-blink-features=WebCodecs",
                        "--enable-accelerated-video-encode",
                        "--enable-accelerated-video-decode",
                        "--enable-accelerated-video",
                        "--enable-media-stream",
                        "--autoplay-policy=no-user-gesture-required",
                    ]
                )

                page = await browser.new_page()
                page.set_default_timeout(0)
                page.set_default_navigation_timeout(60_000)

                print("[modal-renderer] Injecting project payload and compositor configuration...")
                # Inject data into page global window scope before page scripts run
                project_json_str = json.dumps(project)
                options_json_str = json.dumps(compositor_options)
                init_script = f"""
                window.__PROJECT_DATA__ = {project_json_str};
                window.__COMPOSITOR_OPTIONS__ = {options_json_str};
                """
                await page.add_init_script(init_script)

                # Expose progress updates from browser to python stdout
                async def on_progress(v: float):
                    print(f"[modal-renderer] Compositor export progress: {v*100:.1f}%")

                await page.expose_function("__onProgress__", on_progress)

                # Route browser console logs to python console
                page.on("console", lambda msg: print(f"[browser:{msg.type}] {msg.text}") if msg.type in ["error", "warning"] else None)
                page.on("pageerror", lambda err: print(f"[browser:pageerror] {err.message}"))

                # Navigate to the local server
                url = f"http://127.0.0.1:{port}"
                print(f"[modal-renderer] Navigating to {url}...")
                await page.goto(url, wait_until="load", timeout=60_000)

                print("[modal-renderer] Waiting for compositor rendering to complete...")
                await page.wait_for_function(
                    "() => window.__RENDER_COMPLETE__ || window.__RENDER_ERROR__",
                    timeout=timeout_ms
                )

                render_error = await page.evaluate("() => window.__RENDER_ERROR__")
                if render_error:
                    raise Exception(f"Compositor rendering failed in browser: {render_error}")

                print("[modal-renderer] Extracting video blob as Base64...")
                # Extract video blob via FileReader to avoid memory limits and stack overflows
                base64_data = await page.evaluate("""async () => {
                    const blob = window.__VIDEO_BLOB__;
                    if (!blob) throw new Error("__VIDEO_BLOB__ was not populated after render complete");
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            const base64String = reader.result.split(',')[1];
                            resolve(base64String);
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                }""")

                print("[modal-renderer] Decoding video file payload...")
                video_bytes = base64.b64decode(base64_data)
                print(f"[modal-renderer] Rendering complete! Saved {len(video_bytes) / 1024 / 1024:.2f} MB video file.")

                await browser.close()

                # If R2 upload destination key is provided, perform upload and return public URL dict
                r2_key = options.get("r2_key")
                if r2_key:
                    print(f"[modal-renderer] R2 Key provided: '{r2_key}'. Starting R2 upload integration...")
                    public_url = upload_to_r2(video_bytes, r2_key)
                    print(f"[modal-renderer] Debug: Upload URL: {public_url}")
                    return {"url": public_url, "size": len(video_bytes)}

                return video_bytes

        finally:
            print("[modal-renderer] Stopping Threaded HTTP Server...")
            server.shutdown()
            server.server_close()
            print("[modal-renderer] Threaded HTTP Server stopped.")


# ---------------------------------------------------------------------------
# Local Test Harness CLI Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import asyncio
    import sys

    async def main():
        if len(sys.argv) < 2:
            print("Usage: python3 main.py <project_json_path> [output_video_path]")
            sys.exit(1)

        project_path = sys.argv[1]
        output_path = sys.argv[2] if len(sys.argv) > 2 else "output.mp4"

        print(f"Loading test project JSON from: {project_path}")
        with open(project_path, "r") as f:
            project_data = json.load(f)

        print("Executing render_video locally (using .local)...")
        # Run function locally (Modal redirects decorated execution)
        test_options = {"prioritizeSpeed": True}
        if os.getenv("R2_ACCOUNT_ID"):
            test_options["r2_key"] = "tests/local-test-render1.mp4"

        result = await render_video.local(project_data, test_options)

        if isinstance(result, dict):
            print(f"R2 Upload successful! Result URL: {result['url']}")
        else:
            print(f"Writing output file to: {output_path}")
            with open(output_path, "wb") as f:
                f.write(result)
        print("Success!")

    asyncio.run(main())
