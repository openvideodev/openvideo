import { ActiveSelection } from "fabric";
import type Timeline from "../canvas";
import { TIMELINE_CONSTANTS } from "../../timeline-constants";
import {
  MICROSECONDS_PER_SECOND,
  type ITimelineTrack,
  type TrackType,
} from "@/types/timeline";
import { generateUUID } from "@/utils/id";

export function handleSelectionCreate(timeline: Timeline, e: any) {
  const activeSelection = timeline.canvas.getActiveObject();

  if (activeSelection instanceof ActiveSelection) {
    activeSelection.set({
      borderColor: "rgba(255, 255, 255, 0.5)",
      hasControls: false,
      hoverCursor: "default",
      padding: 0,
      borderScaleFactor: 1,
    });

    // Update individual clip selection state
    activeSelection.getObjects().forEach((obj: any) => {
      if ((obj as any).setSelected) (obj as any).setSelected(true);
    });
  } else {
    // Single object selection
    const obj = activeSelection as any;
    if (obj && obj.setSelected) {
      obj.setSelected(true);
    }
  }

  timeline.emitSelectionChange();
}

export function handleSelectionUpdate(timeline: Timeline, e: any) {
  const { selected, deselected } = e;
  const activeSelection = timeline.canvas.getActiveObject();

  if (activeSelection instanceof ActiveSelection) {
    activeSelection.set({
      borderColor: "transparent",
      hasControls: false,
      hoverCursor: "default",
    });
  }

  // Handle Deselected
  if (deselected) {
    deselected.forEach((obj: any) => {
      if ((obj as any).setSelected) (obj as any).setSelected(false);
    });
  }

  // Handle Selected
  if (selected) {
    selected.forEach((obj: any) => {
      if ((obj as any).setSelected) (obj as any).setSelected(true);
    });
  }

  timeline.emitSelectionChange();
}

export function handleSelectionClear(timeline: Timeline, e: any) {
  const { deselected } = e;
  if (deselected) {
    const trackMoves: Array<{ clipId: string; targetIdx: number }> = [];
    const clips: Array<{ clipId: string; displayFrom: number }> = [];

    // Phase 1: Collect all changes (no emissions — track layout stays stable)
    deselected.forEach((obj: any) => {
      if ((obj as any).setSelected) (obj as any).setSelected(false);

      if (obj.elementId) {
        // Detect track change from standalone position
        const clipHeight = obj.getScaledHeight?.() || obj.height || 0;
        const clipCenterY = (obj.top || 0) + clipHeight / 2;
        const trackRegion = timeline.getTrackAt(clipCenterY);

        let targetIdx = -1;
        if (trackRegion) {
          targetIdx = timeline.tracks.findIndex((t) => t.id === trackRegion.id);
        } else if (timeline.trackRegions.length > 0) {
          const lastRegion =
            timeline.trackRegions[timeline.trackRegions.length - 1];
          if (clipCenterY > lastRegion.bottom) {
            // Below last track: calculate virtual track slot
            const dist = clipCenterY - lastRegion.bottom;
            const GAP = TIMELINE_CONSTANTS.TRACK_SPACING;
            const DEFAULT_H = 60; // Estimated height for new slots
            targetIdx =
              timeline.tracks.length + Math.floor(dist / (DEFAULT_H + GAP));
          }
        }

        if (targetIdx !== -1) {
          const currentTrack = timeline.tracks.find((t) =>
            t.clipIds.includes(obj.elementId),
          );
          const currentIdx = currentTrack
            ? timeline.tracks.indexOf(currentTrack)
            : -1;

          if (currentIdx !== targetIdx) {
            trackMoves.push({
              clipId: obj.elementId,
              targetIdx,
            });
          }
        }

        // Collect position update
        let left = obj.left || 0;
        if (left < 0) left = 0;

        let displayFrom = Math.round(
          (left / (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * timeline.timeScale)) *
            MICROSECONDS_PER_SECOND,
        );
        if (displayFrom < 0) displayFrom = 0;

        clips.push({ clipId: obj.elementId, displayFrom });
      }
    });

    // Phase 2: Apply track moves atomically via timeline:updated
    if (trackMoves.length > 0) {
      let newTracks = timeline.tracks.map((t) => ({
        ...t,
        clipIds: [...t.clipIds],
      }));

      // Ensure we have enough tracks for the max targetIdx
      const maxTargetIdx = Math.max(...trackMoves.map((m) => m.targetIdx));
      while (newTracks.length <= maxTargetIdx) {
        newTracks.push({
          id: generateUUID(),
          type: "Video",
          name: "Video Track",
          clipIds: [],
          muted: false,
        });
      }

      for (const { clipId, targetIdx } of trackMoves) {
        // Remove from current tracks
        for (const track of newTracks) {
          track.clipIds = track.clipIds.filter((id) => id !== clipId);
        }

        // Add to new track and update its type based on the first clip that lands there
        const targetTrack = newTracks[targetIdx];
        if (targetTrack) {
          targetTrack.clipIds.push(clipId);

          const clip = timeline.clipsMap[clipId];
          if (clip) {
            let newType: TrackType = "Video";
            if (clip.type === "Audio") newType = "Audio";
            else if (clip.type === "Text" || clip.type === "Caption")
              newType = "Text";
            else if (clip.type === "Effect") newType = "Effect";
            else if (clip.type === "Video" || clip.type === "Image")
              newType = "Video";

            targetTrack.type = newType;
            targetTrack.name = `${newType} Track`;
          }
        }
      }

      // Remove empty tracks
      newTracks = newTracks.filter((t) => t.clipIds.length > 0);

      timeline.setTracksInternal(newTracks);
      timeline.render();
      timeline.emit("timeline:updated", { tracks: newTracks });
    }

    // Phase 3: Emit position updates
    if (clips.length > 0) {
      timeline.emit("clips:modified", { clips });
    }
  }
  timeline.emitSelectionChange();
}
