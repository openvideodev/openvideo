"""Vector store implementation for embeddings and search."""

import os
import time
import asyncio
from typing import List, Dict, Any, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from langchain_core.documents import Document
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_postgres import PGVector
from google.genai.errors import ClientError

from ..core.interfaces import VectorStore
from ..core.exceptions import VectorStoreError
from ..shared.logging import get_logger

load_dotenv()
logger = get_logger("vector_store")


class PGVectorStore(VectorStore):
    """PostgreSQL + pgvector implementation for vector storage."""
    
    def __init__(
        self,
        connection_string: Optional[str] = None,
        embedding_model: str = "gemini-embedding-2"
    ):
        self.connection_string = (
            connection_string or 
            os.getenv("DATABASE_URL")
        )
        if not self.connection_string:
            raise VectorStoreError("DATABASE_URL not configured")
        
        # Initialize embeddings
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise VectorStoreError("GOOGLE_API_KEY not configured")
        
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model=embedding_model,
            google_api_key=api_key
        )
        
        # Initialize vector store
        self.collection_name = "openvideo_assets"
        self.vector_store = PGVector(
            connection=self.connection_string,
            embeddings=self.embeddings,
            collection_name=self.collection_name,
            use_jsonb=True,  # Use JSONB for metadata
            create_extension=True,  # Create pgvector extension if not exists
        )
    
    async def upsert_documents(self, documents: List[Any]) -> None:
        """Store documents with embeddings using batching and rate limiting.
        
        Google Gemini embeddings have rate limits (approx 100 requests/minute).
        We batch documents and add delays to avoid hitting limits.
        """
        if not documents:
            return
        
        # Handle both Document objects and dicts
        langchain_docs = []
        for doc in documents:
            if isinstance(doc, Document):
                langchain_docs.append(doc)
            else:
                page_content = doc.get("pageContent", "")
                metadata = doc.get("metadata", {})
                langchain_docs.append(Document(
                    page_content=page_content,
                    metadata=metadata
                ))
        
        # Process in small batches to avoid rate limits
        BATCH_SIZE = 8  # Small batches for Gemini embeddings
        MAX_RETRIES = 5
        RATE_LIMIT_DELAY = 2.0  # seconds between batches
        
        total_docs = len(langchain_docs)
        processed = 0
        
        for i in range(0, total_docs, BATCH_SIZE):
            batch = langchain_docs[i:i + BATCH_SIZE]
            batch_num = (i // BATCH_SIZE) + 1
            total_batches = (total_docs + BATCH_SIZE - 1) // BATCH_SIZE
            
            for attempt in range(MAX_RETRIES):
                try:
                    logger.debug(f"Upserting batch {batch_num}/{total_batches} ({len(batch)} docs, attempt {attempt + 1})")
                    self.vector_store.add_documents(batch)
                    processed += len(batch)
                    logger.debug(f"✅ Batch {batch_num} complete ({processed}/{total_docs})")
                    break
                    
                except Exception as e:
                    err_str = str(e)
                    if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "rate limit" in err_str.lower():
                        if attempt < MAX_RETRIES - 1:
                            wait_time = (attempt + 1) * 3  # Exponential backoff: 3s, 6s, 9s, 12s
                            logger.warning(f"Rate limit hit during batch {batch_num}, waiting {wait_time}s before retry: {err_str}")
                            await asyncio.sleep(wait_time)
                        else:
                            logger.error(f"Failed batch {batch_num} after {MAX_RETRIES} retries due to rate limit")
                            raise VectorStoreError(f"Rate limit exceeded: {err_str}")
                    else:
                        raise VectorStoreError(f"Failed to upsert documents: {err_str}")
            
            # Rate limiting delay between batches (skip on last batch)
            if i + BATCH_SIZE < total_docs:
                await asyncio.sleep(RATE_LIMIT_DELAY)
        
        logger.info(f"✅ Upserted {processed}/{total_docs} documents")
    
    async def delete_by_asset(self, asset_id: str) -> None:
        """Delete all vectors for an asset."""
        try:
            # Connect to database directly for custom query
            conn = psycopg2.connect(self.connection_string)
            try:
                with conn.cursor() as cursor:
                    # Delete vectors by metadata filter
                    cursor.execute(
                        """
                        DELETE FROM langchain_pg_embedding 
                        WHERE cmetadata->>'assetId' = %s
                        """,
                        (asset_id,)
                    )
                    conn.commit()
                    
            finally:
                conn.close()
                
        except Exception as e:
            raise VectorStoreError(f"Failed to delete vectors for asset {asset_id}: {str(e)}")
    
    async def similarity_search(
        self,
        query: str,
        space_id: str,
        k: int = 10,
        filter_dict: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Search for similar documents."""
        try:
            # Build filter
            filter_dict = filter_dict or {}
            filter_dict["spaceId"] = space_id
            
            # Perform similarity search
            results = self.vector_store.similarity_search_with_score(
                query=query,
                k=k,
                filter=filter_dict
            )
            
            # Convert results back to dict format
            documents = []
            for doc, score in results:
                documents.append({
                    "pageContent": doc.page_content,
                    "metadata": doc.metadata,
                    "score": score
                })
            
            return documents
            
        except Exception as e:
            raise VectorStoreError(f"Similarity search failed: {str(e)}")
