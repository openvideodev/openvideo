"""Video downloader implementation."""

import os
import tempfile
from typing import Optional
import httpx
from pathlib import Path

from ..core.interfaces import VideoDownloader, Asset
from ..core.exceptions import DownloadError
from ..shared.logging import get_logger
from ..shared.retry import with_retry

logger = get_logger("downloader")


class HttpVideoDownloader(VideoDownloader):
    """Downloads video assets using HTTP/HTTPS."""
    
    def __init__(self, timeout: int = 300, chunk_size: int = 8192):
        self.timeout = timeout
        self.chunk_size = chunk_size
    
    @with_retry(max_attempts=3, wait_min=2.0, wait_max=30.0)
    async def download(self, asset: Asset) -> str:
        """Download asset and return local file path."""
        logger.info(f"Starting download for asset {asset.id} from {asset.src}")
        
        try:
            # Create temp file with appropriate extension
            suffix = self._get_file_extension(asset.src)
            temp_dir = tempfile.mkdtemp(prefix="openvideo_download_")
            temp_path = os.path.join(temp_dir, f"{asset.id}{suffix}")
            
            logger.debug(f"Created temp file: {temp_path}")
            
            # Download with streaming to handle large files
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                async with client.stream("GET", asset.src) as response:
                    response.raise_for_status()
                    
                    total_size = int(response.headers.get("content-length", 0))
                    downloaded = 0
                    
                    with open(temp_path, "wb") as f:
                        async for chunk in response.aiter_bytes(chunk_size=self.chunk_size):
                            f.write(chunk)
                            downloaded += len(chunk)
                            
                            # Log progress for large files
                            if total_size > 0 and downloaded % (10 * 1024 * 1024) == 0:  # Every 10MB
                                progress = (downloaded / total_size) * 100
                                logger.debug(f"Download progress: {progress:.1f}%")
            
            file_size = os.path.getsize(temp_path)
            logger.info(f"Successfully downloaded {asset.id} ({file_size} bytes)")
            
            return temp_path
            
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error downloading {asset.src}: {e.response.status_code}")
            raise DownloadError(f"HTTP error downloading {asset.src}: {e.response.status_code}")
        except httpx.RequestError as e:
            logger.error(f"Network error downloading {asset.src}: {str(e)}")
            raise DownloadError(f"Network error downloading {asset.src}: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error downloading {asset.src}: {str(e)}")
            raise DownloadError(f"Unexpected error downloading {asset.src}: {str(e)}")
    
    def _get_file_extension(self, url: str) -> str:
        """Extract file extension from URL or default to .mp4."""
        parsed = Path(url)
        if parsed.suffix:
            return parsed.suffix.lower()
        return ".mp4"  # Default for video assets
