# OpenVideo Modal Processor

A serverless video processing service built on Modal.com that handles indexing, transcoding, conforming, and AI-powered video operations. Follows SOLID principles for maintainable and extensible architecture.

## Architecture

This service provides GPU-accelerated video processing operations including indexing, format conforming, transcoding, and AI analysis - replacing complex self-managed infrastructure with serverless Modal functions.

### Key Features

- **Serverless Video Processing**: GPU-accelerated operations without infrastructure management
- **Format Conforming**: Auto-convert high-fps/hevc videos to browser-optimized H.264/60fps
- **AI-Powered Indexing**: Gemini vision analysis and Deepgram transcription with vector search
- **SOLID Architecture**: Clean separation of concerns with dependency injection
- **Extensible**: Easy to add new video operations (reframing, denoising, etc.)

## Project Structure

```
src/
├── core/              # Core interfaces and exceptions
│   ├── interfaces.py  # Abstract interfaces (SOLID principles)
│   └── exceptions.py  # Custom exceptions
├── services/          # Concrete implementations
│   ├── downloader.py      # HTTP video downloader
│   ├── uploader.py        # R2/Cloudflare storage uploader
│   ├── video_conformer.py # Browser-optimized video conformer
│   ├── video_reframer.py  # Video reframing/cropping (TODO)
│   ├── video_denoiser.py  # AI noise reduction (TODO)
│   ├── scene_detector.py  # FFmpeg scene detection
│   ├── transcriber.py     # Deepgram audio transcription
│   ├── vision_analyzer.py # Gemini AI vision analysis
│   ├── vector_store.py    # PostgreSQL vector storage
│   ├── progress_tracker.py # Database progress tracking
│   └── database.py        # Database client
├── indexer/           # Main orchestrator
│   └── video_indexer.py   # VideoIndexer class
├── api/               # Modal function entry points
│   └── main.py            # Modal functions
└── shared/            # Shared utilities
    └── storage.py         # Temporary file management
```

## Setup

### Prerequisites

1. Modal.com account and CLI installed
2. PostgreSQL database with pgvector extension
3. API keys for Google AI and Deepgram

### Installation

1. Clone the repository and navigate to the processor directory:

```bash
cd apps/processor-modal
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Configure environment variables:

```bash
cp .env.example .env
# Edit .env with your API keys and database URL
```

4. Set up Modal secrets:

```bash
modal secret create openvideo-db DATABASE_URL=your_database_url
modal secret create openvideo-ai GOOGLE_API_KEY=your_google_api_key
modal secret create openvideo-deepgram DEEPGRAM_API_KEY=your_deepgram_api_key
modal secret create openvideo-r2 \
  R2_ACCOUNT_ID=your_account_id \
  R2_ACCESS_KEY_ID=your_access_key \
  R2_SECRET_ACCESS_KEY=your_secret_key \
  R2_BUCKET_NAME=openvideo
```

## Usage

### Deploy to Modal

```bash
modal deploy src/api/main.py
```

### Index a Single Asset

```python
import modal

# Get the deployed function
index_asset = modal.Function.lookup("openvideo-processor", "index_asset")

# Index an asset
result = index_asset.remote("asset-id-here")
print(result)
```

### Bulk Index Assets

```python
bulk_index = modal.Function.lookup("openvideo-processor", "index_bulk_assets")

result = bulk_index.remote("space-id-here", ["asset1", "asset2", "asset3"])
print(result)
```

### Check Status

```python
get_status = modal.Function.lookup("openvideo-processor", "get_indexing_status")

