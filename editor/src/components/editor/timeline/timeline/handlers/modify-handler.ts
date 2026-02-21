import { type FabricObject, util } from "fabric";
import type Timeline from "../canvas";
import { clearAuxiliaryObjects } from "../guidelines/utils";
import { generateUUID } from "@/utils/id";
import {
  type ITimelineTrack,
  MICROSECONDS_PER_SECOND,
  type TrackType,
} from "@/types/timeline";
import { TIMELINE_CONSTANTS } from "../../timeline-constants";

/**
 * Helper to safely update the local clips map in Timeline to reflect the new visual state
 * before the asynchronous store update comes back.
 */
function updateClipTimeLocally(
  timeline: Timeline,
  clipId: string,
  newDisplayFrom: number,
) {
  const clip = timeline.clipsMap[clipId];
  if (!clip) return;

  const updatedClip = {
    ...clip,
    display: {
      ...clip.display,
      from: newDisplayFrom,
      to: newDisplayFrom + clip.duration,
    },
  };

  timeline.clipsMap[clipId] = updatedClip;
}

export function handleTrackRelocation(timeline: Timeline, options: any) {
  const target = options.target as FabricObject | undefined;
  if (!target) return;
  const allClips = timeline.canvas
    .getObjects()
    .filter((obj: any) => obj.elementId);

  clearAuxiliaryObjects(timeline.canvas, timeline.canvas.getObjects());

  const targetAny = target as any;

  const placeholder = timeline.dragPlaceholder;
  if (placeholder && placeholder.visible) {
    const placeholderLeft = placeholder.left || 0;
    const placeholderTop = placeholder.top || 0;

    if (
      targetAny.type === "activeselection" ||
      target.type === "activeselection"
    ) {
      const selection = target as any;
      const selectedObjects = selection._objects || [];

      const pdt = timeline.primaryDragTarget as any;
      const primaryTarget = pdt
        ? selectedObjects?.includes(pdt)
          ? pdt
          : pdt.elementId
            ? selectedObjects?.find(
                (obj: any) => obj.elementId === pdt.elementId,
              ) || selectedObjects?.[0]
            : selectedObjects?.[0]
        : selectedObjects?.[0];

      if (primaryTarget) {
        const matrix = selection.calcTransformMatrix(true);
        const point = { x: primaryTarget.left, y: primaryTarget.top };
        const absPoint = util.transformPoint(point, matrix);

        const deltaX = placeholderLeft - absPoint.x;
        const deltaY = placeholderTop - absPoint.y;
        const simulated = selectedObjects.map((obj: any) => {
          const objAbsPoint = util.transformPoint(
            { x: obj.left, y: obj.top },
            matrix,
          );
          let newLeft = objAbsPoint.x + deltaX;
          if (newLeft < 0) newLeft = 0;
          const width =
            (obj.width || 0) * (obj.scaleX || 1) * (selection.scaleX || 1);
          return {
            elementId: obj.elementId,
            left: newLeft,
            right: newLeft + width,
          };
        });

        const nonSelectedClips = allClips
          .filter(
            (clip: any) =>
              !selectedObjects.some(
                (sel: any) => sel.elementId === clip.elementId,
              ),
          )
          .map((clip: any) => {
            const track = timeline.tracks.find((t) =>
              t.clipIds.includes(clip.elementId),
            );
            return { clip, trackId: track?.id };
          });

        let shouldCancel = false;

        for (const sim of simulated) {
          const objInSelection = selectedObjects.find(
            (o: any) => o.elementId === sim.elementId,
          );
          const simTop =
            placeholderTop +
            (objInSelection.top - (primaryTarget.top || 0)) *
              (selection.scaleY || 1);
          const simHeight =
            (objInSelection.height || 0) *
            (objInSelection.scaleY || 1) *
            (selection.scaleY || 1);
          const targetTrack = timeline.getTrackAt(simTop + simHeight / 2);

          if (!targetTrack) continue;

          for (const { clip, trackId } of nonSelectedClips) {
            if (trackId !== targetTrack.id) continue;

            const clipLeft = clip.left || 0;
            const clipWidth = (clip.width || 0) * (clip.scaleX || 1);
            const clipRight = clipLeft + clipWidth;
            const overlaps = sim.right > clipLeft && sim.left < clipRight;

            if (overlaps) {
              shouldCancel = true;
              break;
            }
          }
          if (shouldCancel) break;
        }

        if (shouldCancel) {
          target.set({
            left: (target as any)._originalLeft,
            top: (target as any)._originalTop,
          });
          target.setCoords();
          timeline.clearSeparatorHighlights();
          timeline.setActiveSeparatorIndex(null);
          timeline.removeDragPlaceholder();
          timeline.clearPrimaryDragTarget();
          timeline.canvas.requestRenderAll();
          return;
        }

        target.set({
          left: (target.left || 0) + deltaX,
          top: (target.top || 0) + deltaY,
        });
        target.setCoords();
      }
    } else {
      // Single clip: snap directly to placeholder
      target.set({ left: placeholderLeft, top: placeholderTop });
      target.setCoords();
    }
  }

  // ---------------------------------------------------------
  // 1. Handle Drop on Separator (Single Clip Only - Reverted Multi-clip)
  // ---------------------------------------------------------
  if (timeline.activeSeparatorIndex !== null) {
    // If it's an active selection, we skip separator logic to avoid issues (as requested to remove 3)
    if (
      targetAny.type === "activeselection" ||
      target.type === "activeselection"
    ) {
      timeline.clearSeparatorHighlights();
      timeline.setActiveSeparatorIndex(null);
      timeline.removeDragPlaceholder();
      timeline.clearPrimaryDragTarget();
      timeline.canvas.requestRenderAll();
      return;
    }

    if (targetAny.elementId) {
      const index = timeline.activeSeparatorIndex;
      const clipId = targetAny.elementId;

      const tracks = timeline.tracks;
      const currentTrackIndex = tracks.findIndex((t) =>
        t.clipIds.includes(clipId),
      );

      // Restore original Logic for Single Clip Separator Drop (plus the negative time fix)
      if (currentTrackIndex === -1) {
        // Look up via map if not found in tracks array directly?
        // Actually, let's use the same logic as before but with the local time update
      }

      const clip = timeline.clipsMap[clipId];
      if (!clip) {
        timeline.clearSeparatorHighlights();
        timeline.setActiveSeparatorIndex(null);
        return;
      }

      // Calculate new time (clamped)
      let left = target.left || 0;
      if (left < 0) left = 0;
      let newDisplayFrom = Math.round(
        (left / (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * timeline.timeScale)) *
          MICROSECONDS_PER_SECOND,
      );
      if (newDisplayFrom < 0) newDisplayFrom = 0;

      updateClipTimeLocally(timeline, clipId, newDisplayFrom);

      let newTrackType: TrackType = "Video";
      if (clip.type === "Audio") newTrackType = "Audio";
      else if (clip.type === "Text" || clip.type === "Caption")
        newTrackType = "Text";
      else if (clip.type === "Effect") newTrackType = "Effect";
      else if (clip.type === "Video" || clip.type === "Image")
        newTrackType = "Video";

      const newTrackId = generateUUID();
      const newTrack: ITimelineTrack = {
        id: newTrackId,
        type: newTrackType,
        name: `${newTrackType} Track`,
        clipIds: [clipId],
        muted: false,
      };

      // Remove from old track
      // If the clip was in a track, we need to remove it.
      // But unlike overlap, here we have precise index target.
      const affectedTrackIds = new Set<string>();
      const currentTrack = tracks.find((t) => t.clipIds.includes(clipId));
      if (currentTrack) affectedTrackIds.add(currentTrack.id);

      const newTracksList = tracks
        .map((t) => {
          if (affectedTrackIds.has(t.id)) {
            return {
              ...t,
              clipIds: t.clipIds.filter((id) => id !== clipId),
            };
          }
          return t;
        })
        .filter((t) => t.clipIds.length > 0);

      newTracksList.splice(index, 0, newTrack);

      timeline.setTracksInternal(newTracksList);
      timeline.render();
      timeline.emit("timeline:updated", { tracks: newTracksList });

      // Also emit clip modification to save time?
      // Yes
      timeline.emit("clip:modified", {
        clipId,
        displayFrom: newDisplayFrom,
        duration: clip.duration, // use current duration
      });

      timeline.clearSeparatorHighlights();
      timeline.setActiveSeparatorIndex(null);
      timeline.removeDragPlaceholder();
      timeline.clearPrimaryDragTarget();
      return;
    }
  }

  // ---------------------------------------------------------
  // 2. Handle Multi-selection Move (General)
  // ---------------------------------------------------------
  if (
    targetAny.type === "activeselection" ||
    target.type === "activeselection"
  ) {
    // Track changes and position updates are deferred to selection:cleared
    timeline.clearSeparatorHighlights();
    timeline.setActiveSeparatorIndex(null);
    timeline.removeDragPlaceholder();
    timeline.clearPrimaryDragTarget();
    timeline.canvas.requestRenderAll();
    return;
  }

  // ---------------------------------------------------------
  // 3. Handle Single Clip Drop on Track (Check Overlap)
  // ---------------------------------------------------------
  const centerPoint = target.getCenterPoint();
  const trackRegion = timeline.getTrackAt(centerPoint.y);

  if (trackRegion) {
    const clipId = targetAny.elementId;

    if (clipId) {
      let left = target.left || 0;
      if (left < 0) left = 0; // Visual clamp

      const width = target.width || 0;

      const proposedStart = Math.round(
        (left / (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * timeline.timeScale)) *
          MICROSECONDS_PER_SECOND,
      );
      const proposedDuration = Math.round(
        (width / (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * timeline.timeScale)) *
          MICROSECONDS_PER_SECOND,
      );
      const proposedEnd = proposedStart + proposedDuration;

      const targetTrack = timeline.tracks.find((t) => t.id === trackRegion.id);
      let hasOverlap = false;

      if (targetTrack) {
        for (const otherClipId of targetTrack.clipIds) {
          if (otherClipId === clipId) continue;
          const otherClip = timeline.clipsMap[otherClipId];
          if (!otherClip) continue;

          // Check for actual overlap: clips overlap if one starts before the other ends
          // and ends after the other starts
          const otherStart = otherClip.display.from;
          const otherEnd = otherClip.display.to;

          // Two clips overlap if:
          // proposedStart < otherEnd AND proposedEnd > otherStart
          if (proposedStart < otherEnd && proposedEnd > otherStart) {
            hasOverlap = true;
            break;
          }
        }
      }

      if (hasOverlap) {
        // --- OVERLAP: CREATE NEW TRACK ---
        updateClipTimeLocally(timeline, clipId, proposedStart);

        const clipInfo = timeline.clipsMap[clipId];
        let newTrackType: TrackType = "Video";
        if (targetTrack) newTrackType = targetTrack.type;
        else if (clipInfo) {
          if (clipInfo.type === "Audio") newTrackType = "Audio";
          else if (clipInfo.type === "Text" || clipInfo.type === "Caption")
            newTrackType = "Text";
          else if (clipInfo.type === "Effect") newTrackType = "Effect";
          else if (clipInfo.type === "Video" || clipInfo.type === "Image")
            newTrackType = "Video";
        }

        const newTrackId = generateUUID();
        const newTrack: ITimelineTrack = {
          id: newTrackId,
          type: newTrackType,
          name: `${newTrackType} Track`,
          clipIds: [clipId],
          muted: false,
        };

        const currentTracks = timeline.tracks;
        const newTracksList = currentTracks
          .map((t: ITimelineTrack) => ({
            ...t,
            clipIds: t.clipIds.filter((id) => id !== clipId),
          }))
          .filter((t: ITimelineTrack) => t.clipIds.length > 0);

        const targetTrackIndex = newTracksList.findIndex(
          (t) => t.id === trackRegion.id,
        );

        const insertIndex =
          targetTrackIndex !== -1 ? targetTrackIndex + 1 : newTracksList.length;
        newTracksList.splice(insertIndex, 0, newTrack);

        timeline.setTracksInternal(newTracksList);
        timeline.render();

        timeline.emit("timeline:updated", { tracks: newTracksList });

        const trim = targetAny.trim;
        timeline.emit("clip:modified", {
          clipId,
          displayFrom: proposedStart,
          duration: proposedDuration,
          trim,
        });
      } else {
        // --- NO OVERLAP: MOVE ---
        target.set("top", trackRegion.top);
        target.setCoords();
        timeline.emit("clip:movedToTrack", {
          clipId: clipId,
          trackId: trackRegion.id,
        });
      }
    }
  } else {
    // ---------------------------------------------------------
    // 4. Handle Drop in Empty Space
    // ---------------------------------------------------------
    const clipId = targetAny.elementId;
    if (clipId) {
      const originalClip = timeline.clipsMap[clipId];
      if (originalClip) {
        const startTimeSeconds =
          originalClip.display.from / MICROSECONDS_PER_SECOND;
        const originalLeft =
          startTimeSeconds *
          TIMELINE_CONSTANTS.PIXELS_PER_SECOND *
          timeline.timeScale;

        target.set("left", originalLeft);

        const tracks = timeline.tracks;
        const originalTrack = tracks.find((t) => t.clipIds.includes(clipId));
        if (originalTrack) {
          const originalRegion = timeline.trackRegions.find(
            (r) => r.id === originalTrack.id,
          );
          if (originalRegion) {
            target.set("top", originalRegion.top);
          }
        }
        target.setCoords();
      }
    }
  }

  timeline.clearSeparatorHighlights();
  timeline.setActiveSeparatorIndex(null);
  timeline.removeDragPlaceholder();
  timeline.clearPrimaryDragTarget();
  timeline.canvas.requestRenderAll();
}

export function handleClipModification(timeline: Timeline, options: any) {
  const target = options.target as FabricObject | undefined;
  if (!target) return;

  clearAuxiliaryObjects(timeline.canvas, timeline.canvas.getObjects());

  const targetAny = target as any;

  if (targetAny.type === "activeselection" && targetAny._objects) {
    // Skip: clips:modified is deferred to selection:cleared
    // so that the store only updates once the user deselects the group.
    return;
  } else {
    const clipId = targetAny.elementId;
    if (!clipId) return;

    let left = target.left || 0;
    const width = target.width || 0;

    if (left < 0) {
      left = 0;
      target.set("left", 0);
      target.setCoords();
    }

    let displayFrom = Math.round(
      (left / (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * timeline.timeScale)) *
        MICROSECONDS_PER_SECOND,
    );

    if (displayFrom < 0) displayFrom = 0;

    const duration = Math.round(
      (width / (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * timeline.timeScale)) *
        MICROSECONDS_PER_SECOND,
    );

    const trim = targetAny.trim;

    timeline.emit("clip:modified", {
      clipId,
      displayFrom,
      duration,
      trim,
    });
  }
}
