"""Scene detection implementation using ffmpeg."""

import os
import shutil
import json
import subprocess
from typing import List, Optional
import tempfile

from ..core.interfaces import SceneDetector, Scene
from ..core.exceptions import SceneDetectionError


class FFmpegSceneDetector(SceneDetector):
    """Scene detector using ffmpeg's scene detection filter."""
    
    def __init__(self, ffmpeg_path: str = "ffmpeg"):
        self.ffmpeg_path = ffmpeg_path
    
    async def detect_scenes(
        self, 
        video_path: str, 
        threshold: float = 0.3,
        min_scene_duration: float = 2.0,
        max_scene_duration: float = 300.0,
        max_scenes: int = 50
    ) -> List[Scene]:
        """Detect scenes in video file using ffmpeg."""
        try:
            # Create temp file for scene data
            temp_dir = tempfile.mkdtemp(prefix="scene_detection_")
            scenes_file = os.path.join(temp_dir, "scenes.txt")
            
            # Build ffmpeg command for scene detection
            cmd = [
                self.ffmpeg_path,
                "-i", video_path,
                "-vf", f"select='gt(scene,{threshold})+gt(scene,{threshold})',showinfo",
                "-f", "null",
                "-"
            ]
            
            # Run ffmpeg and capture output
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=600  # 10 minute timeout
            )
            
            if result.returncode != 0:
                raise SceneDetectionError(f"ffmpeg failed: {result.stderr}")
            
            # Parse scene changes from stderr
            scenes = self._parse_scene_changes(result.stderr, min_scene_duration, max_scene_duration)
            
            # Limit number of scenes
            if len(scenes) > max_scenes:
                scenes = scenes[:max_scenes]
            
            # Cleanup
            shutil.rmtree(temp_dir, ignore_errors=True)
            
            return scenes
            
        except subprocess.TimeoutExpired:
            raise SceneDetectionError("Scene detection timed out")
        except Exception as e:
            raise SceneDetectionError(f"Scene detection failed: {str(e)}")
    
    def _parse_scene_changes(
        self, 
        ffmpeg_output: str, 
        min_duration: float, 
        max_duration: float
    ) -> List[Scene]:
        """Parse scene change timestamps from ffmpeg output."""
        scene_times = []
        
        for line in ffmpeg_output.split('\n'):
            if 'pts_time:' in line:
                try:
                    # Extract timestamp
                    pts_start = line.find('pts_time:') + 9
                    pts_end = line.find(' ', pts_start)
                    timestamp = float(line[pts_start:pts_end])
                    scene_times.append(timestamp)
                except (ValueError, IndexError):
                    continue
        
        # Convert timestamps to scenes
        if not scene_times:
            # No scene changes detected, return single scene
            return [Scene(start_time=0.0, end_time=999999.0)]
        
        scenes = []
        prev_time = 0.0
        
        for i, scene_time in enumerate(scene_times):
            if i == len(scene_times) - 1:
                # Last scene
                end_time = 999999.0  # Will be updated later with video duration
            else:
                end_time = scene_times[i + 1]
            
            duration = end_time - prev_time
            
            # Apply duration filters
            if duration >= min_duration and duration <= max_duration:
                scenes.append(Scene(start_time=prev_time, end_time=end_time))
                prev_time = scene_time
        
        return scenes
