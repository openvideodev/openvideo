import { Core } from "@openvideo/core";
import type { IProject, Command, Patch } from "@openvideo/core";

export class ServerCore {
  private engine: Core;
  private onPatchHandler: (patches: Patch[]) => void;
  private patchHandlers: Set<(patches: Patch[]) => void> = new Set();

  constructor(snapshot?: IProject) {
    this.engine = new Core(snapshot);

    // Core Engine emits 'change' with patches when execute/applyPatch is called
    this.onPatchHandler = (patches: Patch[]) => {
      this.patchHandlers.forEach((handler) => handler(patches));
    };

    this.engine.on("change", this.onPatchHandler);
  }

  execute(command: Command) {
    this.engine.execute(command);
  }

  batch(commands: Command[]) {
    this.engine.batch(commands);
  }

  applyPatch(patches: Patch[]) {
    this.engine.applyPatch(patches);
  }

  reset(project: IProject) {
    this.engine.reset(project);
  }

  getSnapshot(): IProject {
    return this.engine.store.getState().getSnapshot();
  }

  onPatch(handler: (patches: Patch[]) => void): () => void {
    this.patchHandlers.add(handler);
    return () => this.patchHandlers.delete(handler);
  }

  destroy() {
    this.engine.off("change", this.onPatchHandler);
    this.patchHandlers.clear();
  }
}
