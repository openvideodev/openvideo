<script setup lang="ts">
import { watch, onUnmounted } from 'vue';
import { useTimelineStore } from '~/composables/useTimelineStore';
import { useStudioStore } from '~/composables/useStudioStore';
import { usePlaybackStore } from '~/composables/usePlaybackStore';
import { clipToJSON } from 'openvideo';
import { generateUUID } from '~/utils/id';
import type { ITimelineTrack, TrackType } from '~/types/timeline';

const props = defineProps<{
  timelineCanvas?: any | null;
}>();

const { state: studioState } = useStudioStore();
const { 
  setTracks, 
  updateClip, 
  updateClips, 
  removeClips,
  setClips,
  state: timelineState 
} = useTimelineStore();
const { 
  setDuration, 
  setCurrentTime, 
  setIsPlaying 
} = usePlaybackStore();

// ============================================================================
// SYNC: Studio -> Store
// When Studio emits events (e.g. from MediaPanel adding clips), update Store
// ============================================================================
const syncStudioToStore = (studio: any) => {
  if (!studio) return;

  const handleClipAdded = ({ clip, trackId }: any) => {
    setDuration(studio.getMaxDuration() / 1_000_000);
    
    if (timelineState.value.clips[clip.id]) return;

    const serializedClip = clipToJSON(clip);
    timelineState.value.clips[clip.id] = {
      ...serializedClip,
      id: serializedClip.id || clip.id,
      sourceDuration: clip.meta?.duration || clip.duration,
    };

    const track = timelineState.value._tracks.find((t) => t.id === trackId);
    if (track && !track.clipIds.includes(clip.id)) {
      track.clipIds.push(clip.id);
    }
  };

  const handleClipsAdded = ({ clips, trackId }: any) => {
    if (studio) {
      setDuration(studio.getMaxDuration() / 1_000_000);
    }

    const newClipsMap = { ...timelineState.value.clips };
    const clipsToAdd: string[] = [];

    clips.forEach((clip: any) => {
      if (!newClipsMap[clip.id]) {
        const serializedClip = clipToJSON(clip);
        newClipsMap[clip.id] = {
          ...serializedClip,
          id: serializedClip.id || clip.id,
          sourceDuration: clip.meta?.duration || clip.duration,
        };
        clipsToAdd.push(clip.id);
      }
    });

    if (clipsToAdd.length === 0) return;

    timelineState.value.clips = newClipsMap;

    // Update track
    timelineState.value._tracks = timelineState.value._tracks.map((t) => {
      if (t.id === trackId) {
        const uniqueNewIds = clipsToAdd.filter((id) => !t.clipIds.includes(id));
        if (uniqueNewIds.length > 0) {
          return { ...t, clipIds: [...t.clipIds, ...uniqueNewIds] };
        }
      }
      return t;
    });
  };

  const handleClipRemoved = ({ clipId }: any) => {
    setDuration(studio.getMaxDuration() / 1_000_000);
    delete timelineState.value.clips[clipId];
    timelineState.value._tracks.forEach((t) => {
      t.clipIds = t.clipIds.filter((id: string) => id !== clipId);
    });
  };

  const handleClipsRemoved = ({ clipIds }: any) => {
    setDuration(studio.getMaxDuration() / 1_000_000);
    clipIds.forEach((id: string) => delete timelineState.value.clips[id]);
    timelineState.value._tracks.forEach((t) => {
      t.clipIds = t.clipIds.filter((id: string) => !clipIds.includes(id));
    });
  };

  const handleTrackAdded = ({ track, index }: any) => {
    if (timelineState.value._tracks.find((t) => t.id === track.id)) return;
    if (typeof index === 'number') {
      timelineState.value._tracks.splice(index, 0, track);
    } else {
      timelineState.value._tracks.unshift(track);
    }
  };

  const handleTrackOrderChanged = ({ tracks }: any) => {
    timelineState.value._tracks = tracks;
    timelineState.value.tracks = tracks;
  };

  const handleTrackRemoved = ({ trackId }: any) => {
    timelineState.value._tracks = timelineState.value._tracks.filter((t) => t.id !== trackId);
    timelineState.value.tracks = timelineState.value.tracks.filter((t) => t.id !== trackId);
  };

  const handleClipUpdated = ({ clip }: any) => {
    setDuration(studio.getMaxDuration() / 1_000_000);
    const existing = timelineState.value.clips[clip.id];
    if (!existing) return;

    const serializedClip = clipToJSON(clip);
    timelineState.value.clips[clip.id] = {
      ...existing,
      ...serializedClip,
      id: serializedClip.id || clip.id,
      display: { ...serializedClip.display },
      trim: serializedClip.trim ? { ...serializedClip.trim } : undefined,
    };
  };

  const handleClipReplaced = ({ newClip }: any) => {
    if (!timelineState.value.clips[newClip.id]) return;

    const serializedClip = clipToJSON(newClip);
    timelineState.value.clips[newClip.id] = {
      ...timelineState.value.clips[newClip.id],
      ...serializedClip,
      id: serializedClip.id || newClip.id,
      display: { ...serializedClip.display },
      trim: serializedClip.trim ? { ...serializedClip.trim } : undefined,
      sourceDuration: newClip.meta?.duration || newClip.duration,
    };
  };

  const handleStudioRestored = ({ clips, tracks }: any) => {
    // 1. Sync Duration
    if (studio) {
      setDuration(studio.getMaxDuration() / 1_000_000);
      setCurrentTime(0);
      setIsPlaying(false);
    }

    // 2. Map clips to store format
    const newClipsMap: Record<string, any> = {};
    clips.forEach((c: any) => {
      const serialized = clipToJSON(c);
      newClipsMap[c.id] = {
        ...serialized,
        id: serialized.id || c.id,
        sourceDuration: c.meta?.duration || c.duration,
      };
    });

    // 3. Update Store fully
    timelineState.value.clips = newClipsMap;
    timelineState.value._tracks = tracks;
    timelineState.value.tracks = tracks;
  };

  const handleStudioReset = () => {
    setTracks([]);
    setClips({});
  };

  // Playback Sync Events
  const handleTimeUpdate = ({ currentTime }: any) => {
    setCurrentTime(currentTime / 1_000_000);
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);

  // Register all Studio event listeners
  studio.on('clip:added', handleClipAdded);
  studio.on('clips:added', handleClipsAdded);
  studio.on('clip:removed', handleClipRemoved);
  studio.on('clips:removed', handleClipsRemoved);
  studio.on('clip:updated', handleClipUpdated);
  studio.on('clip:replaced', handleClipReplaced);
  studio.on('track:added', handleTrackAdded);
  studio.on('track:order-changed', handleTrackOrderChanged);
  studio.on('track:removed', handleTrackRemoved);
  studio.on('studio:restored', handleStudioRestored);
  studio.on('reset', handleStudioReset);
  studio.on('currentTime', handleTimeUpdate);
  studio.on('play', handlePlay);
  studio.on('pause', handlePause);

  // Initial sync
  setDuration(studio.getMaxDuration() / 1_000_000);
  setCurrentTime(studio.getCurrentTime() / 1_000_000);
  setIsPlaying(studio.getIsPlaying());

  return () => {
    studio.off('clip:added', handleClipAdded);
    studio.off('clips:added', handleClipsAdded);
    studio.off('clip:removed', handleClipRemoved);
    studio.off('clips:removed', handleClipsRemoved);
    studio.off('clip:updated', handleClipUpdated);
    studio.off('clip:replaced', handleClipReplaced);
    studio.off('track:added', handleTrackAdded);
    studio.off('track:order-changed', handleTrackOrderChanged);
    studio.off('track:removed', handleTrackRemoved);
    studio.off('studio:restored', handleStudioRestored);
    studio.off('reset', handleStudioReset);
    studio.off('currentTime', handleTimeUpdate);
    studio.off('play', handlePlay);
    studio.off('pause', handlePause);
  };
};

