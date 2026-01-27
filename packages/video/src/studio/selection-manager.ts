import {
  type Application,
  type Container,
  Graphics,
  Point,
  Rectangle,
  type FederatedPointerEvent,
} from 'pixi.js';
import type { IClip } from '../clips/iclip';
import { Text } from '../clips/text-clip';
import { Caption } from '../clips/caption-clip';
import { Transformer } from '../transfomer/transformer';
import type { Studio } from '../studio';

export class SelectionManager {
  public selectedClips: Set<IClip> = new Set();
  public activeTransformer: Transformer | null = null;
  public interactiveClips: Set<IClip> = new Set(); // Track which clips have interactivity set up

  // Drag-to-select state
  public selectionGraphics: Graphics | null = null;
  public isDragSelecting = false;
  private dragSelectionStart = new Point();

  // Text/Caption realtime resize state
  private isUpdatingTextRealtime = false;
  private textClipResizedWidth: number | null = null;
  private textClipResizeHandle: string | null = null;
  private textClipResizedSx: number | null = null;
  private textClipResizedSy: number | null = null;

  constructor(private studio: Studio) {}

  public init(app: Application, artboard: Container) {
    // Initialize Selection Graphics (for rubber band selection)
    this.selectionGraphics = new Graphics();
    this.selectionGraphics.visible = false;
    this.selectionGraphics.zIndex = 1000; // Ensure it's on top
    artboard.addChild(this.selectionGraphics);

    // Make stage interactive to handle clicks and drag selection
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;

    app.stage.on('pointerdown', (e) => this.onStagePointerDown(e));
    app.stage.on('globalpointermove', (e) => this.onStagePointerMove(e));
    app.stage.on('pointerup', () => this.onStagePointerUp());
    app.stage.on('pointerupoutside', () => this.onStagePointerUp());
  }

  private onStagePointerDown(e: FederatedPointerEvent) {
    // Only start drag selection if clicking directly on stage (not on a child)
    // AND not initiating a transformer action (handled by transformer)
    if (e.target === this.studio.pixiApp?.stage) {
      // Clear selection first (standard behavior)
      if (!e.shiftKey) {
        this.deselectClip();
      }

      // Start drag selection
      this.isDragSelecting = true;
      // Convert global to artboard local space
      this.studio.artboard?.toLocal(
        e.global,
        undefined,
        this.dragSelectionStart
      );

      if (this.selectionGraphics) {
        this.selectionGraphics.clear();
        this.selectionGraphics.visible = true;
      }
    }
  }

  private onStagePointerMove(e: FederatedPointerEvent) {
    if (
      this.isDragSelecting &&
      this.selectionGraphics &&
      this.studio.artboard
    ) {
      const currentPos = this.studio.artboard.toLocal(e.global);

      const x = Math.min(this.dragSelectionStart.x, currentPos.x);
      const y = Math.min(this.dragSelectionStart.y, currentPos.y);
      const width = Math.abs(currentPos.x - this.dragSelectionStart.x);
      const height = Math.abs(currentPos.y - this.dragSelectionStart.y);

      this.selectionGraphics.clear();
      // Semi-transparent blue fill
      this.selectionGraphics
        .rect(x, y, width, height)
        .fill({ color: 0x0abde3, alpha: 0.3 });
      // Blue border
      this.selectionGraphics
        .rect(x, y, width, height)
        .stroke({ width: 2, color: 0x0abde3 });
    }
  }

  private onStagePointerUp() {
    if (
      this.isDragSelecting &&
      this.selectionGraphics &&
      this.studio.artboard
    ) {
      // Calculate final selection bounds
      const bounds = this.selectionGraphics.getBounds(); // Global bounds

      // Find intersecting clips
      const intersectingClips: IClip[] = [];

      // Standardize bounds for intersection check
      const selectionRect = new Rectangle(
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height
      );

      // Minimum drag distance check to avoid selecting on accidental micro-drags
      if (selectionRect.width > 2 || selectionRect.height > 2) {
        for (const clip of this.studio.clips) {
          const renderer = this.studio.spriteRenderers.get(clip);
          if (!renderer) continue;

          const root = renderer.getRoot();
          if (!root || !root.visible) continue;

          const clipBounds = root.getBounds();

          // Simple AABB intersection
          const intersects =
            selectionRect.x < clipBounds.x + clipBounds.width &&
            selectionRect.x + selectionRect.width > clipBounds.x &&
            selectionRect.y < clipBounds.y + clipBounds.height &&
            selectionRect.y + selectionRect.height > clipBounds.y;

          if (intersects) {
            intersectingClips.push(clip);
          }
        }

        if (intersectingClips.length > 0) {
          for (const clip of intersectingClips) {
            this.selectClip(clip, true); // true = addToSelection
          }
        }
      }

      // Cleanup
      this.selectionGraphics.clear();
      this.selectionGraphics.visible = false;
      this.isDragSelecting = false;
    }
  }

