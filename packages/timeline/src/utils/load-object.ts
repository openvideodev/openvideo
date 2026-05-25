import { classRegistry, FabricObject } from "fabric";
import { IClip } from "../types";
import { timeUsToUnits } from "./timeline";

export const loadObject = (
  item: IClip,
  options: { tScale: number; sizesMap: Record<string, number> },
) => {
  const display = item.display || item.timing?.display;
  if (!display) {
    throw new Error(`Clip is missing display timing details: ${JSON.stringify(item)}`);
  }
  const playbackRate = item.playbackRate ?? item.timing?.playbackRate ?? 1;
  const duration = item.duration ?? item.timing?.duration ?? display.to - display.from;
  const trim = item.trim ?? item.timing?.trim ?? { from: 0, to: duration };

  const left = timeUsToUnits(display.from, options.tScale);
  const width = timeUsToUnits(display.to - display.from, options.tScale, playbackRate);
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
    duration,
    metadata: item.metadata,
    playbackRate,
    src: itemAny.src,
    trim,
    text: itemAny.text,
    name: itemAny.name,
    srcs: (itemAny.srcs as string[]) || [],
    svgString: itemAny.svgString,
    preview: itemAny.preview,
  };

  // Default case for all types
  return new (Klass as new (options: typeof baseObject) => FabricObject)(baseObject);
};
