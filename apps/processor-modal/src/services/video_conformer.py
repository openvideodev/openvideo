"""Video conformer for browser-optimized playback."""

import os
import subprocess
import json
import tempfile
from typing import Dict, Any, Optional, Tuple
from pathlib import Path

from ..core.interfaces import VideoDownloader, Asset
from ..core.exceptions import VideoIndexingError
from ..shared.logging import get_logger
from ..shared.retry import with_retry

logger = get_logger("video_conformer")


class VideoConformer:
    """Conforms videos to browser-optimized format for smooth playback."""
    
    def __init__(
        self,
        downloader: VideoDownloader,
        max_fps: int = 60,
        target_codec: str = "libx264",
        target_preset: str = "fast",
        target_crf: int = 23,
    ):
        self.downloader = downloader
        self.max_fps = max_fps
        self.target_codec = target_codec
        self.target_preset = target_preset
        self.target_crf = target_crf
    
    async def conform(self, asset: Asset) -> Dict[str, Any]:
        """Conform video to browser-optimized format.
        
        Returns:
            Dict with output_path, was_conformed, original_fps, new_fps
        """
        logger.info(f"Starting conform for asset {asset.id}")
        
        # Download video
        local_path = await self.downloader.download(asset)
        
        try:
            # Analyze video
            video_info = await self._analyze_video(local_path)
            original_fps = video_info.get("fps", 0)
            
            logger.info(f"Asset {asset.id}: {original_fps}fps, {video_info.get('width')}x{video_info.get('height')}")
            
            # Check if conforming is needed
            needs_conform = (
                original_fps > self.max_fps or
                video_info.get("codec") not in ["h264", "avc1"] or
                video_info.get("pixel_format") != "yuv420p" or
                video_info.get("profile") not in ["High", "Main", "Baseline", "Constrained Baseline"]
            )
            
            if not needs_conform:
                logger.info(f"Asset {asset.id} already optimized, skipping")
                return {
                    "was_conformed": False,
                    "original_fps": original_fps,
                    "new_fps": original_fps,
                    "local_path": local_path,
                    "video_info": video_info,
                }
            
            # Calculate target FPS
            target_fps = min(original_fps, self.max_fps)
            
            # Conform video
            output_path = await self._conform_video(local_path, target_fps, video_info)
            
            logger.info(f"Asset {asset.id} conformed: {original_fps}fps -> {target_fps}fps")
            
            return {
                "was_conformed": True,
                "original_fps": original_fps,
                "new_fps": target_fps,
                "local_path": output_path,
                "original_local_path": local_path,
                "video_info": video_info,
            }
            
        except Exception as e:
            # Clean up on error
            if os.path.exists(local_path):
                os.unlink(local_path)
            raise VideoIndexingError(f"Failed to conform video: {str(e)}")
    
    async def _analyze_video(self, video_path: str) -> Dict[str, Any]:
        """Analyze video using ffprobe."""
        try:
            cmd = [
                "ffprobe",
                "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "stream=codec_name,width,height,pix_fmt,r_frame_rate,profile,level",
                "-show_entries", "format=duration",
                "-of", "json",
                video_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode != 0:
                raise VideoIndexingError(f"ffprobe failed: {result.stderr}")
            
            data = json.loads(result.stdout)
            stream = data.get("streams", [{}])[0]
            format_info = data.get("format", {})
            
            # Parse frame rate (e.g., "30000/1001" -> 29.97)
            fps_str = stream.get("r_frame_rate", "0/1")
            if "/" in fps_str:
                num, den = map(int, fps_str.split("/"))
                fps = num / den if den != 0 else 0
            else:
                fps = float(fps_str)
            
            return {
                "codec": stream.get("codec_name", ""),
                "width": stream.get("width", 0),
                "height": stream.get("height", 0),
                "pixel_format": stream.get("pix_fmt", ""),
                "fps": round(fps, 2),
                "profile": stream.get("profile", ""),
                "level": stream.get("level", 0),
                "duration": float(format_info.get("duration", 0)),
            }
            
        except subprocess.TimeoutExpired:
            raise VideoIndexingError("ffprobe timeout analyzing video")
        except json.JSONDecodeError:
            raise VideoIndexingError("Failed to parse ffprobe output")
        except Exception as e:
            raise VideoIndexingError(f"Video analysis failed: {str(e)}")
    
    async def _conform_video(
        self, 
        input_path: str, 
        target_fps: int,
        video_info: Dict[str, Any]
    ) -> str:
        """Conform video to browser-optimized format.
        
        Best format for browser playback:
        - Container: MP4
        - Video: H.264 (AVC) with yuv420p pixel format
        - Audio: AAC
        - Profile: High or Main (Level 4.1 for broad compatibility)
        - Frame rate: 60fps max (matches most displays)
        - Pixel format: yuv420p (required for hardware acceleration)
        """
        temp_dir = tempfile.mkdtemp(prefix="openvideo_conform_")
        output_path = os.path.join(temp_dir, "conformed.mp4")
        
        # Build FFmpeg command for browser-optimized output
        cmd = [
            "ffmpeg",
            "-y",  # Overwrite output
            "-i", input_path,
            # Video codec settings
            "-c:v", self.target_codec,
            "-preset", self.target_preset,
            "-crf", str(self.target_crf),
            "-profile:v", "high",
            "-level", "4.1",
            "-pix_fmt", "yuv420p",  # Required for hardware acceleration
            "-r", str(target_fps),  # Target frame rate
            # Audio settings
            "-c:a", "aac",
            "-b:a", "128k",
            "-ar", "48000",  # Standard sample rate
            # Fast start for streaming
            "-movflags", "+faststart",
            # Output
            output_path
        ]
        
        logger.debug(f"FFmpeg command: {' '.join(cmd)}")
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=600  # 10 minutes max
            )
            
            if result.returncode != 0:
                logger.error(f"FFmpeg error: {result.stderr}")
                raise VideoIndexingError(f"Video conforming failed: {result.stderr[:500]}")
            
            # Verify output
            if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
                raise VideoIndexingError("Conformed video file is empty")
            
            # Clean up original
            os.unlink(input_path)
            
            return output_path
            
        except subprocess.TimeoutExpired:
            raise VideoIndexingError("Video conforming timeout (10 minutes)")
        except Exception as e:
            # Clean up on error
            if os.path.exists(output_path):
                os.unlink(output_path)
            raise VideoIndexingError(f"Video conforming failed: {str(e)}")


def should_conform(asset: Asset, video_info: Dict[str, Any], max_fps: int = 60) -> bool:
    """Check if asset needs conforming.
    
    Returns True if:
    - Frame rate > max_fps
    - Codec is not H.264
    - Pixel format is not yuv420p
    - Profile is not browser-compatible
    """
    fps = video_info.get("fps", 0)
    codec = video_info.get("codec", "").lower()
    pixel_format = video_info.get("pixel_format", "")
    profile = video_info.get("profile", "")
    
    if fps > max_fps:
        return True
    
    if codec not in ["h264", "avc1"]:
        return True
    
    if pixel_format != "yuv420p":
        return True
    
    if profile not in ["High", "Main", "Baseline", "Constrained Baseline"]:
        return True
    
    return False