  /**
   * Setup sprite interactivity for click selection
   */
  public setupSpriteInteractivity(clip: IClip): void {
    // Skip if already set up
    if (this.interactiveClips.has(clip)) return;

    const renderer = this.studio.spriteRenderers.get(clip);
    if (renderer == null) return;

    const root = renderer.getRoot();
    if (root == null) return;

    // Make sprite interactive
    root.eventMode = 'static';
    root.cursor = 'pointer';

    // Add click handler that selects the topmost clip at the click position
    root.on('pointerdown', (e) => {
      // We use the Studio's method or duplicate the logic?
      // Let's use getTopmostClipAtPoint logic here (moved below)
      const topmostClip = this.getTopmostClipAtPoint(e.global);

      if (topmostClip) {
        // Select the topmost clip (pass shift key for multi-selection)
        this.selectClip(topmostClip, e.shiftKey);
      }

      // Don't stop propagation - let the event bubble up for transformer dragging
    });

    // Mark as interactive
    this.interactiveClips.add(clip);
  }

  /**
   * Find the topmost clip (highest zIndex) at a given point
   */
  public getTopmostClipAtPoint(globalPoint: {
    x: number;
    y: number;
  }): IClip | null {
    if (!this.studio.pixiApp) return null;

    let topmostClip: IClip | null = null;
    let highestZIndex = -Infinity;

    // Check all interactive clips
    for (const clip of this.interactiveClips) {
      const renderer = this.studio.spriteRenderers.get(clip);
      if (!renderer) continue;

      const root = renderer.getRoot();
      if (!root || !root.visible) continue;

      const localPoint = root.toLocal(globalPoint);
      const localBounds = root.getLocalBounds();

      if (
        localPoint.x >= localBounds.minX &&
        localPoint.x <= localBounds.maxX &&
        localPoint.y >= localBounds.minY &&
        localPoint.y <= localBounds.maxY
      ) {
        // This clip contains the point, check if it has higher zIndex
        if (clip.zIndex > highestZIndex) {
          highestZIndex = clip.zIndex;
          topmostClip = clip;
        }
      }
    }

    return topmostClip;
  }

  /**
   * Select a clip and show transform controls
   */
  public selectClip(clip: IClip, addToSelection: boolean = false): void {
    if (this.studio.destroyed || this.studio.pixiApp == null) return;

    // If not adding to selection, clear current selection
    if (!addToSelection) {
      this.deselectClip();
    }

    // Toggle selection if Shift is held
    if (addToSelection && this.selectedClips.has(clip)) {
      // Remove from selection
      this.selectedClips.delete(clip);
      this.recreateTransformer();

      this.studio.emit('selection:updated', {
        selected: Array.from(this.selectedClips),
      });
      return;
    }

    // Add to selection
    this.selectedClips.add(clip);
    this.recreateTransformer();

    if (addToSelection) {
      this.studio.emit('selection:updated', {
        selected: Array.from(this.selectedClips),
      });
    } else {
      this.studio.emit('selection:created', {
        selected: Array.from(this.selectedClips),
      });
    }
  }

  public selectClipsByIds(ids: string[]): void {
    const clipsToSelect = this.studio.clips.filter((c) => ids.includes(c.id));
    this.setSelection(clipsToSelect);
  }

  public setSelection(clips: IClip[]): void {
    if (this.studio.destroyed || this.studio.pixiApp == null) return;

    // Check if selection is effectively the same
    if (
      this.selectedClips.size === clips.length &&
      clips.every((c) => this.selectedClips.has(c))
    ) {
      return;
    }

    // Sync current selection before changing
    for (const clip of this.selectedClips) {
      this.syncSpriteToClipProperties(clip);
    }

    this.destroyTransformer();

    // Update selection
    this.selectedClips.clear();
    for (const clip of clips) {
      this.selectedClips.add(clip);
    }

    // Create new transformer
    if (this.selectedClips.size > 0) {
      this.createTransformer();
      this.studio.emit('selection:updated', {
        selected: Array.from(this.selectedClips),
      });
    } else {
      this.studio.emit('selection:cleared', { deselected: [] });
    }
  }

  public deselectClip(): void {
    if (this.selectedClips.size > 0) {
      for (const clip of this.selectedClips) {
        this.syncSpriteToClipProperties(clip);
      }
    }

    this.destroyTransformer();

    const deselected = Array.from(this.selectedClips);
    this.selectedClips.clear();

    if (deselected.length > 0) {
      this.studio.emit('selection:cleared', { deselected });
    }
  }

