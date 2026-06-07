"""Main Modal functions for video processing - indexing, conforming, transcoding, and AI operations."""

import asyncio
import modal
import os
from typing import Dict, Any
from datetime import datetime

from ..indexer.video_indexer import VideoIndexer
from ..core.exceptions import VideoIndexingError

# Modal app configuration
app = modal.App("openvideo-processor")

# Define Modal image with dependencies from app package.json
# Rebuild: 2026-06-01 - Fix PGVector connection_string parameter
image = modal.Image.debian_slim().pip_install([
    # Core Modal and HTTP
    "modal>=0.63.0",
    "httpx>=0.25.0",
    "pydantic>=2.0.0",
    # AI/ML dependencies matching app
    "google-generativeai>=0.3.0",
    "langchain>=0.1.0",
    "langchain-google-genai>=0.0.5",
    "langchain-postgres>=0.0.9",
    "langchain-core>=0.3.45",
    "langchain-community>=0.3.59",
    # Database and storage
    "psycopg2-binary>=2.9.0",
    "sqlalchemy>=2.0.0",
    "pgvector>=0.2.0",
    # Media processing
    "numpy>=1.24.0",
    "opencv-python>=4.8.0",
    "pillow>=10.0.0",
    "ffmpeg-python>=0.2.0",
    # Utilities
    "python-dotenv>=1.0.0",
    "tenacity>=8.2.0",
    "nanoid==2.0.0",
    "boto3>=1.28.0"
]).run_commands([
    "apt-get update && apt-get install -y ffmpeg",
    "ffmpeg -version"  # Verify installation
])

# Shared volume for temporary files
volume = modal.Volume.from_name("openvideo-temp", create_if_missing=True)

