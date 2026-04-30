import { classRegistry, FabricObject } from "fabric";
import { IClip } from "../types";
import { timeUsToUnits } from "./timeline";

export const loadObject = (
  item: IClip,
  options: { tScale: number; sizesMap: Record<string, number> }
) => {
  const display = item.display!;
  const left = timeUsToUnits(display.from, options.tScale);
  const width = timeUsToUnits(
    display.to - display.from,
    options.tScale,
    item.playbackRate
  );
  const height = options.sizesMap[item.type.toLowerCase()] || 42;

  // Convert type to PascalCase for class name
  const typeName = item.type.charAt(0).toUpperCase() + item.type.slice(1);
  const Klass = classRegistry.getClass(typeName);
  const itemAny = item as unknown as Record<string, unknown>;

  const baseObject = {
    width,
    height,
    id: item.id,
    tScale: options.tScale,
    top: 10,
    left,
    display,
    duration: item.duration || display.to - display.from,
    metadata: item.metadata,
    playbackRate: item.playbackRate || 1,
    src: itemAny.src,
    trim: item.trim || {
      from: 0,
      to: item.duration || display.to - display.from
    },
    text: itemAny.text,
    srcs: (itemAny.srcs as string[]) || [],
    backgroundColorDiv: itemAny.backgroundColor,
    svgString: itemAny.svgString,
    preview: itemAny.preview
  };

  // Default case for all types
  return new (Klass as new (options: typeof baseObject) => FabricObject)(baseObject);
};

