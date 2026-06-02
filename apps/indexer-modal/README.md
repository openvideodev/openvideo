# OpenVideo Modal Indexer

A serverless video indexing service built on Modal.com that follows SOLID principles for maintainable and extensible video processing.

## Architecture

This service replaces the complex Trigger.dev + BullMQ + NestJS architecture with a single, scalable Modal function.

### Key Features

- **Serverless Processing**: Run video indexing jobs without managing infrastructure
- **GPU Acceleration**: Built-in GPU support for video processing and AI analysis
- **SOLID Design**: Clean separation of concerns with dependency injection
- **Multi-format Support**: Video, audio, and image asset indexing
- **AI-Powered**: Gemini vision analysis and Deepgram transcription
- **Vector Search**: PostgreSQL + pgvector for semantic search

## Project Structure

```
src/
├── core/              # Core interfaces and exceptions
│   ├── interfaces.py  # Abstract interfaces (SOLID principles)
│   └── exceptions.py  # Custom exceptions
├── services/          # Concrete implementations
│   ├── downloader.py      # HTTP video downloader
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

1. Clone the repository and navigate to the indexer directory:
```bash
cd apps/indexer-modal
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
index_asset = modal.Function.lookup("openvideo-indexer", "index_asset")

# Index an asset
result = index_asset.remote("asset-id-here")
print(result)
```

### Bulk Index Assets

```python
bulk_index = modal.Function.lookup("openvideo-indexer", "index_bulk_assets")

result = bulk_index.remote("space-id-here", ["asset1", "asset2", "asset3"])
print(result)
```

### Check Status

```python
get_status = modal.Function.lookup("openvideo-indexer", "get_indexing_status")

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

## SOLID Principles Implementation

### Single Responsibility Principle
Each class has one responsibility:
- `VideoDownloader`: Only downloads assets
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

The indexer runs as a serverless function on Modal.com. To deploy changes:

```bash
# Navigate to the indexer directory
cd apps/indexer-modal

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
modal function list openvideo-indexer

# Check application status
modal app list
```

### Redeploying After Code Changes

Whenever you modify the indexer code (e.g., `video_indexer.py`, services, etc.), redeploy:

```bash
cd apps/indexer-modal
python3 -m modal deploy -m src.api.main
```

Modal will automatically:
- Build a new container image if dependencies changed
- Update the deployed functions
- Route new requests to the updated version

### View Deployment Logs

Monitor function executions in the Modal dashboard:
- URL: `https://modal.com/apps/[username]/main/deployed/openvideo-indexer`
- Or via CLI: `modal app logs openvideo-indexer`

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
modal function list openvideo-indexer
```

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
