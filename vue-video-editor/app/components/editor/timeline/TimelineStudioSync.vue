<script setup lang="ts">
import { watch, onUnmounted, onMounted } from 'vue';
import { useTimelineStore } from '~/composables/useTimelineStore';
import { useStudioStore } from '~/composables/useStudioStore';
import { usePlaybackStore } from '~/composables/usePlaybackStore';
import { clipToJSON } from 'openvideo';

const props = defineProps<{
  timelineCanvas?: any | null;
}>();

const { state: studioState } = useStudioStore();
const { 
  setTracks, 
  updateClip, 
  updateClips, 
  removeClips,
  state: timelineState 
} = useTimelineStore();
const { 
  setDuration, 
  setCurrentTime, 
  setIsPlaying 
} = usePlaybackStore();

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

  const handleTimeUpdate = ({ currentTime }: any) => {
    setCurrentTime(currentTime / 1_000_000);
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);

  studio.on('clip:added', handleClipAdded);
  studio.on('clip:removed', handleClipRemoved);
  studio.on('clips:removed', handleClipsRemoved);
  studio.on('clip:updated', handleClipUpdated);
  studio.on('track:added', handleTrackAdded);
  studio.on('track:order-changed', handleTrackOrderChanged);
  studio.on('track:removed', handleTrackRemoved);
  studio.on('currentTime', handleTimeUpdate);
  studio.on('play', handlePlay);
  studio.on('pause', handlePause);

  // Initial sync
  setDuration(studio.getMaxDuration() / 1_000_000);
  setCurrentTime(studio.getCurrentTime() / 1_000_000);
  setIsPlaying(studio.getIsPlaying());

  return () => {
    studio.off('clip:added', handleClipAdded);
    studio.off('clip:removed', handleClipRemoved);
    studio.off('clips:removed', handleClipsRemoved);
    studio.off('clip:updated', handleClipUpdated);
    studio.off('track:added', handleTrackAdded);
    studio.off('track:order-changed', handleTrackOrderChanged);
    studio.off('track:removed', handleTrackRemoved);
    studio.off('currentTime', handleTimeUpdate);
    studio.off('play', handlePlay);
    studio.off('pause', handlePause);
  };
};

let cleanupStudio: (() => void) | undefined = undefined;

watch(() => studioState.value.studio, (newStudio) => {
  if (cleanupStudio) cleanupStudio();
  if (newStudio) {
    cleanupStudio = syncStudioToStore(newStudio);
  }
}, { immediate: true });

// Sync Canvas -> Store/Studio
watch(() => props.timelineCanvas, (canvas) => {
  if (!canvas) return;

  const handleClipModified = async (data: any) => {
    updateClip(data.clipId, data);
    const studio = studioState.value.studio;
    if (!studio) return;

    await studio.updateClip(data.clipId, {
      display: { from: data.displayFrom, to: data.displayFrom + data.duration },
      duration: data.duration,
      trim: data.trim,
    });
    setDuration(studio.getMaxDuration() / 1_000_000);
  };

  canvas.on('clip:modified', handleClipModified);
  // ... other events can be added here
}, { immediate: true });

onUnmounted(() => {
  if (cleanupStudio) cleanupStudio();
});
</script>

<template>
  <div v-if="false" />
</template>
