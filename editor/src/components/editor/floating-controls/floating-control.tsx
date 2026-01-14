import useLayoutStore from "../store/use-layout-store";
import CaptionPresetPicker from "./caption-preset-picker";

export default function FloatingControl() {
  const { floatingControl } = useLayoutStore();
  console.log("floatingControl", floatingControl);

  if (floatingControl === "caption-preset-picker") {
    return <CaptionPresetPicker />;
  }
  return null;
}
