import { type FabricObject, util } from "fabric";
import type Timeline from "../canvas";
import { clearAuxiliaryObjects } from "../guidelines/utils";
import { generateUUID } from "@/utils/id";
import {
  type ITimelineTrack,
  MICROSECONDS_PER_SECOND,
  type TrackType,
  type IClip,
} from "@/types/timeline";
import { TIMELINE_CONSTANTS } from "../../timeline-constants";
import { handleDragend, handleSelectionClear } from "./selection";

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
  // Always clear pending shifts so they don't linger between drops
  const pendingShifts = timeline.getPendingShifts();

  // ---------------------------------------------------------
  // 1. Handle Drop on Separator (Prioritized)
  // ---------------------------------------------------------
  if (timeline.activeSeparatorIndex !== null) {
    // --- MULTI-CLIP SEPARATOR DROP ---
    if (
      targetAny.type === "activeselection" ||
      target.type === "activeselection"
    ) {
      const selection = target as any;
      const selectedObjects = selection._objects || [];
      const separatorIndex = timeline.activeSeparatorIndex;
      const placeholderLeft = placeholder?.left || 0;

      // 1. Calculate deltas for positioning
      const pdt = timeline.primaryDragTarget as any;
      const primaryTarget = pdt || selectedObjects[0];
      const matrix = selection.calcTransformMatrix(true);
      const primaryAbsPoint = util.transformPoint(
        { x: primaryTarget.left, y: primaryTarget.top },
        matrix,
      );
      const deltaX = placeholderLeft - primaryAbsPoint.x;

      // 2. Map and group objects by their ORIGINAL track to preserve vertical layout
      const clipsToMove: {
        id: string;
        sourceTrackIdx: number;
        displayFrom: number;
        clip: IClip;
      }[] = [];

      selectedObjects.forEach((obj: any) => {
        const clipId = obj.elementId;
        const clip = timeline.clipsMap[clipId];
        if (!clip) return;

        const sourceTrackIdx = timeline.tracks.findIndex((t) =>
          t.clipIds.includes(clipId),
        );
        const objAbsPoint = util.transformPoint(
          { x: obj.left, y: obj.top },
          matrix,
        );
        let newX = objAbsPoint.x + deltaX;
        if (newX < 0) newX = 0;

        const displayFrom = Math.round(
          (newX / (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * timeline.timeScale)) *
            MICROSECONDS_PER_SECOND,
        );

        clipsToMove.push({ id: clipId, sourceTrackIdx, displayFrom, clip });
      });

      // Sort source tracks to find the relative row offsets
      const uniqueSourceTrackIndices = [
        ...new Set(clipsToMove.map((c) => c.sourceTrackIdx)),
      ].sort((a, b) => a - b);

      // 3. Create a map of sourceTrackIdx -> newTrackId
      const newTracksList = [...timeline.tracks];
      const sourceToNewTrackId = new Map<number, string>();
      const newTracksToInsert: ITimelineTrack[] = [];

      uniqueSourceTrackIndices.forEach((sourceIdx, relativeRow) => {
        const newTrackId = generateUUID();
        const firstClipIdInRow = clipsToMove.find(
          (c) => c.sourceTrackIdx === sourceIdx,
        )?.id;
        const clip = firstClipIdInRow
          ? timeline.clipsMap[firstClipIdInRow]
          : null;

        let newTrackType: TrackType = "Video";
        if (clip) {
          if (clip.type === "Audio") newTrackType = "Audio";
          else if (clip.type === "Text" || clip.type === "Caption")
            newTrackType = "Text";
          else if (clip.type === "Effect") newTrackType = "Effect";
        }

        const newTrack: ITimelineTrack = {
          id: newTrackId,
          type: newTrackType,
          name: `${newTrackType} Track`,
          clipIds: [],
          muted: false,
        };
        newTracksToInsert.push(newTrack);
        sourceToNewTrackId.set(sourceIdx, newTrackId);
      });

      // Insert the batch of new tracks at separatorIndex
      newTracksList.splice(separatorIndex, 0, ...newTracksToInsert);

      // 4. Update track assignments and positions
      clipsToMove.forEach(({ id, sourceTrackIdx, displayFrom }) => {
        // Remove from current tracks
        newTracksList.forEach((t) => {
          t.clipIds = t.clipIds.filter((cid) => cid !== id);
        });

        // Add to new track
        const newTrackId = sourceToNewTrackId.get(sourceTrackIdx);
        const targetTrack = newTracksList.find((t) => t.id === newTrackId);
        if (targetTrack) {
          targetTrack.clipIds.push(id);
        }

        updateClipTimeLocally(timeline, id, displayFrom);
      });

      // Cleanup empty tracks and finalize
      const filteredTracks = newTracksList.filter((t) => t.clipIds.length > 0);
      timeline.setTracksInternal(filteredTracks);
      timeline.render();
      timeline.emit("timeline:updated", { tracks: filteredTracks });

      // Emit clips:modified for the move
      timeline.emit("clips:modified", {
        clips: clipsToMove.map((c) => ({
          clipId: c.id,
          displayFrom: c.displayFrom,
        })),
      });

      timeline.clearSeparatorHighlights();
      timeline.setActiveSeparatorIndex(null);
      timeline.removeDragPlaceholder();
      timeline.clearPrimaryDragTarget();
      timeline.canvas.discardActiveObject();
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

      if (currentTrackIndex === -1) {
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

      timeline.emit("clip:modified", {
        clipId,
        displayFrom: newDisplayFrom,
        duration: clip.duration,
      });

      timeline.clearSeparatorHighlights();
      timeline.setActiveSeparatorIndex(null);
      timeline.removeDragPlaceholder();
      timeline.clearPrimaryDragTarget();
      return;
    }
  }

  // ---------------------------------------------------------
  // 3. Placeholder snap (Normal Track drops)
  // ---------------------------------------------------------
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

          const newTop = objAbsPoint.y + deltaY;

          const width =
            (obj.width || 0) * (obj.scaleX || 1) * (selection.scaleX || 1);

          return {
            elementId: obj.elementId,
            left: newLeft,
            top: newTop,
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
        simulated.forEach((sim: any) => {
          const obj = selectedObjects.find(
            (o: any) => o.elementId === sim.elementId,
          );
          if (!obj) return;

          obj.set({
            left: sim.left,
            top: sim.top,
          });

          obj.setCoords();
        });

        handleDragend(timeline, {
          deselected: selectedObjects,
        });
        timeline.canvas.discardActiveObject();
        timeline.canvas.requestRenderAll();
      }
    } else {
      // Single clip: snap directly to placeholder
      target.set({ left: placeholderLeft, top: placeholderTop });
      target.setCoords();
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
      // Use the placeholder's computed left if available (already accounts for snap)
      const placeholder = timeline.dragPlaceholder;
      let left =
        placeholder && placeholder.visible
          ? placeholder.left || 0
          : Math.max(0, target.left || 0);
      if (left < 0) left = 0;

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

      // -------------------------------------------------------
      // Push-to-fit: if there are pending shifts recorded by the
      // placeholder, it means the dragged clip should land at
      // `left` and all blocking clips to the right should shift.
      // -------------------------------------------------------
      if (pendingShifts.size > 0) {
        // Verify all shifts belong to this track (safety check)
        const trackClipIds = new Set(targetTrack?.clipIds ?? []);
        const allShiftsOnThisTrack = [...pendingShifts.keys()].every((id) =>
          trackClipIds.has(id),
        );

        if (allShiftsOnThisTrack) {
          // 1. Apply and emit each shifted sibling individually
          for (const [shiftedClipId, newPixelLeft] of pendingShifts) {
            const shiftedClip = timeline.clipsMap[shiftedClipId];
            if (!shiftedClip) continue;

            const newDisplayFrom = Math.round(
              (newPixelLeft /
                (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * timeline.timeScale)) *
                MICROSECONDS_PER_SECOND,
            );

            updateClipTimeLocally(timeline, shiftedClipId, newDisplayFrom);
            // Emit individually — same as any other clip move, include existing trim
            timeline.emit("clip:modified", {
              clipId: shiftedClipId,
              displayFrom: newDisplayFrom,
              duration: shiftedClip.duration,
              trim: shiftedClip.trim,
            });
          }

          // 2. Place the dragged clip at the placeholder position
          updateClipTimeLocally(timeline, clipId, proposedStart);
          const trim = targetAny.trim;
          timeline.emit("clip:modified", {
            clipId,
            displayFrom: proposedStart,
            duration: proposedDuration,
            trim,
          });

          // 3. Move clip to target track if it changed tracks
          target.set("top", trackRegion.top);
          target.setCoords();

          const originalTrack = timeline.tracks.find((t) =>
            t.clipIds.includes(clipId),
          );
          if (!originalTrack || originalTrack.id !== trackRegion.id) {
            const updatedTracks = timeline.tracks
              .map((t) => {
                if (t.id === originalTrack?.id) {
                  return {
                    ...t,
                    clipIds: t.clipIds.filter((id) => id !== clipId),
                  };
                }
                if (t.id === trackRegion.id) {
                  return { ...t, clipIds: [...t.clipIds, clipId] };
                }
                return t;
              })
              .filter((t) => t.clipIds.length > 0);
            timeline.setTracksInternal(updatedTracks);
            timeline.emit("timeline:updated", { tracks: updatedTracks });
          }

          // 4. Re-render immediately so siblings visually move to their new positions
          timeline.render();

          timeline.clearPendingShifts();
          // Clear originals WITHOUT reverting — render() already committed the new positions
          timeline.clearShiftedOriginals();
          timeline.clearSeparatorHighlights();
          timeline.setActiveSeparatorIndex(null);
          timeline.removeDragPlaceholder();
          timeline.clearPrimaryDragTarget();
          timeline.canvas.requestRenderAll();
          return;
        }
      }

      // -------------------------------------------------------
      // Normal overlap check (no pending push-shifts)
      // -------------------------------------------------------
      let hasOverlap = false;

      if (targetTrack) {
        for (const otherClipId of targetTrack.clipIds) {
          if (otherClipId === clipId) continue;
          const otherClip = timeline.clipsMap[otherClipId];
          if (!otherClip) continue;

          const otherStart = otherClip.display.from;
          const otherEnd = otherClip.display.to;

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

  timeline.clearPendingShifts();
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
