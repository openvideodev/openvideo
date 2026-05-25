import { commandRegistry } from "./registry";
import * as clipHandlers from "./clip";
import * as trackHandlers from "./track";
import * as projectHandlers from "./project";
import * as playbackHandlers from "./playback";
import * as captionHandlers from "./caption";

export function registerDefaultHandlers() {
  commandRegistry.register("clip.add", clipHandlers.addClipHandler);
  commandRegistry.register("clip.update", clipHandlers.updateClipHandler);
  commandRegistry.register("clip.remove", clipHandlers.removeClipsHandler);
  commandRegistry.register("clip.split", clipHandlers.splitClipHandler);
  commandRegistry.register("clip.duplicate", clipHandlers.duplicateClipsHandler);

  commandRegistry.register("track.add", trackHandlers.addTrackHandler);
  commandRegistry.register("track.remove", trackHandlers.removeTrackHandler);
  commandRegistry.register("track.move", trackHandlers.moveTrackHandler);
  commandRegistry.register("track.set", trackHandlers.setTracksHandler);

  commandRegistry.register("project.updateSettings", projectHandlers.updateSettingsHandler);
  commandRegistry.register("project.select", projectHandlers.selectClipsHandler);
  commandRegistry.register("project.deselect", projectHandlers.deselectClipsHandler);
  commandRegistry.register("project.reset", projectHandlers.resetProjectHandler);

  commandRegistry.register("playback.seek", playbackHandlers.seekHandler);
  commandRegistry.register("playback.setIsPlaying", playbackHandlers.setIsPlayingHandler);

  commandRegistry.register("caption.setStyle", captionHandlers.setCaptionStyleHandler);
  commandRegistry.register("caption.setColors", captionHandlers.setCaptionColorsHandler);
  commandRegistry.register(
    "caption.setVerticalPosition",
    captionHandlers.setCaptionVerticalPositionHandler,
  );
}
