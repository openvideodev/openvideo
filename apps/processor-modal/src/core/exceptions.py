"""Custom exceptions for the video indexing service."""


class VideoIndexingError(Exception):
    """Base exception for video indexing errors."""
    pass


class AssetNotFoundError(VideoIndexingError):
    """Raised when an asset cannot be found."""
    pass


class DownloadError(VideoIndexingError):
    """Raised when asset download fails."""
    pass


class SceneDetectionError(VideoIndexingError):
    """Raised when scene detection fails."""
    pass


class TranscriptionError(VideoIndexingError):
    """Raised when audio transcription fails."""
    pass


class VisionAnalysisError(VideoIndexingError):
    """Raised when AI vision analysis fails."""
    pass


class VectorStoreError(VideoIndexingError):
    """Raised when vector operations fail."""
    pass


class DatabaseError(VideoIndexingError):
    """Raised when database operations fail."""
    pass


class ProgressTrackingError(VideoIndexingError):
    """Raised when progress tracking fails."""
    pass
