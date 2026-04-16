import useLayoutStore from "../store/use-layout-store";
import { AnimationPropertiesPicker } from "./animation-properties-picker";
import CaptionPresetPicker from "./caption-preset-picker";
import ColorAdjustment from "./color-adjustment";

export default function FloatingControl() {
  const { floatingControl } = useLayoutStore();

  if (floatingControl === "caption-preset-picker") {
    return <CaptionPresetPicker />;
  }

  if (floatingControl === "animation-properties-picker") {
    return <AnimationPropertiesPicker />;
  }

  if (floatingControl === "color-adjustment") {
    return <ColorAdjustment />;
  }

  return null;
}
