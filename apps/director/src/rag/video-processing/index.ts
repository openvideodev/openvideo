export {
  detectScenes,
  detectScenesFromSilence,
  type Scene,
  type SceneDetectorOptions,
} from "./scene-detector";

export {
  extractFrame,
  extractKeyframeBatch,
  extractFramesAtInterval,
  cleanupFrames,
  createTempFrameDir,
  cleanupTempDir,
  type ExtractedFrame,
  type FrameExtractionOptions,
} from "./frame-extractor";
