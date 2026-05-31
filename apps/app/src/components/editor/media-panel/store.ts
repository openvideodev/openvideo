import { Icons } from "@/components/shared/icons";
import {
  IconLetterT,
  IconSubtitles,
  IconPhoto,
  type IconProps,
  IconSparkle2,
} from "@tabler/icons-react";
import { ShapesIcon } from "lucide-react";
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
    icon: IconLetterT,
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
    icon: ShapesIcon,
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
}

export const useMediaPanelStore = create<MediaPanelStore>((set) => ({
  activeTab: "assets",
  setActiveTab: (tab) => set({ activeTab: tab, showProperties: false }),
  highlightMediaId: null,
  requestRevealMedia: (mediaId) =>
    set({
      activeTab: "assets",
      highlightMediaId: mediaId,
      showProperties: false,
    }),
  clearHighlight: () => set({ highlightMediaId: null }),
  showProperties: false,
  setShowProperties: (show) => set({ showProperties: show }),
}));
