"""Core interfaces following SOLID principles."""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, AsyncGenerator
from dataclasses import dataclass
from enum import Enum


class AssetType(str, Enum):
    """Supported asset types."""
    VIDEO = "video"
    AUDIO = "audio"
    IMAGE = "image"


class IndexingStatus(str, Enum):
    """Indexing status values."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class Asset:
    """Asset data model."""
    id: str
    name: str
    type: AssetType
    src: str
    space_id: str
    user_id: str
    duration: Optional[float] = None
    size: Optional[int] = None
    dimensions: Optional[Dict[str, int]] = None


@dataclass
class TranscriptSegment:
    """Transcript segment data model."""
    text: str
    start_ms: int
    end_ms: int
    words: Optional[List[Dict[str, Any]]] = None


@dataclass
class Scene:
    """Scene detection data model."""
    start_time: float
    end_time: float
    confidence: float = 1.0


@dataclass
class VisualScene:
    """Visual analysis data model."""
    start_ms: int
    end_ms: int
    description: str
    objects: List[str]
    topics: List[str]
    keywords: List[str]


@dataclass
class IndexingProgress:
    """Progress tracking data model."""
    asset_id: str
    status: IndexingStatus
    progress: int  # 0-100
    space_id: Optional[str] = None
    stage: Optional[str] = None
    error: Optional[str] = None


class VideoDownloader(ABC):
    """Interface for downloading video assets."""
    
    @abstractmethod
    async def download(self, asset: Asset) -> str:
        """Download asset and return local file path."""
        pass


class SceneDetector(ABC):
    """Interface for scene detection in videos."""
    
    @abstractmethod
    async def detect_scenes(self, video_path: str, **kwargs) -> List[Scene]:
        """Detect scenes in video file."""
        pass


class AudioTranscriber(ABC):
    """Interface for audio transcription."""
    
    @abstractmethod
    async def transcribe(self, audio_source: str) -> List[TranscriptSegment]:
        """Transcribe audio from file or URL."""
        pass


class VisionAnalyzer(ABC):
    """Interface for AI vision analysis."""
    
    @abstractmethod
    async def analyze_image(self, image_data: bytes, context: str) -> str:
        """Analyze a single image."""
        pass
    
    @abstractmethod
    async def analyze_scene_frames(
        self, 
        frames: List[bytes], 
        context: str
    ) -> Dict[str, Any]:
        """Analyze multiple frames from a scene."""
        pass

    @abstractmethod
    async def analyze_text(self, text: str, prompt: str) -> Dict[str, Any]:
        """Analyze text content using AI (no image required).
        
        Used for generating structured metadata such as chapters, topics,
        and summaries from transcript or visual scene text.
        Returns a parsed dict from a JSON response, or empty dict on failure.
        """
        pass


class VectorStore(ABC):
    """Interface for vector storage and retrieval."""
    
    @abstractmethod
    async def upsert_documents(self, documents: List[Dict[str, Any]]) -> None:
        """Store documents with embeddings."""
        pass
    
    @abstractmethod
    async def delete_by_asset(self, asset_id: str) -> None:
        """Delete all vectors for an asset."""
        pass


class ProgressTracker(ABC):
    """Interface for progress tracking."""
    
    @abstractmethod
    async def update_progress(
        self, 
        asset_id: str, 
        progress: IndexingProgress
    ) -> None:
        """Update indexing progress."""
        pass
    
    @abstractmethod
    async def get_progress(self, asset_id: str) -> Optional[IndexingProgress]:
        """Get current progress for asset."""
        pass
    
    @abstractmethod
    async def mark_started(self, asset_id: str, space_id: str) -> None:
        """Mark indexing as started."""
        pass
    
    @abstractmethod
    async def mark_completed(self, asset_id: str, space_id: str) -> None:
        """Mark indexing as completed."""
        pass
    
    @abstractmethod
    async def mark_failed(self, asset_id: str, space_id: str, error: str) -> None:
        """Mark indexing as failed."""
        pass


class DatabaseClient(ABC):
    """Interface for database operations."""
    
    @abstractmethod
    async def get_asset(self, asset_id: str) -> Optional[Asset]:
        """Retrieve asset by ID."""
        pass
    
    @abstractmethod
    async def save_transcript(self, asset_id: str, segments: List[TranscriptSegment]) -> None:
        """Save transcript segments."""
        pass
    
    @abstractmethod
    async def save_visual_timeline(self, asset_id: str, scenes: List[VisualScene]) -> None:
        """Save visual timeline data."""
        pass
    
    @abstractmethod
    async def create_indexing_status(self, asset_id: str, space_id: str) -> None:
        """Create initial indexing status."""
        pass

    @abstractmethod
    async def get_visual_timeline(self, asset_id: str) -> List[Dict[str, Any]]:
        """Retrieve saved visual scene descriptions for an asset.
        
        Returns a list of scene dicts with keys: startMs, endMs, description,
        objects, topics, keywords. Returns empty list if none saved.
        """
        pass
