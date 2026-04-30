import { IClip, ITransitionClip } from "@designcombo/types";
import Timeline from "../timeline";
import { Transition } from "../objects";
import { OBJECT_TYPE_TRANSITION } from "../constants/objects";

type GroupElement = IClip | ITransitionClip;

export const groupTrackItems = (data: {
  trackItemIds: string[];
  transitionsMap: Record<string, ITransitionClip>;
  trackItemsMap: Record<string, IClip>;
}): GroupElement[][] => {
  const { trackItemIds, transitionsMap, trackItemsMap } = data;

  // Create a map to track which items are part of transitions
  const itemTransitionMap = new Map<string, ITransitionClip[]>();

  // Initialize transition maps
  Object.values(transitionsMap).forEach((transition) => {
    const fromId = (transition as any).fromId;
    const toId = (transition as any).toId;
    const kind = (transition as any).kind || "none";
    if (kind === "none") return; // Skip transitions of kind 'none'
    if (!itemTransitionMap.has(fromId)) itemTransitionMap.set(fromId, []);
    if (!itemTransitionMap.has(toId)) itemTransitionMap.set(toId, []);
    itemTransitionMap.get(fromId)?.push(transition);
    itemTransitionMap.get(toId)?.push(transition);
  });

  const groups: GroupElement[][] = [];
  const processed = new Set<string>();

  // Helper function to build a connected group starting from an item
  const buildGroup = (startItemId: string): GroupElement[] => {
    const group: GroupElement[] = [];
    let currentId = startItemId;

    while (currentId) {
      if (processed.has(currentId)) break;

      processed.add(currentId);
      const currentItem = trackItemsMap[currentId];
      group.push(currentItem);

      // Find transition from this item
      const transition = Object.values(transitionsMap).find(
        (t) =>
          (t as any).fromId === currentId &&
          (t as any).kind !== "none" // Filter here
      );
      if (!transition) break;

      group.push(transition);
      currentId = (transition as any).toId;
    }

    return group;
  };
  const transitionsWitouthNone = Object.values(transitionsMap).filter(
    (t) => (t as any).kind !== "none"
  );

  // Process all items
  for (const itemId of trackItemIds) {
    if (processed.has(itemId)) continue;

    // If item is not part of any transition or is the start of a sequence
    if (
      !itemTransitionMap.has(itemId) ||
      !transitionsWitouthNone.some((t) => (t as any).toId === itemId)
    ) {
      const group = buildGroup(itemId);
      if (group.length > 0) {
        groups.push(group);
      }
    }
  }

  // Sort items within each group by display.from
  groups.forEach((group) => {
    group.sort((a, b) => {
      if ("display" in a && "display" in b) {
        return a.display.from - b.display.from;
      }
      return 0;
    });
  });

  return groups;
};

export const getPrevTransitionDuration = (timeline: Timeline, id: string) => {
  const groupedItems = groupTrackItems({
    trackItemIds: timeline.trackItemIds,
    transitionsMap: timeline.transitionsMap,
    trackItemsMap: timeline.trackItemsMap
  });
  const object = timeline.getObjects().find((o) => o.id === id)!;
  const groupItem = groupedItems.find((g) => g.find((i) => i.id === object.id));
  const transObjectInGroup = groupItem
    ?.filter((g) => g.type === OBJECT_TYPE_TRANSITION)
    .map((t) =>
      timeline.getObjects().find((o) => o.id === t.id)
    ) as Transition[];
  const transitions = transObjectInGroup
    .filter((t) => t?.top === object?.top)
    .filter((t) => t?.left + t?.width <= object?.left);
  const prevTransitionDuration = transitions.reduce((acc, t) => {
    return acc + (t.duration || 0);
  }, 0);

  return prevTransitionDuration;
};
