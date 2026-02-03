import useLayoutStore from "../store/use-layout-store";
import CaptionPresetPicker from "./caption-preset-picker";
import AnimationPropertiesPicker from "./animation-properties-picker";

export default function FloatingControl() {
  const { floatingControl } = useLayoutStore();

  if (floatingControl === "caption-preset-picker") {
    return <CaptionPresetPicker />;
  }

  if (floatingControl === "animation-properties-picker") {
    return <AnimationPropertiesPicker />;
  }
  return null;
}
