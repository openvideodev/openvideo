import { classRegistry } from "fabric";
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
  const Klass = classRegistry.getClass(typeName) as any;

  const baseObject = {
    width,
    height,
    id: item.id,
    tScale: options.tScale,
    top: 10,
    left,
    display,
    duration: item.duration || display.to - display.from,
    metadata: (item as any).metadata,
    playbackRate: item.playbackRate || 1,
    src: (item as any).src,
    trim: item.trim || {
      from: 0,
      to: (item as any).duration || display.to - display.from
    },
    text: (item as any).text,
    srcs: (item as any).srcs || [],
    backgroundColorDiv: (item as any).backgroundColor,
    svgString: (item as any).svgString,
    preview: (item as any).preview
  };

  // Default case for all types
  return new Klass(baseObject);
};
