import { ITransitionClip } from "@designcombo/types";
import { Transition, Track } from "../objects";
import Timeline from "../timeline";

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
      const fromItemId = transitionData.fromId;
      const toItemId = transitionData.toId;
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
      const kind = transitionData.kind || "none";

      const transitionItem = new Transition({
        id: transitionData.id,
        left: position,
        top: top,
        height,
        width,
        tScale: this.timeline.tScale,
        duration: transitionData.duration,
        fromId: fromObjItem.id,
        toId: toObjItem.id,
        kind
      });

      if (transitionItem) {
        this.timeline.add(transitionItem);
      }
    });
  }

  public alignTransitionsToTrack() {
    this.timeline.pauseEventListeners();
    this.timeline.transitionIds.forEach((id) => {
      const transitionItem = this.timeline
        .getObjects("Transition")
        .find((o) => o.id === id);

      if (transitionItem instanceof Transition) {
        const fromObject = this.timeline
          .getObjects()
          .find((o) => o.id === transitionItem.fromId);

        if (!fromObject) return;
        const width = 26;
        const height = 26;
        const position = fromObject.left + fromObject.width - width / 2;
        const top = fromObject.top + (fromObject.height - height) / 2;

        transitionItem.set({
          left: position,
          top: top
        });
        transitionItem.setCoords();
      }
    });
    this.timeline.resumeEventListeners();
  }

  public updateTransitions(handleListeners = true) {
    handleListeners && this.timeline.pauseEventListeners();
    const tracks = this.timeline.getObjects("Track");
    const trackItems = this.timeline.getObjects(
      ...this.timeline.withTransitions
    );

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
          const nextTransitionId = `${item1.id}-${item2.id}`;
          const transitionExists =
            this.timeline.transitionIds.includes(nextTransitionId);

          if (transitionExists) {
            const transition = this.timeline.transitionsMap[nextTransitionId];

            transitionsMapNext[nextTransitionId] = {
              ...transition,
              trackId: track.id
            } as any;
          } else {
            const transition: ITransitionClip = {
              id: nextTransitionId,
              duration: 1_500_000,
              fromId: item1.id,
              toId: item2.id,
              kind: "none",
              trackId: track.id,
              type: "Transition"
            } as any;

            transitionsMapNext[nextTransitionId] = transition;
          }

          transitionIdsNext.push(nextTransitionId);
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