// ============================================================================
// SYNC: TimelineCanvas -> Store/Studio
// When clips are modified/moved in the timeline canvas, update the store and studio
// ============================================================================
const syncTimelineCanvasToStoreAndStudio = (canvas: any) => {
  if (!canvas) return;

  const handleClipModified = async (data: any) => {
    const { clipId, displayFrom, duration, trim } = data;
    
    // Update Store
    updateClip(clipId, { displayFrom, duration, trim });

    const studio = studioState.value.studio;
    if (!studio) return;

    // Update Studio
    const displayTo = displayFrom + duration;
    const display = { from: displayFrom, to: displayTo };

    await studio.updateClip(clipId, {
      display,
      duration,
      trim,
    });

    setDuration(studio.getMaxDuration() / 1_000_000);
  };

  const handleClipsModified = async ({ clips }: any) => {
    // Update Store
    updateClips(clips);

    const studio = studioState.value.studio;
    if (!studio) return;

    // Update Studio for each clip
    await Promise.all(
      clips.map(async (clip: any) => {
        const updates: any = {};

        const displayFromUs = clip.displayFrom;
        const durationUs = clip.duration;

        if (displayFromUs !== undefined) {
          const storeClip = timelineState.value.clips[clip.clipId];
          const currentDuration = durationUs ?? storeClip?.duration ?? 0;
          const displayToUs = displayFromUs + currentDuration;

          updates.display = {
            from: displayFromUs,
            to: displayToUs,
          };
        }
        if (durationUs !== undefined) {
          updates.duration = durationUs;
        }
        if (clip.trim !== undefined) {
          updates.trim = clip.trim;
        }
        await studio.updateClip(clip.clipId, updates);
      })
    );

    setDuration(studio.getMaxDuration() / 1_000_000);
  };

  const handleClipMovedToTrack = ({ clipId, trackId }: any) => {
    // Remove clip from all tracks
    const updatedTracks = timelineState.value._tracks.map((track) => ({
      ...track,
      clipIds: track.clipIds.filter((id) => id !== clipId),
    }));

    // Add clip to target track
    const finalTracks = updatedTracks.map((track) => {
      if (track.id === trackId && !track.clipIds.includes(clipId)) {
        return {
          ...track,
          clipIds: [...track.clipIds, clipId],
        };
      }
      return track;
    });

    const filteredTracks = finalTracks.filter((t) => t.clipIds.length > 0);

    timelineState.value._tracks = filteredTracks;
    timelineState.value.tracks = filteredTracks;

    // Update studio
    const studio = studioState.value.studio;
    if (studio) {
      studio.setTracks(filteredTracks);
    }
  };

  const handleClipMovedToNewTrack = ({ clipId, targetIndex }: any) => {
    const clip = timelineState.value.clips[clipId];
    if (!clip) return;

    const newTrackId = generateUUID();
    let newTrackType: TrackType = 'Video';
    if (clip.type === 'Audio') newTrackType = 'Audio';
    else if (clip.type === 'Text' || clip.type === 'Caption')
      newTrackType = 'Text';
    else if (clip.type === 'Effect') newTrackType = 'Effect';
    else if (clip.type === 'Video' || clip.type === 'Image')
      newTrackType = 'Video';

    const newTrack: ITimelineTrack = {
      id: newTrackId,
      type: newTrackType,
      name: `${newTrackType} Track`,
      clipIds: [clipId],
      muted: false,
    };

    // 1. Remove from all existing tracks and filter empty ones
    const filteredTracks = timelineState.value._tracks
      .map((t) => ({
        ...t,
        clipIds: t.clipIds.filter((id) => id !== clipId),
      }))
      .filter((t) => t.clipIds.length > 0);

    // 2. Insert new track at targetIndex
    const updatedTracks = [...filteredTracks];
    updatedTracks.splice(targetIndex, 0, newTrack);

    timelineState.value._tracks = updatedTracks;
    timelineState.value.tracks = updatedTracks;

    const studio = studioState.value.studio;
    if (studio) {
      studio.setTracks(updatedTracks);
    }
  };

  const handleTimelineUpdated = ({ tracks }: any) => {
    // 1. Update Store
    setTracks(tracks);

    // 2. Update Studio
    const studio = studioState.value.studio;
    if (studio) {
      studio.setTracks(tracks);
    }
  };

  const handleClipsRemoved = async ({ clipIds }: any) => {
    // 1. Update Store
    removeClips(clipIds);

    // 2. Update Studio
    const studio = studioState.value.studio;
    if (!studio) return;

    await studio.removeClipsById(clipIds);
  };

  const handleSelectionDelete = async () => {
    const studio = studioState.value.studio;
    if (!studio) return;
    await studio.deleteSelected();
  };

  const handleSelectionDuplicated = async () => {
    const studio = studioState.value.studio;
    if (!studio) return;
    await studio.duplicateSelected();
  };

  const handleSelectionSplit = async ({ splitTime }: any) => {
    const studio = studioState.value.studio;
    if (!studio) return;
    await studio.splitSelected(splitTime);
  };

  const handleTransitionAdd = async ({ fromClipId, toClipId }: any) => {
    const studio = studioState.value.studio;
    if (!studio) return;
    
    const fromClip = studio.timeline.getClipById(fromClipId);
    const toClip = studio.timeline.getClipById(toClipId);

    const minDuration = Math.min(
      fromClip?.duration ?? Infinity,
      toClip?.duration ?? Infinity
    );

    const duration =
      minDuration === Infinity ? 2_000_000 : minDuration * 0.25;

    await studio.addTransition('GridFlip', duration, fromClipId, toClipId);
  };

  // Register all TimelineCanvas event listeners
  canvas.on('clip:modified', handleClipModified);
  canvas.on('clips:modified', handleClipsModified);
  canvas.on('clip:movedToTrack', handleClipMovedToTrack);
  canvas.on('clip:movedToNewTrack', handleClipMovedToNewTrack);
  canvas.on('timeline:updated', handleTimelineUpdated);
  canvas.on('clips:removed', handleClipsRemoved);
  canvas.on('selection:delete', handleSelectionDelete);
  canvas.on('selection:duplicated', handleSelectionDuplicated);
  canvas.on('selection:split', handleSelectionSplit);
  canvas.on('transition:add', handleTransitionAdd);

  return () => {
    canvas.off('clip:modified', handleClipModified);
    canvas.off('clips:modified', handleClipsModified);
    canvas.off('clip:movedToTrack', handleClipMovedToTrack);
    canvas.off('clip:movedToNewTrack', handleClipMovedToNewTrack);
    canvas.off('timeline:updated', handleTimelineUpdated);
    canvas.off('clips:removed', handleClipsRemoved);
    canvas.off('selection:delete', handleSelectionDelete);
    canvas.off('selection:duplicated', handleSelectionDuplicated);
    canvas.off('selection:split', handleSelectionSplit);
    canvas.off('transition:add', handleTransitionAdd);
  };
};

