import { MICROSECONDS_PER_SECOND } from '~/types/timeline';
import { loadStudioData } from '../components/editor/timeline/timeline/data';

import { generateUUID } from '~/utils/id';

interface TimelineState {
  _tracks: any[];
  clips: Record<string, any>;
  tracks: any[];
  selectedClipIds: string[];
}

export const useTimelineStore = () => {
  const { tracks: initialTracks, clips: initialClips } = loadStudioData();

  const state = useState<TimelineState>('timeline-store', () => ({
    _tracks: initialTracks,
    clips: initialClips,
    tracks: initialTracks,
    selectedClipIds: [],
  }));

  const setTracks = (tracks: any[]) => {
    state.value._tracks = tracks;
    state.value.tracks = tracks;
  };

  const setClips = (clips: Record<string, any>) => {
    state.value.clips = clips;
  };

  const updateClip = (clipId: string, updates: any) => {
    const clip = state.value.clips[clipId];
    if (!clip) return;

    if (updates.duration !== undefined) {
      clip.duration = updates.duration;
    }

    if (updates.displayFrom !== undefined) {
      clip.display = {
        ...clip.display,
        from: updates.displayFrom,
      };
    }

    if (updates.trim !== undefined) {
      clip.trim = updates.trim;
    }
  };

  const updateClips = (updates: any[]) => {
    updates.forEach((update) => {
      updateClip(update.clipId, update);
    });
  };

  const removeClips = (clipIds: string[]) => {
    const updatedClips = { ...state.value.clips };
    clipIds.forEach((id) => delete updatedClips[id]);
    state.value.clips = updatedClips;

    state.value._tracks = state.value._tracks
      .map((track) => ({
        ...track,
        clipIds: track.clipIds.filter((id: string) => !clipIds.includes(id)),
      }))
      .filter((track) => track.clipIds.length > 0);
    
    state.value.tracks = state.value._tracks;
    state.value.selectedClipIds = state.value.selectedClipIds.filter(
      (id) => !clipIds.includes(id)
    );
  };

  const selectClip = (clipId: string, multi = false) => {
    if (multi) {
      if (state.value.selectedClipIds.includes(clipId)) {
        state.value.selectedClipIds = state.value.selectedClipIds.filter((id) => id !== clipId);
      } else {
        state.value.selectedClipIds.push(clipId);
      }
    } else {
      state.value.selectedClipIds = [clipId];
    }
  };

  const clearSelection = () => {
    state.value.selectedClipIds = [];
  };

  const getClip = (id: string) => state.value.clips[id];

  const getTotalDuration = () => {
    let maxTime = 0;
    Object.values(state.value.clips).forEach((clip) => {
      const endTime = (clip.display.from + clip.duration) / MICROSECONDS_PER_SECOND;
      if (endTime > maxTime) maxTime = endTime;
    });
    return maxTime;
  };

  const addTrack = (type: string, index?: number) => {
    const newTrack = {
      id: generateUUID(),
      name: `${type} Track`,
      type,
      clipIds: [],
      muted: false,
    };
    if (typeof index === 'number') {
      state.value._tracks.splice(index, 0, newTrack);
    } else {
      state.value._tracks.unshift(newTrack);
    }
    state.value.tracks = state.value._tracks;
    return newTrack.id;
  };

  const moveTrack = (trackId: string, newIndex: number) => {
    const currentIndex = state.value._tracks.findIndex((t) => t.id === trackId);
    if (currentIndex === -1) return;

    const [track] = state.value._tracks.splice(currentIndex, 1);
    state.value._tracks.splice(newIndex, 0, track);
    state.value.tracks = state.value._tracks;
  };

  return {
    state,
    setTracks,
    setClips,
    updateClip,
    updateClips,
    removeClips,
    selectClip,
    clearSelection,
    getClip,
    getTotalDuration,
    addTrack,
    moveTrack,
  };
};
