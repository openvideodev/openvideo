import { Icons } from "@/components/shared/icons";
import {
  IconLetterT,
  IconSubtitles,
  IconPhoto,
  type IconProps,
  IconSparkle2,
  IconCircleSquare,
  IconSquareLetterT,
} from "@tabler/icons-react";
import { create } from "zustand";

export type Tab = "assets" | "text" | "captions" | "effects" | "transitions" | "elements";

export const tabs: {
  [key in Tab]: { icon: React.FC<IconProps> | React.FC<any>; label: string };
} = {
  assets: {
    icon: IconPhoto,
    label: "Assets",
  },
  text: {
    icon: IconSquareLetterT,
    label: "Text",
  },
  captions: {
    icon: IconSubtitles,
    label: "Captions",
  },
  transitions: {
    icon: Icons.transition,
    label: "Transitions",
  },
  effects: {
    icon: IconSparkle2,
    label: "Effects",
  },
  elements: {
    icon: IconCircleSquare,
    label: "Elements",
  },
};

interface MediaPanelStore {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  highlightMediaId: string | null;
  requestRevealMedia: (mediaId: string) => void;
  clearHighlight: () => void;
  showProperties: boolean;
  setShowProperties: (show: boolean) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  showLabels: boolean;
  setShowLabels: (show: boolean) => void;
}

export const useMediaPanelStore = create<MediaPanelStore>((set) => ({
  activeTab: "assets",
  setActiveTab: (tab) => set({ activeTab: tab, showProperties: false, isOpen: true }),
  highlightMediaId: null,
  requestRevealMedia: (mediaId) =>
    set({
      activeTab: "assets",
      highlightMediaId: mediaId,
      showProperties: false,
      isOpen: true,
    }),
  clearHighlight: () => set({ highlightMediaId: null }),
  showProperties: false,
  setShowProperties: (show) => set({ showProperties: show }),
  isOpen: false,
  setIsOpen: (open) => set({ isOpen: open }),
  showLabels: false,
  setShowLabels: (show) => set({ showLabels: show }),
}));
