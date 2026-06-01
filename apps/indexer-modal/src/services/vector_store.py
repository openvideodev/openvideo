"""Vector store implementation for embeddings and search."""

import os
from typing import List, Dict, Any, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from langchain_core.documents import Document
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_postgres import PGVector

from ..core.interfaces import VectorStore
from ..core.exceptions import VectorStoreError

load_dotenv()


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
        """Store documents with embeddings."""
        try:
            # Handle both Document objects and dicts
            langchain_docs = []
            for doc in documents:
                if isinstance(doc, Document):
                    # Already a Document object
                    langchain_docs.append(doc)
                else:
                    # Convert dict to Document
                    page_content = doc.get("pageContent", "")
                    metadata = doc.get("metadata", {})
                    langchain_doc = Document(
                        page_content=page_content,
                        metadata=metadata
                    )
                    langchain_docs.append(langchain_doc)
            
            # Add documents to vector store
            if langchain_docs:
                self.vector_store.add_documents(langchain_docs)
                
        except Exception as e:
            raise VectorStoreError(f"Failed to upsert documents: {str(e)}")
    
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
