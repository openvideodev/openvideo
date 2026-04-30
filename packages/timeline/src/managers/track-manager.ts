import Timeline from "../timeline";
import { Helper, Track } from "../objects";
import { classRegistry } from "fabric";
import { getHelperHeight } from "../utils/sizes";
import { ITimelineTrack } from "../timeline";

class TrackManager {
  private timeline: Timeline;

  constructor(timeline: Timeline) {
    this.timeline = timeline;
  }

  private removeTracks() {
    const trackElements = this.timeline.getObjects("Track", "Helper");
    trackElements.forEach((track) => this.timeline.remove(track));
  }

  public renderTracks() {
    this.filterEmptyTracks();
    this.removeTracks();
    const canvasWidth = this.timeline.width;

    const tracksWithHelpers = this.timeline.tracks
      .flatMap(
        (track) =>
          [
            track,
            {
              id: `helper-${track.id}`,
              type: "helper" as any,
              name: "",
              clipIds: [],
              accepts: []
            }
          ] as ITimelineTrack[]
      )
      .slice(0, -1);

    let verticalPosition = -970;
    const HelperClass =
      (classRegistry.getClass("Helper") as typeof Helper) || Helper;

    // Render top helper line
    const topHelper = new HelperClass({
      top: verticalPosition,
      selectable: false,
      evented: false,
      tScale: this.timeline.tScale,
      id: "helper-line-top",
      width: canvasWidth,
      kind: "top",
      height: 1000,
      metadata: {}
    });
    verticalPosition += getHelperHeight("top");
    this.timeline.insertAt(0, topHelper);

    // Render tracks and helpers
    tracksWithHelpers.forEach((trackData, index) => {
      if (trackData.type === ("helper" as any)) {
        const helperHeight = getHelperHeight("center");
        const centerHelper = new HelperClass({
          id: trackData.id,
          top: verticalPosition,
          tScale: this.timeline.tScale,
          width: canvasWidth,
          height: helperHeight,
          metadata: {
            order: (index + 1) / 2
          },
          kind: "center"
        });
        verticalPosition += helperHeight;
        this.timeline.insertAt(0, centerHelper);
      } else {
        const trackHeight = this.timeline.getItemSize(trackData.type);
        const TrackClass =
          (classRegistry.getClass("Track") as typeof Track) || Track;
        const accepts =
          trackData.accepts || this.timeline.getItemAccepts(trackData.type);
        console.log('trackData', {trackHeight, type: trackData.type, trackData});
        
          const track = new TrackClass({
          id: trackData.id,
          top: verticalPosition,
          left: 0,
          height: trackHeight,
          width: canvasWidth,
          tScale: this.timeline.tScale,
          accepts: accepts,
          clipIds: trackData.clipIds,
          magnetic: trackData.magnetic,
          static: trackData.static
        });
        verticalPosition += trackHeight;
        this.timeline.insertAt(0, track);
      }
    });

    // Render bottom helper line
    const bottomHelper = new HelperClass({
      id: "helper-line-bottom",
      top: verticalPosition,
      selectable: false,
      evented: false,
      tScale: this.timeline.tScale,
      width: canvasWidth,
      kind: "bottom",
      height: 1000,
      metadata: {}
    });
    this.timeline.insertAt(0, bottomHelper);
  }

  public filterEmptyTracks() {
    const seenIds = new Set<string>();
    this.timeline.tracks = this.timeline.tracks.filter((track) => {
      const clipIds: string[] = track.clipIds ?? [];
      // Keep track if it has clips or is static, and hasn't been seen before
      if ((clipIds.length || track.static) && !seenIds.has(track.id)) {
        seenIds.add(track.id);
        return true;
      }
      return false;
    });
  }

  public refreshTrackLayout() {
    const totalWidth =
      this.timeline.bounding.width + this.timeline.spacing.right;
    this.timeline.getObjects("Track", "Helper").forEach((track) => {
      (track as Track | Helper).updateCoords(totalWidth);
      track.setCoords();
    });
  }

  public adjustMagneticTrack() {
    this.timeline.pauseEventListeners();

    const magneticTracks = this.timeline.tracks.filter(
      (track) => track.magnetic
    );
    if (magneticTracks.length > 0) {
      magneticTracks.forEach((magneticTrack) => {
        const accepts = magneticTrack.accepts || [];
        const mediaItems = this.timeline
          .getObjects(...accepts)
          .filter((item) => magneticTrack.clipIds.includes(item.id))
          .sort((a, b) => a.left - b.left);
        let currentPosition = 0;
        mediaItems.forEach((item) => {
          item.left = currentPosition;
          currentPosition += item.width;
        });
      });
    }

    this.timeline.resumeEventListeners();
  }
}

export default TrackManager;
