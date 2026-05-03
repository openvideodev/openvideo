import { createProjectStore, IProject, Command, Patch } from '@openvideo/core';

export class ServerCore {
  private store;
  private unsubscribeOnChange: () => void;
  private patchHandlers: Set<(patches: Patch[]) => void> = new Set();

  constructor(snapshot?: IProject) {
    this.store = createProjectStore();
    
    if (snapshot) {
      this.store.getState().applyPatch(this.projectToPatches(snapshot));
    }

    this.unsubscribeOnChange = this.store.getState().onChange((patches: Patch[]) => {
      this.patchHandlers.forEach(handler => handler(patches));
    });
  }

  execute(command: Command) {
    this.store.getState().execute(command);
  }

  batch(commands: Command[]) {
    this.store.getState().batch(commands);
  }

  getSnapshot(): IProject {
    return this.store.getState().getSnapshot();
  }

  onPatch(handler: (patches: Patch[]) => void): () => void {
    this.patchHandlers.add(handler);
    return () => this.patchHandlers.delete(handler);
  }

  destroy() {
    this.unsubscribeOnChange();
    this.patchHandlers.clear();
  }
  
  // Basic conversion of snapshot to full patch replace
  private projectToPatches(snapshot: IProject): Patch[] {
    // In a real scenario we'd do granular patches or just have a core load action.
    // For now we'll simulate by updating tracks/clips/settings directly if possible.
    return [
      { op: 'update', path: '/settings', value: snapshot.settings },
      { op: 'update', path: '/tracks', value: snapshot.tracks },
      { op: 'update', path: '/clips', value: snapshot.clips }
    ];
  }
}