  public async move(dx: number, dy: number) {
    if (this.selectedClips.size === 0) return;

    const updates: { id: string; updates: Partial<IClip> }[] = [];
    for (const clip of this.selectedClips) {
      updates.push({
        id: clip.id,
        updates: {
          left: (clip.left ?? 0) + dx,
          top: (clip.top ?? 0) + dy,
        },
      });
    }

    await this.studio.updateClips(updates);

    // Refresh transformer bounds if active
    if (this.activeTransformer) {
      this.activeTransformer.updateBounds();
    }
  }

  public clear() {
    this.deselectClip();
    this.interactiveClips.clear();
  }

  private recreateTransformer() {
    this.destroyTransformer();
    if (this.selectedClips.size > 0) {
      this.createTransformer();
    }
  }

  private destroyTransformer() {
    if (this.activeTransformer != null) {
      if (this.activeTransformer.parent != null) {
        this.activeTransformer.parent.removeChild(this.activeTransformer);
      }
      this.activeTransformer.destroy();
      this.activeTransformer = null;
    }
  }

  private createTransformer(): void {
    if (
      this.studio.destroyed ||
      this.studio.artboard == null ||
      this.selectedClips.size === 0
    )
      return;

    // Collect sprites from all selected clips
    const sprites: Container[] = [];
    let singleClip: IClip | null = null;

    for (const clip of this.selectedClips) {
      const renderer = this.studio.spriteRenderers.get(clip);
      if (renderer == null) continue;

      const root = renderer.getRoot();
      if (root == null) continue;

      sprites.push(root);
      if (this.selectedClips.size === 1) {
        singleClip = clip;
      }
    }

    if (sprites.length === 0) {
      console.warn('Cannot create transformer: no sprites found');
      return;
    }

    // Create transformer
    this.activeTransformer = new Transformer({
      group: sprites,
      clip: singleClip, // Only pass clip for single selection
      artboardWidth: this.studio.opts.width,
      artboardHeight: this.studio.opts.height,
    });

    // Listen for events
    let rafId: number | null = null;
    this.activeTransformer.on('transforming', () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        this.syncSelectedClipsTransformsRealtime();
      });
    });

    this.activeTransformer.on('textClipResize', (data: any) => {
      this.textClipResizedWidth = data.newWidth;
      this.textClipResizeHandle = data.handle;
      this.textClipResizedSx = data.sx;
      this.textClipResizedSy = data.sy;
    });

    this.activeTransformer.on('transformEnd', async () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      await this.syncSelectedClipsTransforms();
      for (const clip of this.selectedClips) {
        this.studio.emit('clip:updated', { clip });
      }
    });

    this.activeTransformer.on('pointerdown', (e: any) => {
      const topmostClip = this.getTopmostClipAtPoint(e.global);
      if (topmostClip && !this.selectedClips.has(topmostClip)) {
        this.selectClip(topmostClip, e.shiftKey);
        e.stopPropagation();
      }
    });

    this.studio.artboard.addChild(this.activeTransformer);
  }

  // Copied Sync Logic
  private async syncSelectedClipsTransformsRealtime(): Promise<void> {
    if (this.selectedClips.size === 0 || this.activeTransformer == null) return;
    if (this.isUpdatingTextRealtime) return;
    this.isUpdatingTextRealtime = true;

    try {
      const activeHandle = this.activeTransformer.activeHandle;
      if (activeHandle !== 'mr' && activeHandle !== 'ml') return;

      for (const clip of this.selectedClips) {
        if (!(clip instanceof Text)) continue;

        const renderer = this.studio.spriteRenderers.get(clip);
        if (renderer == null) continue;

        const root = renderer.getRoot();
        const sprite = renderer.getSprite();
        if (root == null || sprite == null || sprite.texture == null) continue;

        const currentScaleX = Math.abs(root.scale.x * sprite.scale.x);
        if (currentScaleX === 1.0) continue;

        const preservedLeft = clip.left;
        const preservedTop = clip.top;
        const preservedWidth = clip.width;
        const textureWidth = sprite.texture.width;
        const newWidth = currentScaleX * textureWidth;

        await clip.updateStyle({
          wordWrap: true,
          wordWrapWidth: newWidth,
        });

        const newTexture = await clip.getTexture();
        if (newTexture) {
          await renderer.updateFrame(newTexture);
          sprite.scale.set(1, 1);
          root.scale.set(1, 1);

          if (activeHandle === 'ml') {
            clip.left = preservedLeft + preservedWidth - clip.width;
          } else {
            clip.left = preservedLeft;
          }
          clip.top = preservedTop;

          root.x = clip.left + clip.width / 2;
          root.y = clip.top + clip.height / 2;

          this.activeTransformer.updateBounds();
        }
      }
    } finally {
      this.isUpdatingTextRealtime = false;
    }
  }

  private async syncSelectedClipsTransforms(): Promise<void> {
    if (this.selectedClips.size === 0 || this.activeTransformer == null) return;

    for (const clip of this.selectedClips) {
      const renderer = this.studio.spriteRenderers.get(clip);
      if (renderer == null) continue;

      const root = renderer.getRoot();
      const sprite = renderer.getSprite();
      if (root == null || sprite == null || sprite.texture == null) continue;

      const textureWidth = sprite.texture.width;
      const textureHeight = sprite.texture.height;

      const newWidth = Math.abs(root.scale.x * sprite.scale.x) * textureWidth;
      const newHeight = Math.abs(root.scale.y * sprite.scale.y) * textureHeight;

      const finalNewWidth =
        (clip instanceof Text || clip instanceof Caption) &&
        this.textClipResizedWidth !== null
          ? this.textClipResizedWidth
          : newWidth;

      const oldWidth = clip.width;
      const oldFontSize = (clip as any).style?.fontSize ?? 16;
      const newFontSize =
        oldFontSize *
        Math.max(this.textClipResizedSx || 1, this.textClipResizedSy || 1);

      // position calculation
      // root is center.
      let newRootX = root.x;

      const isReflowableTextClip =
        (clip instanceof Text || clip instanceof Caption) &&
        this.textClipResizedWidth !== null;
        

      if (isReflowableTextClip) {
        const styleUpdate: any = {
          wordWrap: true,
          wordWrapWidth: finalNewWidth,
        };

        if (this.textClipResizeHandle === 'mr') {
          newRootX = clip.left + finalNewWidth / 2;
          root.x = newRootX;
        } else if (this.textClipResizeHandle === 'ml') {
          newRootX = clip.left + finalNewWidth / 2 - (finalNewWidth - oldWidth);
          root.x = newRootX;
        } else if (['br', 'tr'].includes(this.textClipResizeHandle!)) {
          newRootX = clip.left + finalNewWidth / 2;
          styleUpdate.fontSize = newFontSize;
        } else if (['bl', 'tl'].includes(this.textClipResizeHandle!)) {
          newRootX = clip.left + finalNewWidth / 2 - (finalNewWidth - oldWidth);
          styleUpdate.fontSize = newFontSize;
        }

        await clip.updateStyle(styleUpdate);
        const newTexture = await clip.getTexture();

        if (newTexture) {
          await renderer.updateFrame(newTexture);
          clip.width = finalNewWidth;
          clip.height = newTexture.height;
          this.textClipResizedWidth = null;

          clip.left = newRootX - clip.width / 2;
          clip.top = root.y - clip.height / 2;

          sprite.scale.set(1, 1);
          root.scale.set(1, 1);
        }
      } else {

        let logicalWidth = newWidth;
        let logicalHeight = newHeight;

        if (clip instanceof Caption) {
          logicalWidth = Math.max(1, newWidth - 30);
          logicalHeight = Math.max(1, newHeight - 30);
        }

        clip.left = root.x - logicalWidth / 2;
        clip.top = root.y - logicalHeight / 2;
        clip.width = logicalWidth;
        clip.height = logicalHeight;

        const flipFactor = clip.flip == null ? 1 : -1;
        clip.angle = flipFactor * root.angle;
      }
    }

    if (this.activeTransformer != null) {
      this.activeTransformer.updateBounds();
    }

    for (const clip of this.selectedClips) {
      const renderer = this.studio.spriteRenderers.get(clip);
      if (renderer != null) {
        renderer.updateTransforms();
      }
    }
  }

  private syncSpriteToClipProperties(clip: IClip): void {
    // Same logic as Studio
    const renderer = this.studio.spriteRenderers.get(clip);
    if (renderer != null) {
      const root = renderer.getRoot();
      const sprite = renderer.getSprite();
      if (root != null && sprite != null && sprite.texture != null) {
        const textureWidth = sprite.texture.width;
        const textureHeight = sprite.texture.height;

        const newWidth = Math.abs(root.scale.x * sprite.scale.x) * textureWidth;
        const newHeight =
          Math.abs(root.scale.y * sprite.scale.y) * textureHeight;
        
        let logicalWidth = newWidth;
        let logicalHeight = newHeight;

        if (clip instanceof Caption) {
          // Subtract 30px (15px bleed on each side) to get logical dimensions
          logicalWidth = Math.max(1, newWidth - 30);
          logicalHeight = Math.max(1, newHeight - 30);
        }

        const newLeft = root.x - logicalWidth / 2;
        const newTop = root.y - logicalHeight / 2;


        clip.left = newLeft;
        clip.top = newTop;
        clip.width = logicalWidth;
        clip.height = logicalHeight;

        const flipFactor = clip.flip == null ? 1 : -1;
        clip.angle = flipFactor * root.angle;

        renderer.updateTransforms();
        this.studio.emit('clip:updated', { clip });
      }
    }
  }

  public async deleteSelected() {
    return this.studio.deleteSelected();
  }
}
