export * from './types';
export * from './project';
export * from './playback';
export * from './engine';
export * from './events';
export * from './commands/types';
export * from './commands/registry';

import { registerDefaultHandlers } from './commands/index';

// Initialize default handlers
registerDefaultHandlers();
export * from './utils/load-item';
export * from './utils/patch';
export { nanoid } from 'nanoid';
export * from './config';
export * from './utils/browser-metadata-provider';

