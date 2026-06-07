"""Audio transcription implementation using Deepgram."""

import os
from typing import List, Dict, Any, Optional
import httpx
from dotenv import load_dotenv

from ..core.interfaces import AudioTranscriber, TranscriptSegment
from ..core.exceptions import TranscriptionError

load_dotenv()


class DeepgramTranscriber(AudioTranscriber):
    """Audio transcriber using Deepgram API."""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("DEEPGRAM_API_KEY")
        if not self.api_key:
            raise TranscriptionError("DEEPGRAM_API_KEY not configured")
        
        self.base_url = "https://api.deepgram.com/v1/listen"
    
    async def transcribe(self, audio_source: str) -> List[TranscriptSegment]:
        """Transcribe audio from file or URL."""
        try:
            # Prepare request
            params = {
                "model": "nova-3",
                "smart_format": "true",
                "paragraphs": "true",
                "utterances": "true"
            }
            
            headers = {
                "Authorization": f"Token {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {"url": audio_source}
            
            # Make request
            async with httpx.AsyncClient(timeout=300) as client:
                response = await client.post(
                    self.base_url,
                    params=params,
                    headers=headers,
                    json=payload
                )
                response.raise_for_status()
                
                data = response.json()
                return self._parse_transcript_response(data)
                
        except httpx.HTTPStatusError as e:
            raise TranscriptionError(f"Deepgram API error: {e.response.status_code} - {e.response.text}")
        except httpx.RequestError as e:
            raise TranscriptionError(f"Network error: {str(e)}")
        except Exception as e:
            raise TranscriptionError(f"Transcription failed: {str(e)}")
    
    def _parse_transcript_response(self, data: Dict[str, Any]) -> List[TranscriptSegment]:
        """Parse Deepgram response into transcript segments."""
        segments = []
        
        try:
            results = data.get("results", {})
            channels = results.get("channels", [])
            
            if not channels:
                return segments
            
            channel = channels[0]
            alternatives = channel.get("alternatives", [])
            
            if not alternatives:
                return segments
            
            alternative = alternatives[0]
            paragraphs = alternative.get("paragraphs", {}).get("paragraphs", [])
            all_words = alternative.get("words", [])
            
            if paragraphs:
                # Use paragraph-level segments
                for paragraph in paragraphs:
                    sentences = paragraph.get("sentences", [])
                    text = " ".join([s.get("text", "") for s in sentences])
                    
                    if text.strip():
                        start_ms = int(paragraph.get("start", 0) * 1000)
                        end_ms = int(paragraph.get("end", 0) * 1000)
                        
                        # Extract word-level timestamps for this paragraph
                        paragraph_words = [
                            {
                                "word": w.get("word", ""),
                                "punctuated_word": w.get("punctuated_word", w.get("word", "")),
                                "start_ms": int(w.get("start", 0) * 1000),
                                "end_ms": int(w.get("end", 0) * 1000),
                                "startMs": int(w.get("start", 0) * 1000),
                                "endMs": int(w.get("end", 0) * 1000)
                            }
                            for w in all_words
                            if w.get("start", 0) >= paragraph.get("start", 0) 
                            and w.get("end", 0) <= paragraph.get("end", 0) + 0.1
                        ]
                        
                        segments.append(TranscriptSegment(
                            text=text,
                            start_ms=start_ms,
                            end_ms=end_ms,
                            words=paragraph_words
                        ))
            else:
                # Fallback: create segments from word timestamps
                if all_words:
                    segments = self._create_segments_from_words(all_words)
            
            return segments
            
        except Exception as e:
            raise TranscriptionError(f"Failed to parse transcript response: {str(e)}")
    
    def _create_segments_from_words(self, words: List[Dict[str, Any]]) -> List[TranscriptSegment]:
        """Create transcript segments from word timestamps aligning with sentences."""
        segments = []
        
        if not words:
            return segments
        
        LONG_PAUSE_THRESHOLD_S = 1.2
        EMERGENCY_MAX_WORDS = 40
        
        chunk_words = []
        chunk_start = words[0].get("start", 0)
        prev_end = words[0].get("end", 0)
        
        def is_sentence_end(w: Dict[str, Any]) -> bool:
            pw = w.get("punctuated_word", w.get("word", ""))
            return any(pw.endswith(char) for char in (".", "!", "?"))
            
        for i, word in enumerate(words):
            gap = i > 0 and word.get("start", 0) - prev_end or 0
            
            # Flush when:
            # 1. Punctuation sentence end
            # 2. Long pause (> 1.2s)
            # 3. Emergency cap
            sentence_end = chunk_words and is_sentence_end(chunk_words[-1])
            long_pause = gap > LONG_PAUSE_THRESHOLD_S
            emergency_cap = len(chunk_words) >= EMERGENCY_MAX_WORDS
            
            should_split = chunk_words and (sentence_end or long_pause or emergency_cap)
            
            if should_split:
                text = " ".join([w.get("punctuated_word", w.get("word", "")) for w in chunk_words])
                segments.append(TranscriptSegment(
                    text=text,
                    start_ms=int(chunk_start * 1000),
                    end_ms=int(prev_end * 1000),
                    words=[
                        {
                            "word": w.get("word", ""),
                            "punctuated_word": w.get("punctuated_word", w.get("word", "")),
                            "start_ms": int(w.get("start", 0) * 1000),
                            "end_ms": int(w.get("end", 0) * 1000),
                            "startMs": int(w.get("start", 0) * 1000),
                            "endMs": int(w.get("end", 0) * 1000)
                        }
                        for w in chunk_words
                    ]
                ))
                
                chunk_words = []
                chunk_start = word.get("start", 0)
            
            chunk_words.append(word)
            prev_end = word.get("end", 0)
        
        # Add final segment
        if chunk_words:
            text = " ".join([w.get("punctuated_word", w.get("word", "")) for w in chunk_words])
            segments.append(TranscriptSegment(
                text=text,
                start_ms=int(chunk_start * 1000),
                end_ms=int(prev_end * 1000),
                words=[
                    {
                        "word": w.get("word", ""),
                        "punctuated_word": w.get("punctuated_word", w.get("word", "")),
                        "start_ms": int(w.get("start", 0) * 1000),
                        "end_ms": int(w.get("end", 0) * 1000),
                        "startMs": int(w.get("start", 0) * 1000),
                        "endMs": int(w.get("end", 0) * 1000)
                    }
                    for w in chunk_words
                ]
            ))
        
        return segments
