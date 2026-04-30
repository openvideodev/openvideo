import { cloneDeep } from "lodash-es";
import { Transition } from "../../objects";
import Timeline from "../../timeline";
import { ModifiedEvent, TPointerEvent } from "fabric";

function onObjectResize(this: Timeline, e: ModifiedEvent<TPointerEvent>) {
  const target = e.target;
  const canvas = e.target.canvas;
  if (e.action === "resizing" && target instanceof Transition && canvas) {
    const id = target.id;
    const transitionObject = canvas
      .getObjects("Transition")
      .find((obj) => obj.id === id);
    if (transitionObject && transitionObject instanceof Transition) {
      const cloneTransitionMap = cloneDeep(this.transitionsMap);
      const newTransitionMap = {
        ...cloneTransitionMap,
        [id]: {
          ...cloneTransitionMap[id],
          width: transitionObject.width,
          duration: transitionObject.duration
        }
      };
      this.transitionsMap = newTransitionMap;
      this.updateState();
    }
  }
}

export function addResizedEvents(timeline: Timeline) {
  timeline.on("object:modified", onObjectResize);
}

export function removeResizedEvents(timeline: Timeline) {
  timeline.off("object:modified", onObjectResize);
}
