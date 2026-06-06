"""Main video indexer orchestrator following SOLID principles."""

import os
import re
import tempfile
import asyncio
from typing import List, Optional, Dict, Any
import cv2
import numpy as np
from PIL import Image
import io

# Import Document at module level for type hints
from langchain_core.documents import Document

from ..core.interfaces import (
    VideoDownloader, SceneDetector, AudioTranscriber, 
    VisionAnalyzer, VectorStore, ProgressTracker, 
    DatabaseClient, Asset, Scene, VisualScene, 
    TranscriptSegment, IndexingProgress, IndexingStatus
)
from ..core.exceptions import VideoIndexingError
from ..services.downloader import HttpVideoDownloader
from ..services.scene_detector import FFmpegSceneDetector
from ..services.transcriber import DeepgramTranscriber
from ..services.vision_analyzer import GeminiVisionAnalyzer
from ..services.vector_store import PGVectorStore
from ..services.progress_tracker import DatabaseProgressTracker
from ..services.database import PostgreSQLClient
from ..shared.logging import get_logger, setup_logging

# Initialize logging
setup_logging()
logger = get_logger("video_indexer")


class VideoIndexer:
    """Main orchestrator for video indexing pipeline."""
    
    def __init__(
        self,
        downloader: Optional[VideoDownloader] = None,
        scene_detector: Optional[SceneDetector] = None,
        transcriber: Optional[AudioTranscriber] = None,
        vision_analyzer: Optional[VisionAnalyzer] = None,
        vector_store: Optional[VectorStore] = None,
        progress_tracker: Optional[ProgressTracker] = None,
        database: Optional[DatabaseClient] = None
    ):
        """Initialize with dependency injection."""
        self.downloader = downloader or HttpVideoDownloader()
        self.scene_detector = scene_detector or FFmpegSceneDetector()
        self.transcriber = transcriber or DeepgramTranscriber()
        self.vision_analyzer = vision_analyzer or GeminiVisionAnalyzer()
        self.vector_store = vector_store or PGVectorStore()
        self.progress_tracker = progress_tracker or DatabaseProgressTracker()
        self.database = database or PostgreSQLClient()
    
    async def index_asset(self, asset_id: str) -> None:
        """Main entry point for indexing an asset."""
        logger.info(f"Starting indexing for asset: {asset_id}")
        
        try:
            # Get asset information
            asset = await self.database.get_asset(asset_id)
            if not asset:
                raise VideoIndexingError(f"Asset {asset_id} not found")
            
            logger.info(f"Found asset: {asset.name} (type: {asset.type})")
            
            # Initialize progress tracking - mark as started
            await self._update_progress(asset.id, 0, "starting")
            
            # Clean up existing vectors
            logger.debug(f"Cleaning up existing vectors for asset: {asset_id}")
            await self.vector_store.delete_by_asset(asset_id)
            
            # Route to appropriate processor
            if asset.type == "video":
                logger.info(f"Processing video asset: {asset.name}")
                await self._index_video(asset)
            elif asset.type == "audio":
                logger.info(f"Processing audio asset: {asset.name}")
                await self._index_audio(asset)
            elif asset.type == "image":
                logger.info(f"Processing image asset: {asset.name}")
                await self._index_image(asset)
            else:
                raise VideoIndexingError(f"Unsupported asset type: {asset.type}")
            
            # Mark as completed
            await self._update_progress(asset.id, 100, "completed")
            logger.info(f"Successfully completed indexing for asset: {asset_id}")
            
        except Exception as e:
            logger.error(f"Indexing failed for {asset_id}: {str(e)}", exc_info=True)
            await self._update_progress(asset.id, 0, f"failed: {str(e)}")
            raise VideoIndexingError(f"Indexing failed for {asset_id}: {str(e)}")
    
    async def _index_video(self, asset: Asset) -> None:
        """Index video asset with scene detection and transcription."""
        temp_video_path = None
        temp_frame_dir = None
        
        try:
            # Download video
            await self._update_progress(asset.id, 5, "downloading")
            temp_video_path = await self.downloader.download(asset)
            
            # Detect scenes
            await self._update_progress(asset.id, 15, "detecting_scenes")
            scenes = await self.scene_detector.detect_scenes(
                temp_video_path,
                threshold=0.3,
                min_scene_duration=2.0,
                max_scene_duration=300.0,
                max_scenes=50
            )
            
            # Run transcription — optional. Videos without audio will skip gracefully.
            await self._update_progress(asset.id, 25, "transcribing")
            segments = await self._safe_transcribe(asset)

            # Dense 1fps indexing with transcript-aware temporal chunks
            await self._update_progress(asset.id, 35, "dense_indexing")
            await self._index_video_dense(asset, temp_video_path, segments)

            # High-level AI understanding: chapters, topics, summary
            await self._update_progress(asset.id, 88, "understanding")
            await self._generate_asset_understanding(asset, segments, video_path=temp_video_path)

            await self._update_progress(asset.id, 100, "completed")
            
        finally:
            # Cleanup temp files
            if temp_video_path and os.path.exists(temp_video_path):
                os.unlink(temp_video_path)
            if temp_frame_dir and os.path.exists(temp_frame_dir):
                import shutil
                shutil.rmtree(temp_frame_dir)
    
    async def _index_audio(self, asset: Asset) -> None:
        """Index audio asset with transcription."""
        try:
            await self._update_progress(asset.id, 25, "transcribing")

            # Transcribe audio — gracefully handle silent / no-audio files
            segments = await self._safe_transcribe(asset)

            # Create vector documents
            await self._create_audio_vectors(asset, segments)

            # High-level AI understanding: chapters, topics, summary
            await self._update_progress(asset.id, 88, "understanding")
            await self._generate_asset_understanding(asset, segments)

            await self._update_progress(asset.id, 100, "completed")

        except Exception as e:
            raise VideoIndexingError(f"Audio indexing failed: {str(e)}")
    
    async def _index_image(self, asset: Asset) -> None:
        """Index image asset with visual analysis."""
        try:
            await self._update_progress(asset.id, 25, "analyzing")
            
            # Download and analyze image
            temp_path = await self.downloader.download(asset)
            
            with open(temp_path, "rb") as f:
                image_data = f.read()
            
            description = await self.vision_analyzer.analyze_image(
                image_data, 
                "Describe this image in detail. Include: visible objects and people, any text shown on screen, colors and visual style, overall scene setting and context, and likely topics or themes."
            )
            
            # Create vector document
            await self._create_image_vectors(asset, description)
            
            await self._update_progress(asset.id, 100, "completed")
            
            # Cleanup
            if os.path.exists(temp_path):
                os.unlink(temp_path)
                
        except Exception as e:
            raise VideoIndexingError(f"Image indexing failed: {str(e)}")
    
    async def _transcribe_and_save(self, asset: Asset) -> List[TranscriptSegment]:
        """Transcribe audio and save to database."""
        try:
            segments = await self.transcriber.transcribe(asset.src)
            await self.database.save_transcript(asset.id, segments)
            return segments
        except Exception as e:
            logger.warning(f"Transcription failed for {asset.name}: {e}")
            return []

    async def _safe_transcribe(self, asset: Asset) -> List[TranscriptSegment]:
        """Transcribe with graceful failure for videos with no / silent audio.
        
        Returns an empty list when transcription is unavailable so the rest of
        the pipeline continues with visual-only indexing.
        """
        try:
            segments = await self.transcriber.transcribe(asset.src)
            if segments:
                await self.database.save_transcript(asset.id, segments)
                logger.info(f"Transcription succeeded: {len(segments)} segment(s) for {asset.name}")
            else:
                logger.info(f"No speech detected in {asset.name} — continuing with visual-only indexing")
            return segments
        except Exception as e:
            logger.warning(
                f"Transcription unavailable for {asset.name} (possibly silent/no audio): {e}. "
                "Continuing with visual-only indexing."
            )
            return []
    
    async def _analyze_visual_scenes(
        self, 
        asset: Asset, 
        video_path: str, 
        scenes: List[Scene]
    ) -> List[VisualScene]:
        """Analyze visual scenes with frame extraction."""
        if not scenes:
            return []
        
        temp_frame_dir = tempfile.mkdtemp(prefix="frames_")
        visual_scenes = []
        
        try:
            # Process scenes in batches
            BATCH_SIZE = 3
            for i in range(0, len(scenes), BATCH_SIZE):
                batch = scenes[i:i + BATCH_SIZE]
                batch_results = await asyncio.gather(
                    *[
                        self._process_single_scene(asset, video_path, temp_frame_dir, scene)
                        for scene in batch
                    ],
                    return_exceptions=True
                )
                
                for result in batch_results:
                    if isinstance(result, Exception):
                        print(f"Scene processing failed: {result}")
                    else:
                        visual_scenes.append(result)
                
                # Update progress
                progress = 30 + int((i / len(scenes)) * 50)
                await self._update_progress(asset.id, progress, "analyzing_scenes")
            
            # Save visual timeline
            if visual_scenes:
                await self.database.save_visual_timeline(asset.id, visual_scenes)
            
            return visual_scenes
            
        finally:
            import shutil
            if os.path.exists(temp_frame_dir):
                shutil.rmtree(temp_frame_dir)
    
    async def _process_single_scene(
        self, 
        asset: Asset, 
        video_path: str, 
        frame_dir: str, 
        scene: Scene
    ) -> VisualScene:
        """Process a single scene: extract frames and analyze."""
        try:
            # Extract 3 keyframes from scene
            frames = self._extract_keyframes(video_path, scene, frame_dir)
            
            if not frames:
                return VisualScene(
                    start_ms=int(scene.start_time * 1000),
                    end_ms=int(scene.end_time * 1000),
                    description="No visual content detected",
                    objects=[],
                    topics=[],
                    keywords=[]
                )
            
            # Analyze frames
            analysis = await self.vision_analyzer.analyze_scene_frames(
                frames,
                "Analyze these frames from a video scene."
            )
            
            return VisualScene(
                start_ms=int(scene.start_time * 1000),
                end_ms=int(scene.end_time * 1000),
                description=analysis.get("description", ""),
                objects=analysis.get("objects", []),
                topics=analysis.get("topics", []),
                keywords=analysis.get("keywords", [])
            )
            
        except Exception as e:
            print(f"Scene analysis failed: {e}")
            return VisualScene(
                start_ms=int(scene.start_time * 1000),
                end_ms=int(scene.end_time * 1000),
                description=f"Scene analysis failed: {str(e)}",
                objects=[],
                topics=[],
                keywords=[]
            )
    
    def _extract_keyframes(
        self, 
        video_path: str, 
        scene: Scene, 
        frame_dir: str
    ) -> List[bytes]:
        """Extract keyframes from a scene at regular intervals for action detection."""
        try:
            cap = cv2.VideoCapture(video_path)
            frames = []
            
            # Get scene duration
            duration = scene.end_time - scene.start_time
            
            # For short scenes (< 3s), extract 4 frames distributed throughout
            # For longer scenes, extract frames every ~1 second, up to 8 frames
            if duration < 3.0:
                positions = [
                    scene.start_time,
                    scene.start_time + duration * 0.25,
                    scene.start_time + duration * 0.5,
                    scene.start_time + duration * 0.75,
                ]
            else:
                # Extract frames every ~1 second
                interval = max(0.8, duration / 8.0)
                positions = []
                current = scene.start_time
                while current < scene.end_time - 0.2 and len(positions) < 8:
                    positions.append(current)
                    current += interval
            
            for pos in positions:
                cap.set(cv2.CAP_PROP_POS_MSEC, pos * 1000)
                ret, frame = cap.read()
                
                if ret:
                    # Convert to RGB and resize
                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    frame_resized = cv2.resize(frame_rgb, (640, 480))
                    
                    # Convert to PIL Image and then to bytes
                    pil_image = Image.fromarray(frame_resized)
                    img_bytes = io.BytesIO()
                    pil_image.save(img_bytes, format='JPEG')
                    frames.append(img_bytes.getvalue())
            
            cap.release()
            return frames
            
        except Exception as e:
            print(f"Frame extraction failed: {e}")
            return []
    
    async def _create_video_vectors(
        self,
        asset: Asset,
        segments: List[TranscriptSegment],
        visual_scenes: List[VisualScene]
    ) -> None:
        """Create vector documents for video content with fine-grained transcript chunks."""
        from langchain_core.documents import Document

        documents = []

        # Visual documents
        for scene in visual_scenes:
            topics_str = ", ".join(scene.topics) if scene.topics else ""
            objects_str = ", ".join(scene.objects) if scene.objects else ""
            keywords_str = ", ".join(scene.keywords) if scene.keywords else ""

            content_parts = [
                f"title: {asset.name}",
                f"description: {scene.description}"
            ]

            if topics_str:
                content_parts.append(f"topics: {topics_str}")
            if objects_str:
                content_parts.append(f"objects: {objects_str}")
            if keywords_str:
                content_parts.append(f"keywords: {keywords_str}")

            documents.append(Document(
                page_content=" | ".join(content_parts),
                metadata={
                    "spaceId": asset.space_id,
                    "assetId": asset.id,
                    "assetName": asset.name,
                    "assetType": "video",
                    "src": asset.src,
                    "layer": "asset-visual-description",
                    "startMs": scene.start_ms,
                    "endMs": scene.end_ms,
                    "topics": scene.topics,
                    "objects": scene.objects
                }
            ))

        # Store visual documents first
        if documents:
            await self.vector_store.upsert_documents(documents)

        # Create fine-grained transcript chunks (handles both word-level and segment-level)
        if segments:
            await self._create_transcript_vectors(asset, segments, "video")
    
    async def _create_audio_vectors(self, asset: Asset, segments: List[TranscriptSegment]) -> None:
        """Create vector documents for audio content with word-level granularity."""
        await self._create_transcript_vectors(asset, segments, "audio")

    async def _create_transcript_vectors(
        self,
        asset: Asset,
        segments: List[TranscriptSegment],
        asset_type: str
    ) -> None:
        """Create fine-grained transcript chunks with word-level timestamps.

        Splits segments into small semantic chunks (5-12 words) for precise clip extraction.
        Each chunk has accurate startMs/endMs from actual word timestamps - no estimation needed.
        """
        from langchain_core.documents import Document
        import re

        documents = []
        chunk_id = 0

        for segment in segments:
            # Split segment into smaller chunks (sentences/phrases)
            chunks = self._split_segment_into_chunks(segment)

            for chunk in chunks:
                chunk_text = chunk["text"]
                words = chunk.get("words", [])

                # Build metadata with word-level timestamps
                # startMs/endMs are from actual word timestamps, not estimated
                metadata = {
                    "spaceId": asset.space_id,
                    "assetId": asset.id,
                    "assetName": asset.name,
                    "assetType": asset_type,
                    "src": asset.src,
                    "layer": "asset-transcript",
                    "startMs": chunk["start_ms"],
                    "endMs": chunk["end_ms"],
                    "wordCount": len(words),
                }

                # Include word boundary info for any additional refinement if needed
                if words:
                    metadata["startWords"] = [w["word"] for w in words[:3]]
                    metadata["endWords"] = [w["word"] for w in words[-3:]]

                documents.append(Document(
                    page_content=f"title: {asset.name} | text: {chunk_text}",
                    metadata=metadata
                ))
                chunk_id += 1

        if documents:
            await self.vector_store.upsert_documents(documents)
            logger.info(f"Indexed {chunk_id} word-level transcript chunks for {asset.name}")

    def _split_segment_into_chunks(self, segment: TranscriptSegment) -> List[Dict]:
        """Split a transcript segment into sentence-aligned chunks with word-level timestamps.
        
        Splits strictly on:
        - Sentence boundaries (.!? at the end of a word)
        - Major pauses (> 1.2 seconds) between words if punctuation is missing
        
        This prevents cutting clips mid-sentence.
        """
        text = segment.text.strip()
        words = segment.words or []

        if not text:
            return []

        # If no word timestamps, split by sentence using regex on text
        if not words:
            import re
            # Split by punctuation followed by space
            sentences = re.split(r'(?<=[.!?])\s+', text)
            chunks = []
            
            duration = segment.end_ms - segment.start_ms
            word_count = len(text.split())
            if word_count == 0:
                return []
            word_duration = duration / word_count
            
            char_count = 0
            for s in sentences:
                s_text = s.strip()
                if not s_text:
                    continue
                s_word_count = len(s_text.split())
                s_start_ms = segment.start_ms + int((char_count / len(text)) * duration)
                char_count += len(s) + 1  # +1 for split space
                s_end_ms = min(segment.end_ms, segment.start_ms + int((char_count / len(text)) * duration))
                
                # Re-estimate words for this sentence
                s_words = s_text.split()
                s_words_list = []
                for idx, w in enumerate(s_words):
                    w_start = s_start_ms + int(idx * (s_end_ms - s_start_ms) / len(s_words))
                    w_end = s_start_ms + int((idx + 1) * (s_end_ms - s_start_ms) / len(s_words))
                    s_words_list.append({
                        "word": w,
                        "start_ms": w_start,
                        "end_ms": w_end,
                        "startMs": w_start,
                        "endMs": w_end
                    })
                chunks.append({
                    "text": s_text,
                    "start_ms": s_start_ms,
                    "end_ms": s_end_ms,
                    "words": s_words_list
                })
            return chunks

        # If we have word timestamps, we chunk them based on sentence punctuation
        # and long pauses.
        chunks = []
        current_words = []
        chunk_start_ms = words[0].get("start_ms", words[0].get("startMs", segment.start_ms))

        def is_sentence_end(w: Dict) -> bool:
            pw = w.get("punctuated_word", w.get("word", ""))
            return any(pw.endswith(char) for char in (".", "!", "?"))

        for i, w in enumerate(words):
            current_words.append(w)
            
            # Check for split conditions:
            # 1. Word has sentence-ending punctuation
            # 2. Significant pause before next word (> 1.2s)
            # 3. Emergency chunk size (> 35 words)
            
            has_next = i < len(words) - 1
            next_w = words[i + 1] if has_next else None
            
            curr_end = w.get("end_ms", w.get("endMs", segment.end_ms))
            next_start = next_w.get("start_ms", next_w.get("startMs", curr_end)) if next_w else curr_end
            pause = (next_start - curr_end) / 1000.0  # seconds
            
            should_split = False
            if not has_next:
                should_split = True
            elif is_sentence_end(w):
                # Split at sentence end
                should_split = True
            elif pause > 1.2:
                # Split at long pause
                should_split = True
            elif len(current_words) >= 35:
                # Split at word limit (emergency cap)
                should_split = True

            if should_split and current_words:
                chunk_text = " ".join([cw.get("punctuated_word", cw.get("word", "")) for cw in current_words])
                chunk_end_ms = current_words[-1].get("end_ms", current_words[-1].get("endMs", segment.end_ms))
                chunks.append({
                    "text": chunk_text,
                    "start_ms": chunk_start_ms,
                    "end_ms": chunk_end_ms,
                    "words": list(current_words)
                })
                if has_next:
                    current_words = []
                    chunk_start_ms = next_w.get("start_ms", next_w.get("startMs", next_start))

        return chunks
    
    async def _create_image_vectors(self, asset: Asset, description: str) -> None:
        """Create vector documents for image content."""
        from langchain_core.documents import Document
        
        document = Document(
            page_content=f"title: {asset.name} | description: {description}",
            metadata={
                "spaceId": asset.space_id,
                "assetId": asset.id,
                "assetName": asset.name,
                "assetType": "image",
                "src": asset.src,
                "layer": "asset-description"
            }
        )
        
        await self.vector_store.upsert_documents([document])
    
    async def _index_video_dense(
        self,
        asset: Asset,
        video_path: str,
        segments: List[TranscriptSegment]
    ) -> None:
        """Dense 1fps indexing with batch processing and parallel execution.
        
        Optimizations:
        - Adaptive sampling based on video duration
        - Batched API calls (10 chunks per batch)
        - Parallel processing with semaphore
        - Initial estimates logging
        """
        import asyncio
        
        # Configuration
        BATCH_SIZE = 10  # Process 10 chunks per batch
        MAX_CONCURRENT = 5  # Max 5 parallel API calls
        
        # Adaptive frame sampling based on video duration
        # Target: <1min=1fps, 1-5min=0.5fps, 5-10min=0.33fps, >10min=0.25fps
        duration_sec = self._get_video_duration(video_path)
        
        if duration_sec < 60:  # < 1 min: 1 frame per second
            frame_interval_sec = 1.0
            window_size_ms = 4000  # 4s chunks for batching efficiency
            overlap_ms = 0
        elif duration_sec < 300:  # 1-5 min: 1 frame per 2 seconds
            frame_interval_sec = 2.0
            window_size_ms = 8000
            overlap_ms = 0
        elif duration_sec < 600:  # 5-10 min: 1 frame per 3 seconds
            frame_interval_sec = 3.0
            window_size_ms = 9000
            overlap_ms = 0
        else:  # > 10 min: 1 frame per 4 seconds
            frame_interval_sec = 4.0
            window_size_ms = 8000
            overlap_ms = 0
        
        logger.info(f"Starting dense indexing for {asset.name}")
        logger.info(f"Video duration: {duration_sec:.1f}s | Frame interval: {frame_interval_sec}s | Window: {window_size_ms/1000:.1f}s")
        
        # Create temporal chunks
        chunks = self._create_temporal_chunks(segments, duration_sec, window_size_ms, overlap_ms)
        
        # Calculate estimates (frames depend on chunk duration / frame_interval)
        total_chunks = len(chunks)
        total_batches = (total_chunks + BATCH_SIZE - 1) // BATCH_SIZE
        # Rough estimate: average chunk is window_size_ms, so frames per chunk ≈ window_size_ms/1000 / frame_interval_sec
        avg_frames_per_chunk = (window_size_ms / 1000) / frame_interval_sec
        estimated_frames = int(total_chunks * avg_frames_per_chunk)
        estimated_api_calls = total_batches  # 1 API call per batch (batch of 10)
        
        logger.info(f"📊 ESTIMATES: {total_chunks} chunks | {total_batches} batches | {estimated_frames} frames | {estimated_api_calls} API calls")
        logger.info(f"⏱️  Estimated time: ~{estimated_api_calls * 3}s (assuming 3s per batch)")
        
        # Process in batches with parallel execution
        semaphore = asyncio.Semaphore(MAX_CONCURRENT)
        documents = []
        processed = 0
        
        async def process_batch(batch_chunks, batch_idx, frame_interval):
            async with semaphore:
                batch_docs = []
                for chunk in batch_chunks:
                    doc = await self._process_single_chunk(asset, video_path, chunk, frame_interval)
                    if doc:
                        batch_docs.append(doc)
                return batch_docs
        
        # Create batch tasks
        tasks = []
        for i in range(0, len(chunks), BATCH_SIZE):
            batch = chunks[i:i + BATCH_SIZE]
            tasks.append(process_batch(batch, i // BATCH_SIZE, frame_interval_sec))
        
        # Execute batches with progress updates
        logger.info(f"🚀 Processing {len(tasks)} batch tasks with max {MAX_CONCURRENT} concurrent...")
        
        for i, task in enumerate(asyncio.as_completed(tasks)):
            batch_docs = await task
            documents.extend(batch_docs)
            processed += BATCH_SIZE
            
            # Progress update
            progress = min(35 + int((i + 1) / len(tasks) * 50), 85)
            await self._update_progress(asset.id, progress, f"analyzing ({processed}/{total_chunks})")
            
            logger.info(f"✅ Batch {i+1}/{len(tasks)} complete: {len(batch_docs)} docs | Total: {len(documents)}")
        
        # Store all documents
        if documents:
            logger.info(f"💾 Upserting {len(documents)} documents to vector store...")
            await self.vector_store.upsert_documents(documents)
            
            # Save visual timeline
            visual_scenes = [
                {
                    "startMs": d.metadata["startMs"],
                    "endMs": d.metadata["endMs"],
                    "description": d.metadata["visualDescription"],
                    "objects": d.metadata["objects"],
                    "topics": d.metadata["topics"],
                    "keywords": d.metadata["keywords"]
                }
                for d in documents
            ]
            await self.database.save_visual_timeline(asset.id, visual_scenes)
            logger.info(f"✅ Dense indexing complete: {len(documents)} chunks indexed")

    async def _generate_asset_understanding(
        self,
        asset: Asset,
        segments: List[TranscriptSegment],
        video_path: Optional[str] = None
    ) -> None:
        """Generate high-level AI understanding (chapters, topics, summary) for an asset.

        All three artefacts are stored exclusively in the vector store as separate
        layers so the LLM can retrieve them via semantic search:
          - layer: "asset-chapters"  — list of named, time-stamped chapters
          - layer: "asset-topics"    — flat list of key topics / themes
          - layer: "asset-summary"   — one-paragraph prose summary

        Gracefully skips if the vision analyzer is unavailable or fails.
        Videos without a transcript still receive visual-context understanding.
        """
        try:
            from langchain_core.documents import Document

            # ------------------------------------------------------------------
            # Build a combined content string from whatever is available.
            # ------------------------------------------------------------------
            has_transcript = bool(segments)
            content_lines: List[str] = []

            if has_transcript:
                content_lines.append("=== TRANSCRIPT SEGMENTS ===")
                for seg in segments:
                    start_s = seg.start_ms / 1000
                    end_s = seg.end_ms / 1000
                    content_lines.append(f"[{start_s:.1f}s – {end_s:.1f}s] {seg.text}")

            # If we have access to the dense-indexed visual scenes saved in the
            # DB, retrieve them to enrich the understanding prompt.
            visual_descriptions: List[str] = []
            try:
                timeline_rows = await self.database.get_visual_timeline(asset.id)
                if timeline_rows:
                    content_lines.append("=== VISUAL SCENE DESCRIPTIONS ===")
                    for scene in timeline_rows[:40]:  # cap at 40 scenes to stay within context
                        start_s = scene.get("startMs", 0) / 1000
                        end_s = scene.get("endMs", 0) / 1000
                        desc = scene.get("description", "")
                        if desc:
                            visual_descriptions.append(f"[{start_s:.1f}s – {end_s:.1f}s] {desc}")
                            content_lines.append(visual_descriptions[-1])
            except Exception as e:
                logger.debug(f"Could not retrieve visual timeline for understanding: {e}")

            if not content_lines:
                logger.info(f"Skipping asset understanding for {asset.name}: no content available")
                return

            combined_content = "\n".join(content_lines)
            asset_type_label = asset.type  # "video" | "audio" | "image"
            has_time_info = has_transcript or bool(visual_descriptions)

            # ------------------------------------------------------------------
            # 1. CHAPTERS (only meaningful when we have timing information)
            # ------------------------------------------------------------------
            if has_time_info:
                # AI provides START and END quotes for word-level timestamp accuracy
                chapters_prompt = f"""You are analyzing a {asset_type_label} asset named "{asset.name}" for an AI video editor.

Given the following transcript segments (each prefixed with its timestamp in seconds), identify distinct chapters or sections.
For each chapter you MUST provide:
1. "title" - Chapter title
2. "description" - One-sentence description of what this chapter covers
3. "approximateStartMs" - The approximate start timestamp of the chapter in milliseconds (based on the segment prefix)
4. "approximateEndMs" - The approximate end timestamp of the chapter in milliseconds (based on the segment prefix)
5. "startQuote" - The exact phrase spoken right at the START of this chapter (verbatim, 3-8 words)
6. "endQuote" - The exact phrase spoken right at the END of this chapter (verbatim, 3-8 words)

Both quotes must appear word-for-word in the transcript. These will be used to locate precise word-level timestamps.

Return a JSON object:
{{
  "chapters": [
    {{
      "title": "Chapter title",
      "description": "One-sentence description",
      "approximateStartMs": 185000,
      "approximateEndMs": 280000,
      "startQuote": "exact phrase at chapter start",
      "endQuote": "exact phrase at chapter end",
      "keywords": ["keyword1", "keyword2"]
    }}
  ]
}}"""
                try:
                    chapters_result = await self.vision_analyzer.analyze_text(combined_content, chapters_prompt)
                    raw_chapters = chapters_result.get("chapters", [])
                    if raw_chapters and segments:
                        # Align chapters to actual transcript segments for precise timestamps
                        aligned_chapters = self._align_chapters_to_segments(raw_chapters, segments)
                        
                        chapter_docs = []
                        for ch in aligned_chapters:
                            content_str = (
                                f"title: {asset.name} | "
                                f"chapter: {ch.get('title', '')} | "
                                f"description: {ch.get('description', '')} | "
                                f"keywords: {', '.join(ch.get('keywords', []))}"
                            )
                            chapter_docs.append(Document(
                                page_content=content_str,
                                metadata={
                                    "spaceId": asset.space_id,
                                    "assetId": asset.id,
                                    "assetName": asset.name,
                                    "assetType": asset.type,
                                    "src": asset.src,
                                    "layer": "asset-chapters",
                                    "chapterTitle": ch.get("title", ""),
                                    "startMs": ch.get("startMs", 0),
                                    "endMs": ch.get("endMs", 0),
                                    "keywords": ch.get("keywords", [])
                                }
                            ))
                        await self.vector_store.upsert_documents(chapter_docs)
                        logger.info(f"✅ Indexed {len(chapter_docs)} chapter(s) with transcript-aligned timestamps for {asset.name}")
                    elif raw_chapters and visual_descriptions:
                        # Fallback: align to visual scenes if no transcript
                        aligned_chapters = self._align_chapters_to_visuals(raw_chapters, visual_descriptions)
                        
                        chapter_docs = []
                        for ch in aligned_chapters:
                            content_str = (
                                f"title: {asset.name} | "
                                f"chapter: {ch.get('title', '')} | "
                                f"description: {ch.get('description', '')} | "
                                f"keywords: {', '.join(ch.get('keywords', []))}"
                            )
                            chapter_docs.append(Document(
                                page_content=content_str,
                                metadata={
                                    "spaceId": asset.space_id,
                                    "assetId": asset.id,
                                    "assetName": asset.name,
                                    "assetType": asset.type,
                                    "src": asset.src,
                                    "layer": "asset-chapters",
                                    "chapterTitle": ch.get("title", ""),
                                    "startMs": ch.get("startMs", 0),
                                    "endMs": ch.get("endMs", 0),
                                    "keywords": ch.get("keywords", [])
                                }
                            ))
                        await self.vector_store.upsert_documents(chapter_docs)
                        logger.info(f"✅ Indexed {len(chapter_docs)} chapter(s) with visual-aligned timestamps for {asset.name}")
                except Exception as e:
                    logger.warning(f"Chapter generation failed for {asset.name}: {e}")

            # ------------------------------------------------------------------
            # 2. TOPICS
            # ------------------------------------------------------------------
            topics_prompt = f"""You are analyzing a {asset_type_label} asset named "{asset.name}" for an AI video editor.

Given the following content, extract the main topics, themes, and concepts.
Be specific and granular — prefer concrete topics over vague categories.

Return a JSON object:
{{
  "topics": ["topic1", "topic2", ...],
  "primaryTheme": "The single most dominant theme or subject matter",
  "contentType": "e.g. tutorial, interview, product-demo, vlog, news, lecture, entertainment"
}}"""
            try:
                topics_result = await self.vision_analyzer.analyze_text(combined_content, topics_prompt)
                topics = topics_result.get("topics", [])
                primary_theme = topics_result.get("primaryTheme", "")
                content_type = topics_result.get("contentType", "")
                if topics or primary_theme:
                    topics_content = (
                        f"title: {asset.name} | "
                        f"primary theme: {primary_theme} | "
                        f"content type: {content_type} | "
                        f"topics: {', '.join(topics)}"
                    )
                    await self.vector_store.upsert_documents([Document(
                        page_content=topics_content,
                        metadata={
                            "spaceId": asset.space_id,
                            "assetId": asset.id,
                            "assetName": asset.name,
                            "assetType": asset.type,
                            "src": asset.src,
                            "layer": "asset-topics",
                            "topics": topics,
                            "primaryTheme": primary_theme,
                            "contentType": content_type
                        }
                    )])
                    logger.info(f"✅ Indexed topics for {asset.name}: {topics[:5]}")
            except Exception as e:
                logger.warning(f"Topics generation failed for {asset.name}: {e}")

            # ------------------------------------------------------------------
            # 3. SUMMARY
            # ------------------------------------------------------------------
            summary_prompt = f"""You are analyzing a {asset_type_label} asset named "{asset.name}" for an AI video editor.

Given the following content, write a concise, informative summary (2–4 sentences) that captures:
- What this {asset_type_label} is about
- Key moments, topics, or highlights
- Who it may be useful for

Also provide a short one-line headline (≤12 words).

Return a JSON object:
{{
  "headline": "Short punchy headline",
  "summary": "Full 2-4 sentence summary"
}}"""
            try:
                summary_result = await self.vision_analyzer.analyze_text(combined_content, summary_prompt)
                headline = summary_result.get("headline", "")
                summary = summary_result.get("summary", "")
                if summary:
                    summary_content = (
                        f"title: {asset.name} | "
                        f"headline: {headline} | "
                        f"summary: {summary}"
                    )
                    await self.vector_store.upsert_documents([Document(
                        page_content=summary_content,
                        metadata={
                            "spaceId": asset.space_id,
                            "assetId": asset.id,
                            "assetName": asset.name,
                            "assetType": asset.type,
                            "src": asset.src,
                            "layer": "asset-summary",
                            "headline": headline
                        }
                    )])
                    logger.info(f"✅ Indexed summary for {asset.name}: {headline}")
            except Exception as e:
                logger.warning(f"Summary generation failed for {asset.name}: {e}")

        except Exception as e:
            # Never block overall indexing due to understanding failures
            logger.warning(f"Asset understanding generation failed for {asset.name}: {e}")
    
    def _get_video_duration(self, video_path: str) -> float:
        """Get video duration in seconds."""
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0
        cap.release()
        return duration
    
    def _create_temporal_chunks(
        self, 
        segments: List[TranscriptSegment], 
        duration_sec: float,
        window_size_ms: int,
        overlap_ms: int
    ) -> List[Dict]:
        """Create temporal chunks aligned with transcript or uniform sampling."""
        chunks = []
        
        if segments and len(segments) > 1:
            # Use transcript segments
            for seg in segments:
                chunks.append({
                    "start_ms": seg.start_ms,
                    "end_ms": seg.end_ms,
                    "text": seg.text,
                    "type": "transcript_chunk"
                })
        else:
            # Uniform sampling with sliding windows
            current = 0
            max_ms = int(duration_sec * 1000)
            while current < max_ms:
                end_ms = min(current + window_size_ms, max_ms)
                chunks.append({
                    "start_ms": current,
                    "end_ms": end_ms,
                    "text": "",
                    "type": "visual_chunk"
                })
                current += (window_size_ms - overlap_ms)
        
        return chunks
    
    async def _process_single_chunk(
        self, 
        asset: Asset, 
        video_path: str, 
        chunk: Dict,
        frame_interval_sec: float = 2.0
    ) -> Optional[Document]:
        """Process a single temporal chunk: extract frames and analyze."""
        start_sec = chunk["start_ms"] / 1000
        end_sec = chunk["end_ms"] / 1000
        chunk_duration = end_sec - start_sec
        
        # Calculate number of frames based on frame_interval_sec
        num_frames = max(1, int(chunk_duration / frame_interval_sec))
        
        # Generate frame positions spread evenly across the chunk
        if num_frames == 1:
            frame_positions = [start_sec + chunk_duration * 0.5]
        else:
            # Evenly distribute frames across the chunk
            frame_positions = []
            for i in range(num_frames):
                if i == 0:
                    frame_positions.append(start_sec)
                elif i == num_frames - 1:
                    frame_positions.append(end_sec - 0.1)
                else:
                    frame_positions.append(start_sec + chunk_duration * (i / (num_frames - 1)))
        
        frames = self._extract_frames_at_positions(video_path, frame_positions)
        
        if not frames:
            return None
        
        # Analyze frames with Gemini
        context = f"""Video segment from {start_sec:.1f}s to {end_sec:.1f}s.
Transcript: "{chunk['text']}""" if chunk['text'] else f"Video segment from {start_sec:.1f}s to {end_sec:.1f}s."
        
        analysis = await self.vision_analyzer.analyze_scene_frames(frames, context)
        
        visual_desc = analysis.get("description", "")
        objects = ", ".join(analysis.get("objects", []))
        topics = ", ".join(analysis.get("topics", []))
        
        # Create document
        if chunk['text']:
            page_content = f"""title: {asset.name}
time: {start_sec:.1f}s - {end_sec:.1f}s
transcript: {chunk['text']}
visual: {visual_desc}
objects: {objects}
topics: {topics}"""
        else:
            page_content = f"""title: {asset.name}
time: {start_sec:.1f}s - {end_sec:.1f}s
visual: {visual_desc}
objects: {objects}
topics: {topics}"""
        
        return Document(
            page_content=page_content,
            metadata={
                "spaceId": asset.space_id,
                "assetId": asset.id,
                "assetName": asset.name,
                "assetType": "video",
                "src": asset.src,
                "layer": "video-chunk",
                "startMs": chunk["start_ms"],
                "endMs": chunk["end_ms"],
                "transcriptText": chunk.get("text", ""),
                "visualDescription": visual_desc,
                "objects": analysis.get("objects", []),
                "topics": analysis.get("topics", []),
                "keywords": analysis.get("keywords", [])
            }
        )
    
    def _extract_frames_at_positions(self, video_path: str, positions: List[float]) -> List[bytes]:
        """Extract frames at specific time positions."""
        frames = []
        cap = cv2.VideoCapture(video_path)
        
        for pos in positions:
            cap.set(cv2.CAP_PROP_POS_MSEC, pos * 1000)
            ret, frame = cap.read()
            if ret:
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frame_resized = cv2.resize(frame_rgb, (640, 480))
                pil_image = Image.fromarray(frame_resized)
                img_bytes = io.BytesIO()
                pil_image.save(img_bytes, format='JPEG')
                frames.append(img_bytes.getvalue())
        
        cap.release()
        return frames
    
    def _align_chapters_to_segments(
        self,
        chapters: List[Dict],
        segments: List[TranscriptSegment]
    ) -> List[Dict]:
        """Align AI-generated chapters to word-level transcript timestamps.

        The AI provides `startQuote` and `endQuote` — short verbatim phrases from
        the transcript. It also provides `approximateStartMs` and `approximateEndMs`
        to anchor the search around the correct chronological neighbourhood, solving
        the teaser hook duplicate matching problem.

        We search at WORD LEVEL using SequenceMatcher to find the exact timestamps:
        - startMs = timestamp of first word matching startQuote
        - endMs = timestamp of last word matching endQuote
        """
        if not segments or not chapters:
            return chapters

        # Build flat list of all words with their timestamps
        all_words: List[Dict] = []
        for seg in segments:
            # Generate pseudo-words if segment.words is empty
            seg_words = seg.words
            if not seg_words and seg.text:
                words_list = seg.text.split()
                if words_list:
                    duration = seg.end_ms - seg.start_ms
                    word_duration = duration / len(words_list)
                    seg_words = []
                    for idx, w in enumerate(words_list):
                        w_start = int(seg.start_ms + idx * word_duration)
                        w_end = int(seg.start_ms + (idx + 1) * word_duration)
                        seg_words.append({
                            "word": w,
                            "start_ms": w_start,
                            "end_ms": w_end
                        })

            if seg_words:
                for w in seg_words:
                    word_text = w.get("word", "")
                    # Support both snake_case and camelCase safely
                    start_ms = w.get("start_ms") if w.get("start_ms") is not None else w.get("startMs", 0)
                    end_ms = w.get("end_ms") if w.get("end_ms") is not None else w.get("endMs", 0)
                    all_words.append({
                        "word": word_text,
                        "cleaned": re.sub(r'[^a-z0-9]', '', word_text.lower()),
                        "start_ms": start_ms,
                        "end_ms": end_ms,
                    })

        if not all_words:
            return chapters

        def _clean_quote(quote: str) -> List[str]:
            words = quote.lower().split()
            cleaned = []
            for w in words:
                cleaned_w = re.sub(r'[^a-z0-9]', '', w)
                if cleaned_w:
                    cleaned.append(cleaned_w)
            return cleaned

        import difflib

        def _find_quote_timestamps(quote: str, target_ms: Optional[int], fallback_idx: int) -> tuple[int, int, int]:
            """Find exact word timestamps for a quote.
            Anchors search near target_ms if available (+/- 30s neighbourhood).
            Falls back to searching sequentially from fallback_idx.
            Returns (start_ms, end_ms, matched_end_idx).
            """
            if not quote:
                return (0, 0, fallback_idx)

            quote_words = _clean_quote(quote)
            quote_len = len(quote_words)
            if quote_len == 0:
                return (0, 0, fallback_idx)

            # 1. Determine the search range index in all_words
            start_idx = 0
            end_idx = len(all_words)

            if target_ms is not None and target_ms > 0:
                # Find the index of the word closest to target_ms
                target_idx = -1
                min_diff = float('inf')
                for idx, w in enumerate(all_words):
                    diff = abs(w["start_ms"] - target_ms)
                    if diff < min_diff:
                        min_diff = diff
                        target_idx = idx

                if target_idx != -1:
                    # Define +/- 30 seconds neighbourhood around target_idx
                    # At average speaking rate of 150 words per minute, 30s is ~75 words
                    WINDOW_WORDS = 100
                    start_idx = max(0, target_idx - WINDOW_WORDS)
                    end_idx = min(len(all_words), target_idx + WINDOW_WORDS)

            # If sequential search is forced or target search fails, ensure we start at least from fallback_idx
            if target_ms is None or start_idx < fallback_idx:
                start_idx = max(start_idx, fallback_idx)

            # Helper to search in a given range of all_words
            def search_in_range(start: int, end: int) -> tuple[int, int, int]:
                best_score = 0
                best_match_idx = -1
                best_w_len = -1

                # Slide window over the specified range
                for i in range(start, max(start + 1, end - quote_len + 1)):
                    if i + quote_len > len(all_words):
                        break
                    
                    # Try window lengths from max(1, quote_len - 2) to quote_len + 2
                    for w_len in range(max(1, quote_len - 2), quote_len + 3):
                        if i + w_len > len(all_words):
                            continue
                        window_words = [all_words[i + j]["cleaned"] for j in range(w_len)]
                        
                        ratio = difflib.SequenceMatcher(None, quote_words, window_words).ratio()
                        
                        # Require at least 60% match
                        if ratio >= 0.6 and ratio > best_score:
                            best_score = ratio
                            best_match_idx = i
                            best_w_len = w_len
                            if ratio == 1.0:
                                break
                    if best_score == 1.0:
                        break

                if best_match_idx >= 0:
                    start_word = all_words[best_match_idx]
                    end_word = all_words[min(best_match_idx + best_w_len - 1, len(all_words) - 1)]
                    return (start_word["start_ms"], end_word["end_ms"], best_match_idx + best_w_len)
                return (0, 0, -1)

            # 1. Search in local neighbourhood or sequential starting range
            s_ms, e_ms, match_end_idx = search_in_range(start_idx, end_idx)
            if match_end_idx != -1:
                return (s_ms, e_ms, match_end_idx)

            # 2. Sequential fallback: if neighbourhood search failed, try searching the rest of the file from fallback_idx
            if target_ms is not None:
                s_ms, e_ms, match_end_idx = search_in_range(fallback_idx, len(all_words))
                if match_end_idx != -1:
                    return (s_ms, e_ms, match_end_idx)

            # 3. Global fallback: try searching from 0
            if fallback_idx > 0:
                s_ms, e_ms, match_end_idx = search_in_range(0, len(all_words))
                if match_end_idx != -1:
                    return (s_ms, e_ms, match_end_idx)

            # 4. Deep fallback: exact substring match
            flat_cleaned_words = [w["cleaned"] for w in all_words]
            flat_text = " ".join(flat_cleaned_words)
            quote_str = " ".join(quote_words)
            if quote_str in flat_text:
                char_idx = flat_text.find(quote_str)
                word_idx = flat_text[:char_idx].count(" ")
                word_idx = max(0, min(word_idx, len(all_words) - quote_len))
                start_word = all_words[word_idx]
                end_word = all_words[min(word_idx + quote_len - 1, len(all_words) - 1)]
                return (start_word["start_ms"], end_word["end_ms"], word_idx + quote_len)

            return (0, 0, fallback_idx)

        # ---- Process each chapter with targeted fuzzy sequential timestamps ----
        placed: List[Dict] = []
        last_match_idx = 0

        for ch in chapters:
            start_quote = ch.get("startQuote", "")
            end_quote = ch.get("endQuote", "")
            approx_start_ms = ch.get("approximateStartMs")
            approx_end_ms = ch.get("approximateEndMs")

            start_ms, _, start_match_end_idx = _find_quote_timestamps(start_quote, approx_start_ms, last_match_idx) if start_quote else (0, 0, last_match_idx)
            
            # Search after the start of this chapter
            search_after = max(last_match_idx, start_match_end_idx)
            _, end_ms, end_match_end_idx = _find_quote_timestamps(end_quote, approx_end_ms, search_after) if end_quote else (0, 0, search_after)

            if start_ms == 0 and end_ms == 0:
                # If both failed, use approximate values directly as fallback
                if approx_start_ms is not None:
                    start_ms = approx_start_ms
                    end_ms = approx_end_ms if approx_end_ms is not None else approx_start_ms + 60000
                else:
                    logger.warning(f"Chapter '{ch.get('title')}': could not match quotes and no approximate timestamps — skipping")
                    continue

            # Handle defaults if one quote is missing or invalid
            if end_ms == 0 or end_ms <= start_ms:
                if approx_end_ms is not None and approx_end_ms > start_ms:
                    end_ms = approx_end_ms
                else:
                    end_ms = start_ms + 60000  # Default 1 min if no end quote

            # Update the last_match_idx to keep forward progression
            if end_match_end_idx > last_match_idx:
                last_match_idx = end_match_end_idx
            elif start_match_end_idx > last_match_idx:
                last_match_idx = start_match_end_idx

            placed.append({
                "title": ch.get("title", ""),
                "description": ch.get("description", ""),
                "keywords": ch.get("keywords", []),
                "startMs": start_ms,
                "endMs": end_ms,
                "alignedToWords": True,
                "startQuote": start_quote,
                "endQuote": end_quote
            })

            logger.debug(f"Aligned Chapter '{ch['title']}': precise {start_ms}ms → {end_ms}ms")

        # Sort by start time
        placed.sort(key=lambda c: c["startMs"])
        return placed

    def _align_chapters_to_segments_fallback(
        self,
        chapters: List[Dict],
        segments: List[TranscriptSegment]
    ) -> List[Dict]:
        """Fallback segment-level alignment when word data unavailable."""
        return self._align_chapters_to_segments(chapters, segments)
    
    def _align_chapters_to_visuals(
        self, 
        chapters: List[Dict], 
        visual_descriptions: List[Dict]
    ) -> List[Dict]:
        """Align AI-generated chapters to visual scene descriptions for timestamps.
        
        Fallback when no transcript is available. Uses visual scene timestamps.
        """
        if not visual_descriptions or not chapters:
            return chapters
        
        # Parse visual descriptions to extract timestamps
        # Format: "[start_s – end_s] description"
        scenes = []
        for desc in visual_descriptions:
            match = re.match(r"\[(\d+\.?\d*)s\s*–\s*(\d+\.?\d*)s\]\s*(.+)", desc)
            if match:
                start_s = float(match.group(1))
                end_s = float(match.group(2))
                scenes.append({
                    "startMs": int(start_s * 1000),
                    "endMs": int(end_s * 1000),
                    "description": match.group(3)
                })
        
        if not scenes:
            # If parsing fails, distribute evenly across video duration
            total_scenes = len(visual_descriptions)
            # Assume 30 min max if we can't determine duration
            assumed_duration_ms = 30 * 60 * 1000
            scenes = [
                {"startMs": int((i / total_scenes) * assumed_duration_ms), 
                 "endMs": int(((i + 1) / total_scenes) * assumed_duration_ms)}
                for i in range(total_scenes)
            ]
        
        scenes = sorted(scenes, key=lambda s: s["startMs"])
        total_scenes = len(scenes)
        
        aligned = []
        for ch in chapters:
            position = ch.get("position", 5)
            normalized_pos = (position - 1) / 9.0 if position else 0.5
            
            scene_idx = int(normalized_pos * total_scenes)
            scene_idx = max(0, min(scene_idx, total_scenes - 1))
            
            start_idx = max(0, scene_idx - 1)
            end_idx = min(total_scenes - 1, scene_idx + 2)
            
            start_scene = scenes[start_idx]
            end_scene = scenes[end_idx]
            
            aligned_ch = {
                "title": ch.get("title", ""),
                "description": ch.get("description", ""),
                "keywords": ch.get("keywords", []),
                "startMs": start_scene["startMs"],
                "endMs": end_scene["endMs"],
                "alignedToVisual": True
            }
            aligned.append(aligned_ch)
            
            logger.debug(f"Aligned chapter '{ch.get('title')}' to visual: {start_scene['startMs']}ms - {end_scene['endMs']}ms")
        
        return aligned
    
    async def _update_progress(self, asset_id: str, progress: int, stage: str) -> None:
        """Update progress tracking."""
        try:
            # Direct database update for reliability
            import psycopg2
            from datetime import datetime
            
            # Determine status based on progress/stage
            status = "processing"
            error_message = None
            if progress == 100 and stage == "completed":
                status = "completed"
            elif stage.startswith("failed"):
                status = "failed"
                error_message = stage.replace("failed: ", "", 1) if stage.startswith("failed: ") else stage
                stage = "failed"
            elif progress == 0 and stage == "starting":
                status = "processing"
            
            conn = psycopg2.connect(os.getenv("DATABASE_URL"))
            try:
                with conn.cursor() as cursor:
                    cursor.execute(
                        """
                        UPDATE asset_indexing_status
                        SET progress = %s, stage = %s, status = %s, error = %s, "updatedAt" = %s
                        WHERE "assetId" = %s
                        """,
                        (progress, stage, status, error_message, datetime.utcnow(), asset_id)
                    )
                    conn.commit()
                    logger.info(f"Updated progress for {asset_id}: {progress}% ({stage}) [{status}]")
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Progress update failed for {asset_id}: {e}")
