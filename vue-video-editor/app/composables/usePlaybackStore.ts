import { useStudioStore } from './useStudioStore';

interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  previousVolume: number;
  speed: number;
}

export const usePlaybackStore = () => {
  const state = useState<PlaybackState>('playback-store', () => ({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    muted: false,
    previousVolume: 1,
    speed: 1.0,
  }));

  const { state: studioState } = useStudioStore();

  const play = async () => {
    const studio = studioState.value.studio;
    if (!studio) return;
    await studio.play();
    state.value.isPlaying = true;
  };

  const pause = () => {
    const studio = studioState.value.studio;
    if (!studio) return;
    studio.pause();
    state.value.isPlaying = false;
  };

  const toggle = () => {
    if (state.value.isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const seek = (time: number) => {
    const studio = studioState.value.studio;
    const duration = state.value.duration;
    // Clamp time
    const clampedTime = Math.max(0, Math.min(duration, time));

    if (studio) {
      // Convert seconds to microseconds
      studio.seek(clampedTime * 1_000_000);
    }

    // Optimistic update
    state.value.currentTime = clampedTime;
  };

  const setVolume = (volume: number) => {
    const v = Math.max(0, Math.min(1, volume));
    state.value.volume = v;
    state.value.muted = v === 0;
    if (v > 0) state.value.previousVolume = v;
  };

  const setSpeed = (speed: number) => {
    const newSpeed = Math.max(0.1, Math.min(2.0, speed));
    state.value.speed = newSpeed;
    // TODO: Sync speed to Studio if supported
  };

  const setDuration = (duration: number) => {
    state.value.duration = duration;
  };

  const setCurrentTime = (time: number) => {
    state.value.currentTime = time;
  };

  const setIsPlaying = (isPlaying: boolean) => {
    state.value.isPlaying = isPlaying;
  };

  return {
    state,
    play,
    pause,
    toggle,
    seek,
    setVolume,
    setSpeed,
    setDuration,
    setCurrentTime,
    setIsPlaying,
  };
};
