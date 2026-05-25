export type {
  IProject,
  IProjectSettings,
  ITrack,
  AnyClip,
  IBaseClip,
  IClipTiming,
  IClipTimingInput,
  IVideoClip,
  IAudioClip,
  IImageClip,
  ITextClip,
  ICaptionClip,
  ITransitionClip,
  IEffectClip,
  ICaptionStyle,
  ICaptionColors,
  ICaptionWord,
  IDisplay,
  ITrim,
  IFlip,
  ClipType,
  IScaleState,
  IRenderer,
} from "./types";
export {
  createProjectStore,
  projectStore,
  type ProjectStore,
  type ProjectState,
  type ProjectActions,
} from "./project";
export * from "./playback";
export * from "./engine";
export * from "./events";
export type {
  Command,
  CommandMeta,
  CommandHandler,
  HistoryEntry,
  Patch,
  PatchOp,
} from "./commands/types";
export * from "./commands/registry";

import { registerDefaultHandlers } from "./commands/index";

// Initialize default handlers
registerDefaultHandlers();
export { loadClip } from "./utils/load-item";
export * from "./utils/patch";
export { nanoid } from "nanoid";
export * from "./utils/caption-utils";
export { CoreConfig } from "./config";
export type { IMediaMetadata, IMediaMetadataProvider } from "./config";
export * from "./utils/browser-metadata-provider";
export * from "./transitions";
