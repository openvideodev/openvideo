"""Progress tracking implementation."""

import os
from typing import Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
from dotenv import load_dotenv

from ..core.interfaces import ProgressTracker, IndexingProgress, IndexingStatus
from ..core.exceptions import ProgressTrackingError

load_dotenv()


class DatabaseProgressTracker(ProgressTracker):
    """Progress tracker using PostgreSQL database."""
    
    def __init__(self, connection_string: Optional[str] = None):
        self.connection_string = (
            connection_string or 
            os.getenv("DATABASE_URL")
        )
        if not self.connection_string:
            raise ProgressTrackingError("DATABASE_URL not configured")
    
    async def update_progress(
        self, 
        asset_id: str, 
        progress: IndexingProgress
    ) -> None:
        """Update indexing progress in database."""
        try:
            conn = psycopg2.connect(self.connection_string)
            try:
                with conn.cursor() as cursor:
                    # Update or insert progress
                    cursor.execute(
                        """
                        INSERT INTO asset_indexing_status 
                        (id, asset_id, space_id, status, progress, stage, error, updated_at, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (asset_id) 
                        DO UPDATE SET
                            status = EXCLUDED.status,
                            progress = EXCLUDED.progress,
                            stage = EXCLUDED.stage,
                            error = EXCLUDED.error,
                            updated_at = EXCLUDED.updated_at
                        """,
                        (
                            f"status_{asset_id}",
                            asset_id,
                            progress.space_id or "unknown",  # Use actual space_id
                            progress.status.value,
                            progress.progress,
                            progress.stage,
                            progress.error,
                            datetime.utcnow(),
                            datetime.utcnow()
                        )
                    )
                    conn.commit()
                    
            finally:
                conn.close()
                
        except Exception as e:
            raise ProgressTrackingError(f"Failed to update progress for {asset_id}: {str(e)}")
    
    async def get_progress(self, asset_id: str) -> Optional[IndexingProgress]:
        """Get current progress for asset."""
        try:
            conn = psycopg2.connect(self.connection_string)
            try:
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute(
                        """
                        SELECT status, progress, stage, error
                        FROM asset_indexing_status
                        WHERE asset_id = %s
                        ORDER BY updated_at DESC
                        LIMIT 1
                        """,
                        (asset_id,)
                    )
                    
                    row = cursor.fetchone()
                    if not row:
                        return None
                    
                    return IndexingProgress(
                        asset_id=asset_id,
                        status=IndexingStatus(row["status"]),
                        progress=row["progress"],
                        stage=row["stage"],
                        error=row["error"]
                    )
                    
            finally:
                conn.close()
                
        except Exception as e:
            raise ProgressTrackingError(f"Failed to get progress for {asset_id}: {str(e)}")
    
    async def mark_started(self, asset_id: str, space_id: str) -> None:
        """Mark indexing as started."""
        progress = IndexingProgress(
            asset_id=asset_id,
            status=IndexingStatus.PROCESSING,
            progress=0,
            space_id=space_id,
            stage="starting"
        )
        await self.update_progress(asset_id, progress)
    
    async def mark_completed(self, asset_id: str, space_id: str) -> None:
        """Mark indexing as completed."""
        progress = IndexingProgress(
            asset_id=asset_id,
            status=IndexingStatus.COMPLETED,
            progress=100,
            space_id=space_id,
            stage="completed"
        )
        await self.update_progress(asset_id, progress)
    
    async def mark_failed(self, asset_id: str, space_id: str, error: str) -> None:
        """Mark indexing as failed."""
        progress = IndexingProgress(
            asset_id=asset_id,
            status=IndexingStatus.FAILED,
            progress=0,
            space_id=space_id,
            stage="failed",
            error=error
        )
        await self.update_progress(asset_id, progress)