// ============================================================================
// SYNC: Store -> Studio
// Render/Playback engine needs to know about track structure
// ============================================================================
const syncStoreToStudio = (studio: any, tracks: ITimelineTrack[]) => {
  if (!studio) return;

  // Only set if they actually differ to avoid infinite loops
  const studioTracks = studio.getTracks();
  const storeTracksJson = JSON.stringify(tracks);
  const studioTracksJson = JSON.stringify(studioTracks);

  if (storeTracksJson !== studioTracksJson) {
    studio.setTracks(tracks);
  }
};

// ============================================================================
// SYNC: Selection (Bidirectional)
// Keep selection in sync between Studio and TimelineCanvas
// ============================================================================
const syncSelection = (studio: any, canvas: any) => {
  if (!studio || !canvas) return;

  // Studio -> Timeline
  const handleStudioSelection = ({ selected }: any) => {
    const ids = selected.map((c: any) => c.id);
    canvas.selectClips(ids);
  };

  const handleStudioSelectionCleared = () => {
    canvas.selectClips([]);
  };

  // Timeline -> Studio
  const handleTimelineSelection = ({ selectedIds }: any) => {
    studio.selectClipsByIds(selectedIds);
  };

  studio.on('selection:created', handleStudioSelection);
  studio.on('selection:updated', handleStudioSelection);
  studio.on('selection:cleared', handleStudioSelectionCleared);

  canvas.on('selection:changed', handleTimelineSelection);

  return () => {
    studio.off('selection:created', handleStudioSelection);
    studio.off('selection:updated', handleStudioSelection);
    studio.off('selection:cleared', handleStudioSelectionCleared);

    canvas.off('selection:changed', handleTimelineSelection);
  };
};

