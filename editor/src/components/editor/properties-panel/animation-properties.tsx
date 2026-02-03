import * as React from "react";
import { IClip } from "openvideo";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import useLayoutStore from "../store/use-layout-store";

interface AnimationPropertiesProps {
  clip: IClip;
}

const ANIMATION_TYPES = [
  { value: "none", label: "None" },
  { value: "slideIn", label: "Slide In" },
];

export function AnimationProperties({ clip }: AnimationPropertiesProps) {
  const [, setTick] = React.useState(0);
  const { setFloatingControl, floatingControl } = useLayoutStore();

  React.useEffect(() => {
    const onPropsChange = () => setTick((t) => t + 1);
    clip.on("propsChange", onPropsChange);
    return () => {
      clip.off("propsChange", onPropsChange);
    };
  }, [clip]);

  // Helper to get/set first animation
  const animation = clip.animations?.[0];
  const type = animation?.type || "none";
  const typeLabel =
    ANIMATION_TYPES.find((t) => t.value === type)?.label || type;

  const isActive = floatingControl === "animation-properties-picker";

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Animation
      </label>
      <div className="relative w-full">
        <Button
          className="flex w-full items-center justify-between text-sm border bg-input/30 h-9"
          variant={isActive ? "secondary" : "secondary"}
          size="sm"
          onClick={() => setFloatingControl("animation-properties-picker")}
        >
          <div className="w-full text-left">
            <p className="truncate">{typeLabel}</p>
          </div>
          <ChevronDown className="text-muted-foreground" size={14} />
        </Button>
      </div>
    </div>
  );
}
