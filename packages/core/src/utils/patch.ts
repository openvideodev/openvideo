import { Patch } from '../commands/types';
import { set, unset } from 'lodash-es';

/**
 * Applies a list of patches to an object.
 * Note: This currently assumes a flat-ish state for simplicity as per requirements,
 * but uses lodash for path support.
 */
export const applyPatches = (state: any, patches: Patch[]) => {
  patches.forEach((patch) => {
    // Remove leading slash if present for lodash path compatibility
    const path = patch.path.startsWith('/')
      ? patch.path.slice(1).replace(/\//g, '.')
      : patch.path;

    switch (patch.op) {
      case 'add':
      case 'update':
        set(state, path, patch.value);
        break;
      case 'remove':
        unset(state, path);
        break;
    }
  });
};

/**
 * Inverts a list of patches to create undo patches.
 */
export const invertPatches = (patches: Patch[]): Patch[] => {
  return [...patches].reverse().map((patch) => {
    switch (patch.op) {
      case 'add':
        return { op: 'remove', path: patch.path };
      case 'update':
        return {
          op: 'update',
          path: patch.path,
          value: patch.oldValue,
          oldValue: patch.value,
        };
      case 'remove':
        return { op: 'add', path: patch.path, value: patch.oldValue };
      default:
        throw new Error(`Unknown patch operation: ${patch.op}`);
    }
  });
};
