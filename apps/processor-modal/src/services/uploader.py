"""R2/Cloudflare storage uploader implementation."""

import os
from typing import Optional
import httpx
from pathlib import Path

from ..shared.logging import get_logger
from ..shared.retry import with_retry

logger = get_logger("uploader")


class R2Uploader:
    """Uploads files to Cloudflare R2 storage.
    
    Expects environment variables:
    - R2_ACCOUNT_ID: Cloudflare account ID
    - R2_ACCESS_KEY_ID: R2 access key
    - R2_SECRET_ACCESS_KEY: R2 secret key
    - R2_BUCKET_NAME: Bucket name (default: openvideo)
    """
    
    def __init__(
        self,
        account_id: Optional[str] = None,
        access_key_id: Optional[str] = None,
        secret_access_key: Optional[str] = None,
        bucket_name: Optional[str] = None,
    ):
        self.account_id = account_id or os.getenv("R2_ACCOUNT_ID")
        self.access_key_id = access_key_id or os.getenv("R2_ACCESS_KEY_ID")
        self.secret_access_key = secret_access_key or os.getenv("R2_SECRET_ACCESS_KEY")
        self.bucket_name = bucket_name or os.getenv("R2_BUCKET_NAME", "openvideo")
        
        if not all([self.account_id, self.access_key_id, self.secret_access_key]):
            raise ValueError("R2 credentials not configured")
        
        # R2 S3-compatible endpoint
        self.endpoint = f"https://{self.account_id}.r2.cloudflarestorage.com"
    
    @with_retry(max_attempts=3, wait_min=1.0, wait_max=10.0)
    async def upload_file(
        self, 
        local_path: str, 
        key: str,
        content_type: Optional[str] = None
    ) -> str:
        """Upload file to R2 and return public URL.
        
        Args:
            local_path: Path to local file
            key: Object key in R2 (e.g., "assets/conformed/video.mp4")
            content_type: MIME type (auto-detected if not provided)
            
        Returns:
            Public URL of uploaded file
        """
        logger.info(f"Uploading {local_path} to R2 as {key}")
        
        # Auto-detect content type
        if not content_type:
            content_type = self._detect_content_type(key)
        
        # Read file
        file_size = os.path.getsize(local_path)
        with open(local_path, "rb") as f:
            file_data = f.read()
        
        # Build S3-compatible request
        url = f"{self.endpoint}/{self.bucket_name}/{key}"
        
        # Use boto3 if available, otherwise use raw HTTP with SigV4
        try:
            import boto3
            from botocore.config import Config
            
            s3 = boto3.client(
                "s3",
                endpoint_url=self.endpoint,
                aws_access_key_id=self.access_key_id,
                aws_secret_access_key=self.secret_access_key,
                config=Config(signature_version="s3v4")
            )
            
            s3.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=file_data,
                ContentType=content_type,
            )

            # Use public domain if configured, otherwise generate presigned URL
            public_domain = os.getenv("R2_PUBLIC_DOMAIN")
            if public_domain:
                public_url = f"{public_domain}/{key}"
                logger.info(f"Uploaded {file_size} bytes to R2, public URL: {public_url}")
                return public_url
            else:
                # Generate presigned URL for public access (valid for 7 days)
                presigned_url = s3.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': self.bucket_name, 'Key': key},
                    ExpiresIn=604800
                )
                logger.info(f"Uploaded {file_size} bytes to R2, presigned URL: {presigned_url[:80]}...")
                return presigned_url
            
        except ImportError:
            # Fallback: use httpx with presigned URL or direct upload
            logger.warning("boto3 not available, using direct HTTP upload")
            return await self._upload_with_httpx(url, file_data, content_type, file_size)
    
    async def _upload_with_httpx(
        self, 
        url: str, 
        file_data: bytes, 
        content_type: str,
        file_size: int
    ) -> str:
        """Upload using raw HTTP (requires pre-signed URLs or public bucket)."""
        async with httpx.AsyncClient(timeout=300) as client:
            response = await client.put(
                url,
                content=file_data,
                headers={
                    "Content-Type": content_type,
                    "Content-Length": str(file_size),
                }
            )
            response.raise_for_status()
            
        logger.info(f"Uploaded {file_size} bytes to {url}")
        return url
    
    def _detect_content_type(self, key: str) -> str:
        """Detect MIME type from file extension."""
        ext = Path(key).suffix.lower()
        mime_types = {
            ".mp4": "video/mp4",
            ".mov": "video/quicktime",
            ".webm": "video/webm",
            ".mkv": "video/x-matroska",
            ".avi": "video/x-msvideo",
            ".mp3": "audio/mpeg",
            ".aac": "audio/aac",
            ".wav": "audio/wav",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
        }
        return mime_types.get(ext, "application/octet-stream")
    
    def generate_key(self, asset_id: str, suffix: str = "conformed") -> str:
        """Generate R2 key for conformed asset."""
        return f"assets/{asset_id}/{suffix}.mp4"
