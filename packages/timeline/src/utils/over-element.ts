import { FabricObject, Point } from "fabric";

export const detectOverObject = (point: Point, objects: FabricObject[]) => {
  let isOverObject = false;
  const overObjects: FabricObject[] = [];
  objects.forEach((object) => {
    if (object.containsPoint(point)) {
      overObjects.push(object);
      isOverObject = true;
    }
  });
  return { isOverObject, overObjects };
};
