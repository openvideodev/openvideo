import { usePlaybackStore } from "@/stores/playback-store";

export const useCurrentPlayerFrame = (
  _ref: React.RefObject<any> | null
) => {
  const currentTime = usePlaybackStore((state) => state.currentTime);
  return currentTime;
};
