import { ActiveSelection, FabricObject } from "fabric";
import Timeline from "../timeline";

class CanvasMixin {
  private ___eventListeners = {};
  public ___activeObjects: FabricObject[] = [];

  resize(
    this: Timeline,
    payload: { width?: number; height?: number },
    { force }: { force?: boolean } = { force: false }
  ) {
    if (!this.lowerCanvasEl) {
      return;
    }

    this.setDimensions(payload);

    if (force) {
      this.tracksManager.renderTracks();
    }
    this.onResizeCanvas?.({
      width: this.width,
      height: this.height
    });
  }

  pauseEventListeners(this: Timeline) {
    this.___eventListeners = this.__eventListeners;
    this.__eventListeners = {};

    const activeObjects = this.getActiveObjects();
    this.discardActiveObject();
    this.___activeObjects = activeObjects;
  }

  resumeEventListeners(this: Timeline) {
    this.__eventListeners = this.___eventListeners;
    this.___eventListeners = {};

    const activeObjects = this.___activeObjects;
    if (!activeObjects.length) {
      this.requestRenderAll();
      return false;
    }

    if (activeObjects.length === 1) {
      this.setActiveObject(activeObjects[0]!);
    } else {
      const activeSelection = new ActiveSelection(activeObjects);
      this.setActiveObject(activeSelection);
    }
    this.requestRenderAll();
  }

  updateCachingActiveObjects(this: Timeline, newObjects: FabricObject[]) {
    const objectsInCaching = this.___activeObjects;
    // replace the transitions in the cache with the new ones using the same ids
    this.___activeObjects = objectsInCaching.map((t) => {
      const newObject = newObjects.find((nt) => nt.id === t.id);
      if (newObject) {
        return newObject;
      }
      return t;
    });
  }
}
export default CanvasMixin;
