"""Storage utilities for temporary file management."""

import os
import tempfile
import shutil
from typing import Optional
from pathlib import Path


class TempStorage:
    """Manages temporary files and directories."""
    
    def __init__(self, prefix: str = "openvideo_"):
        self.prefix = prefix
        self.temp_dirs: list[str] = []
        self.temp_files: list[str] = []
    
    def create_temp_dir(self, suffix: str = "") -> str:
        """Create a temporary directory."""
        temp_dir = tempfile.mkdtemp(prefix=f"{self.prefix}{suffix}")
        self.temp_dirs.append(temp_dir)
        return temp_dir
    
    def create_temp_file(self, suffix: str = "", prefix: str = "") -> str:
        """Create a temporary file."""
        temp_file = tempfile.NamedTemporaryFile(
            prefix=f"{self.prefix}{prefix}",
            suffix=suffix,
            delete=False
        )
        temp_file.close()
        self.temp_files.append(temp_file.name)
        return temp_file.name
    
    def cleanup(self):
        """Clean up all temporary files and directories."""
        # Clean up files first
        for temp_file in self.temp_files:
            try:
                if os.path.exists(temp_file):
                    os.unlink(temp_file)
            except Exception as e:
                print(f"Failed to delete temp file {temp_file}: {e}")
        
        # Then clean up directories
        for temp_dir in self.temp_dirs:
            try:
                if os.path.exists(temp_dir):
                    shutil.rmtree(temp_dir)
            except Exception as e:
                print(f"Failed to delete temp dir {temp_dir}: {e}")
        
        self.temp_files.clear()
        self.temp_dirs.clear()
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.cleanup()


def get_file_extension(url: str) -> str:
    """Extract file extension from URL."""
    parsed = Path(url)
    if parsed.suffix:
        return parsed.suffix.lower()
    return ".mp4"  # Default for video assets


def ensure_dir_exists(path: str) -> None:
    """Ensure directory exists."""
    os.makedirs(path, exist_ok=True)
