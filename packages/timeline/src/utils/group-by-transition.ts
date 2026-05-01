import { IClip, ITransitionClip } from "../types";
import { FabricObject, RectProps } from "fabric";
import Timeline from "../timeline";

export type GroupElement = IClip | ITransitionClip;

export const compareTransitionGroups = (
  a: GroupElement[],
  b: GroupElement[]
): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  const idsA = new Set(a.map((item) => item.id));
  const idsB = new Set(b.map((item) => item.id));

  if (idsA.size !== idsB.size) {
    return false;
  }

  for (const id of idsA) {
    if (!idsB.has(id)) {
      return false;
    }
  }

  return true;
};

export const groupByTransition = (data: {
  trackItemIds: string[];
  transitionsMap: Record<string, ITransitionClip>;
  trackItemsMap: Record<string, IClip>;
}): GroupElement[][] => {
  const { trackItemIds, transitionsMap, trackItemsMap } = data;

  // Create a map to track which items are part of transitions
  const itemTransitionMap = new Map<string, ITransitionClip[]>();

  // Initialize transition maps
  Object.values(transitionsMap).forEach((transition) => {
    const fromId = transition.fromClipId;
    const toId = transition.toClipId;
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

      // Find transition from this item, excluding 'none' transitions
      const transition = Object.values(transitionsMap).find(
        (t) => t.fromClipId === currentId
      );
      if (!transition) break;

      group.push(transition);
      currentId = transition.toClipId || "";
    }

    return group;
  };

  // Process all items
  for (const itemId of trackItemIds) {
    if (processed.has(itemId)) continue;

    // If item is not part of any transition or is the start of a sequence
    if (
      !itemTransitionMap.has(itemId) ||
        !Object.values(transitionsMap).some(
          (t) => t.toClipId === itemId
        )
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

export function getNextTransitionMappings(
  tracks: FabricObject[],
  trackItems: FabricObject[],
  currentTransitionsMap: Record<string, ITransitionClip>,
  positionAfterTransform: Record<string, Pick<RectProps, "left" | "top">>,
  activeObjectIds: string[]
): {
  newTransitionIds: string[];
  newTransitionsMap: Record<string, ITransitionClip>;
} {
  const canvas = tracks[0].canvas! as Timeline;
  const transformIds = Object.keys(positionAfterTransform);
  const newTransitionsMap: Record<string, ITransitionClip> = {};
  const newTransitionIds: string[] = [];
  tracks.forEach((track) => {
    const items = trackItems
      .filter((trackItem) => track.clipIds.includes(trackItem.id))
      .map((item) => {
        if (activeObjectIds.includes(item.id)) {
          const placeHolder = canvas
            .getObjects()
            .find((o) => o.id === `${item.id}-placeholder`);
          if (placeHolder?.opacity === 1) {
            item.left = placeHolder?.left || item.left;
          }
          return item;
        } else {
          return item;
        }
      })
      .sort((a, b) => a.left - b.left);
    for (let i = 0; i < items.length - 1; i++) {
      const item1 = items[i];
      let leftPos1 = item1.left;
      const item2 = items[i + 1];
      let leftPos2 = item2.left;

      if (transformIds.includes(item1.id))
        leftPos1 = positionAfterTransform[item1.id].left;

      if (transformIds.includes(item2.id))
        leftPos2 = positionAfterTransform[item2.id].left;
      if (Math.abs(leftPos1 + item1.width - leftPos2) <= 1) {
        const transitionId = `${item1.id}-${item2.id}`;
        const transitionExists =
          currentTransitionsMap.hasOwnProperty(transitionId);

        if (transitionExists) {
          const transition = currentTransitionsMap[transitionId];
          newTransitionsMap[transitionId] = transition;
        } else {
          const transition: ITransitionClip = {
            id: transitionId,
            duration: 1_500_000,
            fromClipId: item1.id,
            toClipId: item2.id,
            key: "none",
            trackId: track.id,
            type: "Transition"
          } as any;

          newTransitionsMap[transitionId] = transition;
        }

        newTransitionIds.push(transitionId);
      }
    }
  });

  return {
    newTransitionIds,
    newTransitionsMap
  };
}

export const getAdjustedTrackItemDimensions = (
  id: string,
  transitionGroup: GroupElement[]
) => {
  const itemIndex = transitionGroup.findIndex((i) => i.id === id);
  const prevTransition = transitionGroup[itemIndex - 1];
  const nextTransition = transitionGroup[itemIndex + 1];
  const transitionsInGroup = transitionGroup.filter(
    (t) => t.type === "Transition"
  ) as ITransitionClip[];

  // get all transitioins before prevTransition
  const prevTransitionIndex = transitionsInGroup.indexOf(prevTransition as ITransitionClip);
  const transitionsBeforePrev = transitionsInGroup.slice(
    0,
    prevTransitionIndex
  );

  const offsetTransitions = transitionsBeforePrev.reduce((acc, t) => {
    return acc + (t.duration || 0);
  }, 0);

  let durationDiff = 0;
  // find width affecting trac item
  if (prevTransition && !nextTransition) {
    durationDiff = (prevTransition.duration || 0) / 2;
  } else if (nextTransition && !prevTransition) {
    durationDiff = (nextTransition.duration || 0) / 2;
  } else if (prevTransition && nextTransition) {
    durationDiff =
      (nextTransition.duration || 0) / 2 + (prevTransition.duration || 0) / 2;
  }

  return {
    durationDiff,
    offsetTransitions
  };
};
