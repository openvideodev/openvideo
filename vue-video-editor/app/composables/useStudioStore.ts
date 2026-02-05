import type { Studio, IClip } from 'openvideo';

interface StudioState {
  studio: Studio | null;
  selectedClips: IClip[];
}

export const useStudioStore = () => {
  const state = useState<StudioState>('studio-store', () => ({
    studio: null,
    selectedClips: [],
  }));

  const setStudio = (studio: Studio | null) => {
    state.value.studio = studio ? markRaw(studio) : null;
  };

  const setSelectedClips = (clips: IClip[]) => {
    state.value.selectedClips = clips;
  };

  return {
    state,
    setStudio,
    setSelectedClips,
  };
};
