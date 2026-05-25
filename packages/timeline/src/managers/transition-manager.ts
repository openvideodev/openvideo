import { ITransitionClip } from "../types";
import { Transition, Track } from "../objects";
import Timeline from "../timeline";
import { generateId } from "../utils/id";

class TransitionManager {
  private timeline: Timeline;

  constructor(timeline: Timeline) {
    this.timeline = timeline;
  }

  private removeTransitions() {
    const transitionItems = this.timeline.getObjects("Transition");
    this.timeline.remove(...transitionItems);
  }

  public renderTransitions() {
    this.removeTransitions();
    this.timeline.transitionIds.forEach((id) => {
      const transitionData = this.timeline.transitionsMap[id];
      if (!transitionData) return;
      const fromItemId = transitionData.fromClipId;
      const toItemId = transitionData.toClipId;
      const trackItems = this.timeline.getObjects();
      const fromObjItem = trackItems.find((t) => t.id === fromItemId);
      const toObjItem = trackItems.find((t) => t.id === toItemId);

      if (!fromObjItem || !toObjItem) {
        return;
      }
      const width = 26;
      const height = 26;
      const position = fromObjItem.left + fromObjItem.width - width / 2;
      const top = fromObjItem.top + (fromObjItem.height - height) / 2;
      const key = (transitionData as any).transitionKey || transitionData.key || "none";

      const duration = transitionData.timing?.duration ?? transitionData.duration;

      const transitionItem = new Transition({
        id: transitionData.id,
        left: position,
        top: top,
        height,
        width,
        tScale: this.timeline.tScale,
        duration: typeof duration === "number" ? duration : 1_500_000,
        fromClipId: fromObjItem.id,
        toClipId: toObjItem.id,
        key,
      });

      if (transitionItem) {
        this.timeline.add(transitionItem);
      }
    });
  }

  public alignTransitionsToTrack() {
    this.timeline.pauseEventListeners();
    this.timeline.transitionIds.forEach((id) => {
      const transitionItem = this.timeline.getObjects("Transition").find((o) => o.id === id);

      if (transitionItem instanceof Transition) {
        const fromObject = this.timeline
          .getObjects()
          .find((o) => o.id === transitionItem.fromClipId);

        if (!fromObject) return;
        const width = 26;
        const height = 26;
        const position = fromObject.left + fromObject.width - width / 2;
        const top = fromObject.top + (fromObject.height - height) / 2;

        transitionItem.set({
          left: position,
          top: top,
        });
        transitionItem.setCoords();
      }
    });
    this.timeline.resumeEventListeners();
  }

  public updateTransitions(handleListeners = true) {
    handleListeners && this.timeline.pauseEventListeners();
    const tracks = this.timeline.getObjects("Track");
    const trackItems = this.timeline.getObjects(...this.timeline.withTransitions);

    this.removeTransitions();
    const transitionsMapNext: Record<string, ITransitionClip> = {};
    const transitionIdsNext: string[] = [];

    tracks.forEach((track) => {
      const items = trackItems
        .filter((trackItem) => (track as Track).clipIds.includes(trackItem.id))
        .sort((a, b) => a.left - b.left);

      for (let i = 0; i < items.length - 1; i++) {
        const item1 = items[i];
        const item2 = items[i + 1];

        // check if the items are adjacent
        if (Math.abs(item1.left + item1.width - item2.left) <= 1) {
          // Find if there is an existing transition that connects these adjacent clips
          const foundTransition = Object.values(this.timeline.transitionsMap).find(
            (t) => t.fromClipId === item1.id && t.toClipId === item2.id,
          );

          if (foundTransition) {
            transitionsMapNext[foundTransition.id] = {
              ...foundTransition,
              trackId: track.id,
            } as any;
            transitionIdsNext.push(foundTransition.id);
          } else {
            const newTransitionId = generateId();
            const transition: ITransitionClip = {
              id: newTransitionId,
              duration: 1_500_000,
              timing: {
                duration: 1_500_000,
                display: { from: 0, to: 0 },
                trim: { from: 0, to: 0 },
                playbackRate: 1,
              },
              fromClipId: item1.id,
              toClipId: item2.id,
              key: "none",
              trackId: track.id,
              type: "Transition",
            } as any;

            transitionsMapNext[newTransitionId] = transition;
            transitionIdsNext.push(newTransitionId);
          }
        }
      }
    });
    // compare to current transitions
    this.timeline.transitionIds = transitionIdsNext;
    this.timeline.transitionsMap = transitionsMapNext;
    this.renderTransitions();

    // update transitions in cache
    const newTransitions = this.timeline.getObjects("Transition");
    this.timeline.updateCachingActiveObjects(newTransitions);

    handleListeners && this.timeline.resumeEventListeners();
  }
}

export default TransitionManager;
