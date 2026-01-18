import diff, { Difference } from 'microdiff';
import { ClipJSON, ProjectJSON, StudioTrackJSON } from '../json-serialization';

export interface HistoryOptions {
  maxSize?: number;
}

export interface HistoryState {
  clips: Record<string, ClipJSON>;
  tracks: StudioTrackJSON[];
  settings: any;
}

export class HistoryManager {
  private past: Difference[][] = [];
  private future: Difference[][] = [];
  private lastState: HistoryState | null = null;
  private maxSize: number;

  constructor(options: HistoryOptions = {}) {
    this.maxSize = options.maxSize || 50;
  }

  private projectToHistoryState(project: ProjectJSON): HistoryState {
    const clips: Record<string, ClipJSON> = {};
    const tracks: StudioTrackJSON[] = JSON.parse(
      JSON.stringify(project.tracks || [])
    );

    project.clips.forEach((clip) => {
      if (clip.id) clips[clip.id] = JSON.parse(JSON.stringify(clip));
    });

    return {
      clips,
      tracks,
      settings: JSON.parse(JSON.stringify(project.settings || {})),
    };
  }

  /**
   * Initialize history with the starting state
   */
  public init(state: ProjectJSON) {
    this.lastState = this.projectToHistoryState(
      JSON.parse(JSON.stringify(state))
    );
    this.past = [];
    this.future = [];
  }

  /**
   * Push a new state to history. Calculates the diff from the last state.
   */
  public push(newState: ProjectJSON) {
    if (!this.lastState) {
      this.init(newState);
      return;
    }

    const currentHistoryState = this.projectToHistoryState(
      JSON.parse(JSON.stringify(newState))
    );
    const patches = diff(this.lastState, currentHistoryState);

    if (patches.length === 0) return;

    this.past.push(patches);
    if (this.past.length > this.maxSize) {
      this.past.shift();
    }

    this.future = []; // Clear redo stack on new action
    this.lastState = currentHistoryState;
  }

  /**
   * Undo the last action. Returns the patches and the new target state.
   */
  public undo(
    currentState: ProjectJSON
  ): { patches: Difference[]; state: HistoryState } | null {
    const patches = this.past.pop();
    if (!patches) return null;

    const currentHistoryState = this.projectToHistoryState(
      JSON.parse(JSON.stringify(currentState))
    );

    // Calculate new state by reversing patches
    const newState = this.applyPatches(currentHistoryState, patches, true);

    this.future.push(patches);
    this.lastState = newState;

    return { patches, state: newState };
  }

  /**
   * Redo the next action. Returns the patches and the new target state.
   */
  public redo(
    currentState: ProjectJSON
  ): { patches: Difference[]; state: HistoryState } | null {
    const patches = this.future.pop();
    if (!patches) return null;

    const currentHistoryState = this.projectToHistoryState(
      JSON.parse(JSON.stringify(currentState))
    );

    // Calculate new state by applying patches
    const newState = this.applyPatches(currentHistoryState, patches, false);
    this.past.push(patches);
    this.lastState = newState;

    return { patches, state: newState };
  }

  /**
   * Apply patches to an object.
   */
  private applyPatches(obj: any, patches: Difference[], reverse: boolean): any {
    const newObj = JSON.parse(JSON.stringify(obj));
    const patchesToApply = reverse ? [...patches].reverse() : patches;

    for (const patch of patchesToApply) {
      const { type, path } = patch;
      const value = (patch as any).value;
      const oldValue = (patch as any).oldValue;

      let target = newObj;
      let skip = false;
      for (let i = 0; i < path.length - 1; i++) {
        if (target[path[i]] === undefined || target[path[i]] === null) {
          // If we are reversing a REMOVE, we might need to recreate the path.
          // However, microdiff should provide the patches in order.
          // For now, let's just be safe and skip if the path is truly broken.
          skip = true;
          break;
        }
        target = target[path[i]];
      }

      if (skip) continue;

      const lastKey = path[path.length - 1];

      if (reverse) {
        switch (type) {
          case 'CREATE':
            if (Array.isArray(target)) {
              target.splice(lastKey as number, 1);
            } else {
              delete target[lastKey];
            }
            break;
          case 'REMOVE':
            target[lastKey] =
              oldValue && typeof oldValue === 'object'
                ? JSON.parse(JSON.stringify(oldValue))
                : oldValue;
            break;
          case 'CHANGE':
            target[lastKey] =
              oldValue && typeof oldValue === 'object'
                ? JSON.parse(JSON.stringify(oldValue))
                : oldValue;
            break;
        }
      } else {
        switch (type) {
          case 'CREATE':
            target[lastKey] =
              value && typeof value === 'object'
                ? JSON.parse(JSON.stringify(value))
                : value;
            break;
          case 'REMOVE':
            if (Array.isArray(target)) {
              target.splice(lastKey as number, 1);
            } else {
              delete target[lastKey];
            }
            break;
          case 'CHANGE':
            target[lastKey] =
              value && typeof value === 'object'
                ? JSON.parse(JSON.stringify(value))
                : value;
            break;
        }
      }
    }

    return newObj;
  }

  public canUndo(): boolean {
    return this.past.length > 0;
  }

  public canRedo(): boolean {
    return this.future.length > 0;
  }
}