@app.function(
    image=image,
    volumes={"/data": volume},
    timeout=1800,  # 30 minutes
    memory=8192,   # 8GB RAM (CPU only since we use external APIs)
    secrets=[
        modal.Secret.from_name("openvideo-db"),
        modal.Secret.from_name("openvideo-ai"),
        modal.Secret.from_name("openvideo-deepgram")
    ]
)
async def index_asset(asset_id: str) -> Dict[str, Any]:
    """Index a single asset."""
    start_time = datetime.utcnow()
    
    try:
        print(f"Starting indexing for asset: {asset_id}")
        
        # Validate environment - Modal secrets should be available
        required_envs = ["DATABASE_URL", "GOOGLE_API_KEY", "DEEPGRAM_API_KEY"]
        missing_envs = []
        
        for env in required_envs:
            value = os.getenv(env)
            if not value:
                missing_envs.append(env)
            else:
                print(f"✅ {env} is set: {value[:20]}..." if len(value) > 20 else f"✅ {env} is set")
        
        if missing_envs:
            raise Exception(f"Missing environment variables: {', '.join(missing_envs)}")
        
        # Initialize indexer and perform indexing
        indexer = VideoIndexer()
        await indexer.index_asset(asset_id)
        
        duration = (datetime.utcnow() - start_time).total_seconds()
        result = {
            "success": True,
            "asset_id": asset_id,
            "message": "Indexing completed successfully",
            "duration_seconds": round(duration, 2),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        print(f"Indexing completed for asset: {asset_id} in {duration:.2f}s")
        return result
        
    except VideoIndexingError as e:
        print(f"Indexing failed for asset {asset_id}: {str(e)}")
        return {
            "success": False,
            "asset_id": asset_id,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        print(f"Unexpected error for asset {asset_id}: {str(e)}")
        return {
            "success": False,
            "asset_id": asset_id,
            "error": f"Unexpected error: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }


@app.function(
    image=image,
    timeout=60,
    memory=512,
    secrets=[
        modal.Secret.from_name("openvideo-db")
    ]
)
async def fix_db() -> Dict[str, Any]:
    """Fix database schema by dropping old LangChain tables."""
    import psycopg2
    try:
        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        with conn.cursor() as cursor:
            cursor.execute("DROP TABLE IF EXISTS langchain_pg_embedding CASCADE;")
            cursor.execute("DROP TABLE IF EXISTS langchain_pg_collection CASCADE;")
            conn.commit()
        conn.close()
        return {"success": True, "message": "Dropped old LangChain tables"}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.function(
    image=image,
    timeout=60,
    memory=512,
    secrets=[
        modal.Secret.from_name("openvideo-db"),
        modal.Secret.from_name("openvideo-ai"),
        modal.Secret.from_name("openvideo-deepgram")
    ]
)
async def get_indexing_status(asset_id: str) -> Dict[str, Any]:
    """Get current indexing status for an asset."""
    try:
        print(f"Getting indexing status for asset: {asset_id}")
        
        # Direct database query for status
        import psycopg2
        from psycopg2.extras import RealDictCursor
        
        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    """
                    SELECT status, progress, stage, error, created_at, updated_at
                    FROM asset_indexing_status
                    WHERE asset_id = %s
                    ORDER BY updated_at DESC
                    LIMIT 1
                    """,
                    (asset_id,)
                )
                
                row = cursor.fetchone()
                if not row:
                    return {
                        "asset_id": asset_id,
                        "status": "not_found",
                        "message": "No indexing status found for this asset",
                        "timestamp": datetime.utcnow().isoformat()
                    }
                
                return {
                    "asset_id": asset_id,
                    "status": row["status"],
                    "progress": row["progress"] or 0,
                    "stage": row["stage"],
                    "error": row["error"],
                    "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                    "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
                    "timestamp": datetime.utcnow().isoformat()
                }
                
        finally:
            conn.close()
        
    except Exception as e:
        print(f"Error getting status for asset {asset_id}: {str(e)}")
        return {
            "asset_id": asset_id,
            "status": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


@app.function(
    image=image,
    timeout=120,
    memory=1024,
    secrets=[
        modal.Secret.from_name("openvideo-db"),
        modal.Secret.from_name("openvideo-ai"),
        modal.Secret.from_name("openvideo-deepgram")
    ]
)
async def health_check() -> Dict[str, Any]:
    """Health check endpoint."""
    try:
        print("Performing health check...")
        
        # Test database connection
        db_status = "disconnected"
        db_error = None
        
        try:
            import psycopg2
            conn = psycopg2.connect(os.getenv("DATABASE_URL"))
            conn.close()
            db_status = "connected"
        except Exception as e:
            db_error = str(e)
            print(f"Database connection failed: {db_error}")
        
        # Test AI service configuration
        ai_status = "not_configured"
        ai_error = None
        
        try:
            google_key = os.getenv("GOOGLE_API_KEY")
            deepgram_key = os.getenv("DEEPGRAM_API_KEY")
            
            if google_key and deepgram_key:
                ai_status = "configured"
            else:
                ai_error = "Missing API keys"
        except Exception as e:
            ai_error = str(e)
            print(f"AI service check failed: {ai_error}")
        
        # Test environment variables
        env_status = "configured"
        required_envs = ["DATABASE_URL", "GOOGLE_API_KEY", "DEEPGRAM_API_KEY"]
        missing_envs = [env for env in required_envs if not os.getenv(env)]
        
        if missing_envs:
            env_status = f"missing: {', '.join(missing_envs)}"
        
        # Overall status
        overall_status = "healthy"
        if db_status != "connected" or ai_status != "configured" or missing_envs:
            overall_status = "unhealthy"
        
        return {
            "status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "database": {
                    "status": db_status,
                    "error": db_error
                },
                "ai": {
                    "status": ai_status,
                    "error": ai_error
                },
                "environment": {
                    "status": env_status,
                    "required_vars": required_envs
                },
                "modal": "running"
            }
        }
        
    except Exception as e:
        print(f"Health check failed: {str(e)}")
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


@app.function(
    image=image,
    volumes={"/data": volume},
    timeout=600,  # 10 minutes
    memory=4096,  # 4GB RAM
    secrets=[
        modal.Secret.from_name("openvideo-db"),
        modal.Secret.from_name("openvideo-r2"),  # R2 credentials
    ]
)
async def conform_asset(asset_id: str, max_fps: int = 60) -> Dict[str, Any]:
    """Conform video to browser-optimized format (H.264, 60fps max, yuv420p)."""
    from ..services.downloader import HttpVideoDownloader
    from ..services.uploader import R2Uploader
    from ..services.video_conformer import VideoConformer
    from ..services.database import PostgreSQLClient
    
    start_time = datetime.utcnow()
    
    try:
        print(f"Starting conform for asset: {asset_id}")
        
        # Validate environment
        required_envs = ["DATABASE_URL", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"]
        missing_envs = [env for env in required_envs if not os.getenv(env)]
        
        if missing_envs:
            raise Exception(f"Missing environment variables: {', '.join(missing_envs)}")
        
        # Get asset from database
        db = PostgreSQLClient()
        asset = await db.get_asset(asset_id)
        
        if not asset:
            return {
                "success": False,
                "asset_id": asset_id,
                "error": "Asset not found",
                "timestamp": datetime.utcnow().isoformat()
            }
        
        if asset.type != "video":
            return {
                "success": False,
                "asset_id": asset_id,
                "error": "Asset is not a video",
                "timestamp": datetime.utcnow().isoformat()
            }
        
        # Initialize services
        downloader = HttpVideoDownloader()
        conformer = VideoConformer(downloader, max_fps=max_fps)
        uploader = R2Uploader()
        
        # Conform video
        result = await conformer.conform(asset)
        
        if not result["was_conformed"]:
            duration = (datetime.utcnow() - start_time).total_seconds()
            return {
                "success": True,
                "asset_id": asset_id,
                "was_conformed": False,
                "message": "Video already optimized",
                "video_info": result["video_info"],
                "duration_seconds": round(duration, 2),
                "timestamp": datetime.utcnow().isoformat()
            }
        
        # Upload conformed video to R2
        r2_key = uploader.generate_key(asset_id, suffix="conformed")
        new_src = await uploader.upload_file(result["local_path"], r2_key)
        
        # Update asset in database with new src
        await db.update_asset_src(asset_id, new_src)
        
        # Clean up local files
        for path in [result.get("local_path"), result.get("original_local_path")]:
            if path and os.path.exists(path):
                os.unlink(path)
                # Try to remove temp dir
                try:
                    os.rmdir(os.path.dirname(path))
                except:
                    pass
        
        duration = (datetime.utcnow() - start_time).total_seconds()
        
        print(f"Conform completed for asset: {asset_id} in {duration:.2f}s")
        
        return {
            "success": True,
            "asset_id": asset_id,
            "was_conformed": True,
            "original_fps": result["original_fps"],
            "new_fps": result["new_fps"],
            "new_src": new_src,
            "video_info": result["video_info"],
            "duration_seconds": round(duration, 2),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        print(f"Conform failed for asset {asset_id}: {str(e)}")
        return {
            "success": False,
            "asset_id": asset_id,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


# Local development entry point
if __name__ == "__main__":
    import asyncio
    
    async def main():
        """Local testing entry point."""
        asset_id = "test-asset-id"
        result = await index_asset(asset_id)
        print(f"Result: {result}")
    
    asyncio.run(main())
