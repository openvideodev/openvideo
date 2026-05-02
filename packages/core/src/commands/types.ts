import { ProjectStore } from '../project';

export type CommandMeta = {
  userId?: string;
  timestamp?: number;
  source?: 'user' | 'agent' | 'system';
};

export type Command<T = any> = {
  id: string;
  type: string;
  payload: T;
  meta?: CommandMeta;
};

export type PatchOp = 'add' | 'update' | 'remove';

export type Patch = {
  op: PatchOp;
  path: string;
  value?: any;
  oldValue?: any; // Useful for inverse patches
};

export type CommandHandler<T = any> = (
  state: ProjectStore,
  command: Command<T>
) => Patch[];

export type HistoryEntry = {
  command: Command;
  patches: Patch[];
  inversePatches: Patch[];
};