status = get_status.remote("asset-id-here")
print(status)
```

## API Endpoints

### `index_asset(asset_id: str)`

Indexes a single asset and returns:

```json
{
  "success": true,
  "asset_id": "asset-id",
  "message": "Indexing completed successfully",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### `index_bulk_assets(space_id: str, asset_ids: list[str])`

Indexes multiple assets in parallel and returns:

```json
{
  "space_id": "space-id",
  "total_assets": 3,
  "successful": 2,
  "failed": 1,
  "results": [...],
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### `get_indexing_status(asset_id: str)`

Returns current indexing status:

```json
{
  "asset_id": "asset-id",
  "status": "processing",
  "progress": 75,
  "stage": "analyzing_scenes",
  "error": null
}
```

### `health_check()`

Returns service health status:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "services": {
    "database": "connected",
    "ai": "configured",
    "modal": "running"
  }
}
```

### `conform_asset(asset_id: str, max_fps: int = 60)`

Conforms video to browser-optimized format for smooth playback. Automatically:
- Detects if frame rate > 60fps and conforms down
- Re-encodes to H.264 with yuv420p (hardware-accelerated playback)
- Uploads to R2 and updates asset src URL

**Conform triggers when:**
- Frame rate > 60fps
- Codec is not H.264 (e.g., HEVC, VP9)
- Pixel format is not yuv420p
- Profile is not browser-compatible

**Returns:**

```json
{
  "success": true,
  "asset_id": "asset-id",
  "was_conformed": true,
  "original_fps": 1000,
  "new_fps": 60,
  "new_src": "https://.../assets/asset-id/conformed.mp4",
  "video_info": {
    "codec": "h264",
    "width": 480,
    "height": 480,
    "fps": 60,
    "profile": "High"
  },
  "duration_seconds": 15.3,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

**Usage:**

```python
import modal

conform = modal.Function.lookup("openvideo-processor", "conform_asset")
result = conform.remote("asset-id-here", max_fps=60)
print(result)
```

## Best Format for Browser Playback

For **extremely performant** video playback in the OpenVideo studio, use this format:

| Property | Recommended Value | Why |
|----------|-------------------|-----|
| **Container** | MP4 (MPEG-4) | Universal browser support |
| **Video Codec** | H.264 (AVC) | Hardware accelerated in all browsers |
| **Pixel Format** | yuv420p | Required for hardware acceleration |
| **Profile** | High or Main | Broad compatibility |
| **Level** | 4.1 or lower | Max for most devices |
| **Frame Rate** | 60fps max | Matches display refresh rate |
| **Audio Codec** | AAC | Universal support |
| **Audio Sample Rate** | 48kHz | Standard for video |

**Conform command (FFmpeg):**
```bash
ffmpeg -i input.mp4 -c:v libx264 -preset fast -crf 23 -profile:v high \
  -level 4.1 -pix_fmt yuv420p -r 60 -c:a aac -b:a 128k -ar 48000 \
  -movflags +faststart output.mp4
```

**Why 60fps max?**
- Most displays are 60Hz — higher frame rates are wasted
- 1000fps videos cause HTMLVideoElement to thrash
- Browser video decoders optimized for 24-60fps
- Reduces file size significantly

## Configuration

### Modal Function Settings

- **Timeout**: 30 minutes for indexing, 5 minutes for bulk operations
- **Memory**: 8GB RAM for video processing, 2GB for bulk operations
- **GPU**: T4 GPU for video processing and AI analysis
- **Volume**: Shared volume for temporary files

### Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `GOOGLE_API_KEY`: Google AI API key for Gemini
- `DEEPGRAM_API_KEY`: Deepgram API key for transcription
- `R2_ACCOUNT_ID`: Cloudflare account ID for R2 storage
- `R2_ACCESS_KEY_ID`: R2 access key
- `R2_SECRET_ACCESS_KEY`: R2 secret key
- `R2_BUCKET_NAME`: R2 bucket name (default: openvideo)

## SOLID Principles Implementation

### Single Responsibility Principle

Each class has one responsibility:

- `VideoDownloader`: Only downloads assets
- `VideoConformer`: Only conforms videos to browser-optimized format
- `R2Uploader`: Only uploads to R2 storage
- `SceneDetector`: Only detects scenes
- `AudioTranscriber`: Only transcribes audio
- etc.

### Open/Closed Principle

Interfaces are closed for modification but open for extension:

- New transcription providers can implement `AudioTranscriber`
- New vision analyzers can implement `VisionAnalyzer`

### Dependency Inversion Principle

High-level modules depend on abstractions:

- `VideoIndexer` depends on interfaces, not concrete classes
- Dependencies are injected via constructor

## Deployment

### Deploying to Modal.com

The processor runs as serverless functions on Modal.com. To deploy changes:

```bash
# Navigate to the processor directory
cd apps/processor-modal

# Install Modal CLI (if not already installed)
pip install modal

# Deploy the application
python3 -m modal deploy -m src.api.main
```

**Important:** Use module mode (`-m src.api.main`) not script mode, because the codebase uses Python package imports.

### Verifying Deployment

After deployment, verify the functions are live:

```bash
# List deployed functions
modal function list openvideo-processor

# Check application status
modal app list
```

### Redeploying After Code Changes

Whenever you modify the processor code (e.g., `video_indexer.py`, `video_conformer.py`, services, etc.), redeploy:

```bash
cd apps/processor-modal
python3 -m modal deploy -m src.api.main
```

Modal will automatically:

- Build a new container image if dependencies changed
- Update the deployed functions
- Route new requests to the updated version

### View Deployment Logs

Monitor function executions in the Modal dashboard:

- URL: `https://modal.com/apps/[username]/main/deployed/openvideo-processor`
- Or via CLI: `modal app logs openvideo-processor`

## Development

### Local Testing

```bash
# Install Modal CLI
pip install modal

# Run locally (requires environment variables set)
python -m src.api.main
```

### Adding New Providers

1. Implement the appropriate interface from `core/interfaces.py`
2. Update `VideoIndexer` constructor to accept the new implementation
3. Add configuration options as needed

### Monitoring

Monitor function executions in the Modal dashboard or via CLI:

```bash
modal app list
modal function list openvideo-processor
```

## Adding New Video Processing Operations

The processor is designed for easy extensibility. Follow this pattern to add new operations like reframing, noise reduction, stabilization, etc.

### Step 1: Create a Service

Create a new service in `src/services/` following the SOLID pattern:

```python
# src/services/video_reframer.py
"""Video reframing service for smart cropping."""

from typing import Dict, Any
from ..core.interfaces import VideoDownloader, Asset
from ..shared.logging import get_logger

logger = get_logger("video_reframer")


class VideoReframer:
    """Reframes video to different aspect ratios using AI or fixed crops."""
    
    def __init__(self, downloader: VideoDownloader):
        self.downloader = downloader
    
    async def reframe(
        self, 
        asset: Asset, 
        target_aspect: str = "16:9",
        method: str = "center"  # or "ai_smart"
    ) -> Dict[str, Any]:
        """Reframe video to target aspect ratio."""
        # 1. Download source video
        # 2. Run FFmpeg cropdetect or AI analysis
        # 3. Apply crop/reframe
        # 4. Return output path
        pass
```

### Step 2: Add Modal Function

Add a new function to `src/api/main.py`:

```python
@app.function(
    image=image,
    volumes={"/data": volume},
    timeout=600,
    memory=4096,
    secrets=[modal.Secret.from_name("openvideo-db")]
)
async def reframe_asset(
    asset_id: str, 
    target_aspect: str = "16:9",
    method: str = "center"
) -> Dict[str, Any]:
    """Reframe video to target aspect ratio."""
    from ..services.downloader import HttpVideoDownloader
    from ..services.video_reframer import VideoReframer
    from ..services.uploader import R2Uploader
    from ..services.database import PostgreSQLClient
    
    # Implementation follows same pattern as conform_asset
    db = PostgreSQLClient()
    asset = await db.get_asset(asset_id)
    
    downloader = HttpVideoDownloader()
    reframer = VideoReframer(downloader)
    
    result = await reframer.reframe(asset, target_aspect, method)
    # ... upload to R2, update DB, return result
```

### Step 3: Deploy and Use

```bash
cd apps/processor-modal
python3 -m modal deploy -m src.api.main
```

```python
import modal
reframe = modal.Function.lookup("openvideo-processor", "reframe_asset")
result = reframe.remote("asset-id", target_aspect="9:16", method="ai_smart")
```

### Planned Operations

| Operation | Service File | Status |
|-----------|--------------|--------|
| **Format Conforming** | `video_conformer.py` | ✅ Implemented |
| **Indexing** | `video_indexer.py` | ✅ Implemented |
| **Reframing** | `video_reframer.py` | 📋 Planned |
| **Noise Reduction** | `video_denoiser.py` | 📋 Planned |
| **Stabilization** | `video_stabilizer.py` | 📋 Planned |
| **Upscale** | `video_upscaler.py` | 📋 Planned |
| **Thumbnail Gen** | `thumbnail_generator.py` | 📋 Planned |
| **Proxy Generation** | `proxy_generator.py` | 📋 Planned |

## Migration from Trigger.dev

This service is designed to replace the existing Trigger.dev-based indexing:

1. **Deploy** this Modal service
2. **Update** the tRPC router to call Modal functions instead of Trigger.dev
3. **Test** with a few assets
4. **Migrate** all indexing jobs
5. **Decommission** Trigger.dev workers and queues

## Benefits

- **Simplified Architecture**: Single service vs. 4+ services
- **Cost Effective**: Pay only when processing videos
- **Better Scalability**: Handle 100+ concurrent jobs
- **Faster Processing**: GPU acceleration and optimized pipelines
- **Easier Maintenance**: Python codebase with clear separation of concerns
