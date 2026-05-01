import { IClip, ITransitionClip } from "@openvideo/timeline";

type GroupElement = IClip | ITransitionClip;

export const groupTrackItems = (clips: IClip[]): GroupElement[][] => {
  const transitions = clips.filter((c) => c.type === "Transition") as ITransitionClip[];
  const regularClips = clips.filter((c) => c.type !== "Transition");
  const trackItemsMap = Object.fromEntries(regularClips.map((c) => [c.id, c]));

  // Create a map to track which items are part of transitions
  const itemTransitionMap = new Map<string, ITransitionClip[]>();

  // Initialize transition maps
  transitions.forEach((transition) => {
    const fromId = (transition as any).fromId;
    const toId = (transition as any).toId;
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
      const transition = transitions.find(
        (t) => (t as any).fromId === currentId
      );
      if (!transition) break;

      group.push(transition);
      currentId = (transition as any).toId;
    }

    return group;
  };

  // Process all items
  for (const item of regularClips) {
    const itemId = item.id;
    if (processed.has(itemId)) continue;

    // If item is not part of any transition or is the start of a sequence
    if (
      !itemTransitionMap.has(itemId) ||
      !transitions.some((t) => (t as any).toId === itemId)
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