// ============================================================================
// Setup Watchers
// ============================================================================
let cleanupStudio: (() => void) | undefined = undefined;
let cleanupCanvas: (() => void) | undefined = undefined;
let cleanupSelection: (() => void) | undefined = undefined;

// Watch for studio changes
watch(() => studioState.value.studio, (newStudio) => {
  if (cleanupStudio) cleanupStudio();
  if (newStudio) {
    cleanupStudio = syncStudioToStore(newStudio);
  }
}, { immediate: true });

// Watch for timeline canvas changes
watch(() => props.timelineCanvas, (newCanvas) => {
  if (cleanupCanvas) cleanupCanvas();
  if (newCanvas) {
    cleanupCanvas = syncTimelineCanvasToStoreAndStudio(newCanvas);
  }
}, { immediate: true });

// Watch for both studio and canvas to sync selection
watch([() => studioState.value.studio, () => props.timelineCanvas], ([newStudio, newCanvas]) => {
  if (cleanupSelection) cleanupSelection();
  if (newStudio && newCanvas) {
    cleanupSelection = syncSelection(newStudio, newCanvas);
  }
}, { immediate: true });

// Watch tracks to sync Store -> Studio
watch(() => timelineState.value.tracks, (newTracks) => {
  const studio = studioState.value.studio;
  if (studio && newTracks) {
    syncStoreToStudio(studio, newTracks);
  }
});

onUnmounted(() => {
  if (cleanupStudio) cleanupStudio();
  if (cleanupCanvas) cleanupCanvas();
  if (cleanupSelection) cleanupSelection();
});
</script>

<template>
  <div v-if="false" />
</template>
