import type { IShapeClip, ShapeType } from "@openvideo/core";
import { generateId } from "@openvideo/core";

export interface ShapeElement {
  id: string;
  name: string;
  shapeType: ShapeType;
  icon: string;
  borderRadius?: number;
}

export function createShapeClip(
  element: ShapeElement,
  position?: { x: number; y: number },
): IShapeClip {
  const now = 0;
  const duration = 5000000; // 5 seconds default duration

  const shapeClip: IShapeClip = {
    id: generateId(),
    type: "Shape",
    name: element.name,
    shapeType: element.shapeType,
    timing: {
      display: {
        from: now,
        to: now + duration,
      },
      trim: {
        from: 0,
        to: duration,
      },
      duration,
      playbackRate: 1,
    },
    transform: {
      x: position?.x ?? 640, // Center of 1280px canvas
      y: position?.y ?? 360, // Center of 720px canvas
      width: 200,
      height: 200,
      angle: 0,
      opacity: 1,
      zIndex: 1,
    },
    style: {
      fill: "#d08e0a",
      fillOpacity: 1,
      stroke: {
        color: "#1e40af",
        width: 0,
      },
      borderRadius: element.borderRadius,
    },
    src: `shape://${element.shapeType}`,
    metadata: {},
    locked: false,
  };

  return shapeClip;
}
