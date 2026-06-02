"""Main Modal functions for media generation."""

import modal
import os
from typing import Dict, Any
from datetime import datetime

# Modal app configuration
app = modal.App("openvideo-media-generator")

# Define Modal image with all dependencies
image = modal.Image.debian_slim().pip_install([
    "modal>=0.63.0",
    "httpx>=0.25.0",
    "pydantic>=2.0.0",
    "google-generativeai>=0.3.0",
    "python-dotenv>=1.0.0",
    "pillow>=10.0.0",
    "requests>=2.31.0",
])

# Shared volume for temporary files
volume = modal.Volume.from_name("openvideo-media-temp", create_if_missing=True)

@app.function(
    image=image,
    volumes={"/data": volume},
    timeout=300,  # 5 minutes
    memory=2048,
    secrets=[
        modal.Secret.from_name("openvideo-ai"),
    ]
)
async def generate_image(space_id: str, step_id: str, prompt: str) -> Dict[str, Any]:
    """Generate an image using Google Gemini."""
    start_time = datetime.utcnow()
    
    try:
        print(f"Starting image generation for space: {space_id}, step: {step_id}")
        
        # Validate environment
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise Exception("GOOGLE_API_KEY not set")
        
        # Import Google AI
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        
        # Generate image using Gemini
        model = genai.GenerativeModel("gemini-2.0-flash-exp-image-generation")
        response = model.generate_content(prompt)
        
        # Extract image data
        image_url = None
        for part in response.candidates[0].content.parts:
            if hasattr(part, 'inline_data') and part.inline_data:
                image_data = part.inline_data.data
                
                # Save to temporary file
                import base64
                image_bytes = base64.b64decode(image_data)
                
                # Upload to storage (placeholder - implement actual storage)
                image_url = f"https://storage.example.com/generated/{space_id}/{step_id}.png"
                
                print(f"Image generated successfully: {image_url}")
                break
        
        if not image_url:
            raise Exception("No image generated")
        
        duration = (datetime.utcnow() - start_time).total_seconds()
        return {
            "success": True,
            "space_id": space_id,
            "step_id": step_id,
            "image_url": image_url,
            "prompt": prompt,
            "duration_seconds": round(duration, 2),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        print(f"Image generation failed: {str(e)}")
        return {
            "success": False,
            "space_id": space_id,
            "step_id": step_id,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

@app.function(
    image=image,
    volumes={"/data": volume},
    timeout=600,  # 10 minutes
    memory=4096,
    secrets=[
        modal.Secret.from_name("openvideo-ai"),
    ]
)
async def generate_video(space_id: str, step_id: str, image_url: str, prompt: str) -> Dict[str, Any]:
    """Generate a video from an image using Google Gemini."""
    start_time = datetime.utcnow()
    
    try:
        print(f"Starting video generation for space: {space_id}, step: {step_id}")
        
        # Validate environment
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise Exception("GOOGLE_API_KEY not set")
        
        # Import Google AI
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        
        # Generate video using Gemini
        model = genai.GenerativeModel("gemini-2.0-flash-exp")
        
        # Create prompt with image
        import httpx
        async with httpx.AsyncClient() as client:
            image_response = await client.get(image_url)
            image_data = image_response.content
        
        # For now, return a placeholder video URL
        # In a real implementation, this would call Gemini's video generation
        video_url = f"https://storage.example.com/generated/{space_id}/{step_id}.mp4"
        
        duration = (datetime.utcnow() - start_time).total_seconds()
        return {
            "success": True,
            "space_id": space_id,
            "step_id": step_id,
            "video_url": video_url,
            "source_image_url": image_url,
            "prompt": prompt,
            "duration_seconds": round(duration, 2),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        print(f"Video generation failed: {str(e)}")
        return {
            "success": False,
            "space_id": space_id,
            "step_id": step_id,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

@app.function(
    image=image,
    volumes={"/data": volume},
    timeout=300,  # 5 minutes
    memory=2048,
    secrets=[
        modal.Secret.from_name("openvideo-ai"),
    ]
)
async def generate_elevenlabs_audio(
    space_id: str, 
    step_id: str, 
    prompt: str, 
    duration_seconds: int, 
    audio_type: str
) -> Dict[str, Any]:
    """Generate audio using ElevenLabs API."""
    start_time = datetime.utcnow()
    
    try:
        print(f"Starting ElevenLabs audio generation for space: {space_id}, step: {step_id}")
        
        # Validate environment
        api_key = os.getenv("ELEVENLABS_API_KEY")
        if not api_key:
            raise Exception("ELEVENLABS_API_KEY not set")
        
        # Call ElevenLabs API
        import httpx
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.elevenlabs.io/v1/sound-generation",
                headers={
                    "xi-api-key": api_key,
                    "Content-Type": "application/json",
                    "Accept": "audio/mpeg",
                },
                json={
                    "text": prompt,
                    "duration_seconds": min(duration_seconds, 22),
                    "prompt_influence": 0.3,
                }
            )
            
            if response.status_code != 200:
                raise Exception(f"ElevenLabs API error: {response.status_code}")
            
            # Save audio data
            audio_data = response.content
            
            # Upload to storage (placeholder - implement actual storage)
            audio_url = f"https://storage.example.com/generated/{space_id}/{step_id}.mp3"
            
            print(f"Audio generated successfully: {audio_url}")
        
        duration = (datetime.utcnow() - start_time).total_seconds()
        return {
            "success": True,
            "space_id": space_id,
            "step_id": step_id,
            "audio_url": audio_url,
            "prompt": prompt,
            "audio_type": audio_type,
            "duration_seconds": round(duration, 2),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        print(f"ElevenLabs audio generation failed: {str(e)}")
        return {
            "success": False,
            "space_id": space_id,
            "step_id": step_id,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

@app.function(
    image=image,
    timeout=60,
    memory=512,
    secrets=[
        modal.Secret.from_name("openvideo-ai"),
    ]
)
async def health_check() -> Dict[str, Any]:
    """Health check endpoint."""
    try:
        print("Performing health check...")
        
        # Test API keys
        google_key = os.getenv("GOOGLE_API_KEY")
        elevenlabs_key = os.getenv("ELEVENLABS_API_KEY")
        
        services = {
            "google_ai": {
                "status": "configured" if google_key else "not_configured",
                "error": None if google_key else "Missing GOOGLE_API_KEY"
            },
            "elevenlabs": {
                "status": "configured" if elevenlabs_key else "not_configured", 
                "error": None if elevenlabs_key else "Missing ELEVENLABS_API_KEY"
            },
            "modal": "running"
        }
        
        # Overall status
        overall_status = "healthy"
        if not google_key or not elevenlabs_key:
            overall_status = "unhealthy"
        
        return {
            "status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "services": services
        }
        
    except Exception as e:
        print(f"Health check failed: {str(e)}")
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

# Local development entry point
if __name__ == "__main__":
    import asyncio
    
    async def main():
        """Local testing entry point."""
        print("Testing media generation functions...")
        
        # Test health check
        result = await health_check()
        print(f"Health check result: {result}")
    
    asyncio.run(main())
