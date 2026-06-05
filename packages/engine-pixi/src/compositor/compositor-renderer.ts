import { Application, Container } from "pixi.js";
import { type IClip, Transition } from "../clips";
import { PixiSpriteRenderer } from "../sprite/pixi-sprite-renderer";
import { TransitionManager } from "./transition-manager";
import { EffectManager } from "./effect-manager";

export interface ISpritesRenderOpts {
  pixiApp: Application | null;
  backgroundColor: string;
  sprites: Array<IClip & { main: boolean; expired: boolean }>;
  aborter: { aborted: boolean };
  scaleX: number;
  scaleY: number;
}

export interface ISpritesRenderResult {
  render: (timestamp: number) => Promise<{
    audios: Float32Array[][];
    mainSprDone: boolean;
    hasVideo: boolean;
  }>;
  cleanup: () => void;
}

/**
 * Creates the renderer pipeline for compositor frames.
 * Delegates actual transition handling, asset transformations, styles/filters,
 * and global effects pipeline execution to separate managers.
 */
export function createSpritesRender(opts: ISpritesRenderOpts): ISpritesRenderResult {
  const { pixiApp, sprites, aborter, scaleX, scaleY } = opts;
  const hasVideoTrack = pixiApp != null;

  // Map to store PixiSpriteRenderer instances for each clip (only for video)
  const spriteRenderers = new Map<
    IClip & { main: boolean; expired: boolean },
    PixiSpriteRenderer
  >();

  const transitionManager =
    hasVideoTrack && pixiApp ? new TransitionManager(pixiApp, scaleX, scaleY) : null;
  const effectManager = hasVideoTrack && pixiApp ? new EffectManager(pixiApp, hasVideoTrack) : null;

  // Containers for global effect rendering and transitions
  let clipsEffectContainer: Container | null = null;
  let clipsNormalContainer: Container | null = null;
  let postProcessContainer: Container | null = null;

  if (hasVideoTrack && pixiApp != null) {
    clipsEffectContainer = new Container();
    clipsNormalContainer = new Container();
    postProcessContainer = new Container();

    // Apply scale to map from original project dimensions to export dimensions
    clipsNormalContainer.scale.set(scaleX, scaleY);
    clipsEffectContainer.scale.set(scaleX, scaleY);
    postProcessContainer.scale.set(scaleX, scaleY);

    clipsNormalContainer.sortableChildren = true;
    postProcessContainer.sortableChildren = true;

    pixiApp.stage.addChild(clipsNormalContainer);
    pixiApp.stage.addChild(postProcessContainer);
    clipsEffectContainer.visible = false;
    pixiApp.stage.addChild(clipsEffectContainer);
  }

  // Pre-sort sprites once as they don't change during encoding
  const sortedSprites = [...sprites].sort((a, b) => a.zIndex - b.zIndex);

  // Pre-build ID→sprite lookup map to avoid O(n) .find() scans per frame
  const spriteById = new Map<string, (typeof sprites)[number]>();
  // Pre-build index map for track-order comparisons in effects pipeline
  const spriteIndexById = new Map<string, number>();
  for (let i = 0; i < sprites.length; i++) {
    spriteById.set(sprites[i].id, sprites[i]);
    spriteIndexById.set(sprites[i].id, i);
  }

  const render = async (timestamp: number) => {
    const audios: Float32Array[][] = [];
    let mainSprDone = false;
    let hasVideo = false;

    // Cache to store getFrame results for each clip at the current timestamp
    const frameCache = new Map<IClip, { video: any; audio: Float32Array[]; done: boolean }>();

    const getFrameCached = async (sprite: IClip, relTime: number) => {
      if (frameCache.has(sprite)) return frameCache.get(sprite)!;
      const res = await sprite.getFrame(relTime);
      frameCache.set(sprite, res);
      return res;
    };

    // Reset all transition sprites for each frame
    if (transitionManager) {
      transitionManager.resetFrame();
    }

    // Track clip IDs claimed by active transitions this frame
    const clipsClaimedByTransition = new Set<string>();

    for (const sprite of sortedSprites) {
      if (aborter.aborted) break;

      const exceededDisplayTo = sprite.display.to > 0 && timestamp >= sprite.display.to;
      if (exceededDisplayTo) {
        sprite.expired = true;
      }

      if (timestamp < sprite.display.from || sprite.expired) {
        // Even if expired, we might need to hide renderer
        if (hasVideoTrack && pixiApp != null) {
          const renderer = spriteRenderers.get(sprite);
          if (renderer) {
            await renderer.updateFrame(null);
          }
        }
        continue;
      }

      const relativeTime = timestamp - sprite.display.from;
      const spriteTime = relativeTime * sprite.playbackRate;

      // Update sprite animation properties FIRST
      sprite.animate(spriteTime);

      // ── Text / Caption fast-path ─────────────────────────────────────────────
      if (
        hasVideoTrack &&
        pixiApp != null &&
        clipsNormalContainer != null &&
        (sprite.type === "Text" || sprite.type === "Caption")
      ) {
        // Caption clips need their highlighting state updated before rendering
        if (sprite.type === "Caption" && typeof (sprite as any).updateState === "function") {
          (sprite as any).updateState(relativeTime * sprite.playbackRate);
        }

        // Ensure the clip renders into the compositor's WebGL context
        if (typeof (sprite as any).setRenderer === "function") {
          (sprite as any).setRenderer(pixiApp.renderer);
        }

        // Get or create a PixiSpriteRenderer for this clip
        let textRenderer = spriteRenderers.get(sprite);
        if (textRenderer == null) {
          textRenderer = new PixiSpriteRenderer(pixiApp, sprite, clipsNormalContainer);
          spriteRenderers.set(sprite, textRenderer);
        }

        const claimedByTransition = clipsClaimedByTransition.has(sprite.id);
        if (!claimedByTransition) {
          const textTexture = await (sprite as any).getTexture();
          if (textTexture != null) {
            hasVideo = true;
            const tRoot = textRenderer.getRoot();
            if (tRoot) tRoot.visible = true;
            await textRenderer.updateFrame(textTexture);
          }
        } else {
          const tRoot = textRenderer.getRoot();
          if (tRoot) tRoot.visible = false;
          await textRenderer.updateFrame(null);
        }
        textRenderer.updateTransforms();

        // Text/Caption clips carry no audio
        audios.push([]);

        // Handle expiry the same way as the generic path
        const exceededDuration = sprite.duration > 0 && relativeTime > sprite.duration;
        const exceededDisplayToAfter = sprite.display.to > 0 && timestamp >= sprite.display.to;
        if (exceededDuration || exceededDisplayToAfter) {
          if (sprite.main) mainSprDone = true;
          sprite.expired = true;
          const tRoot = textRenderer.getRoot();
          if (tRoot) tRoot.visible = false;
        }

        continue; // Skip the generic getFrame() / ImageBitmap path below
      }
      // ── End Text / Caption fast-path ─────────────────────────────────────────

      // Get video frame and audio from sprite (using cache)
      const { video, audio, done } = await getFrameCached(sprite, relativeTime);

      // Process audio
      audios.push(audio);

      const isTransitionable = sprite.type === "Video" || sprite.type === "Image";
      const transitionStartTime = sprite.transition ? sprite.transition.start! : 0;
      const transitionEndTime = sprite.transition ? sprite.transition.end! : 0;
      const inTransition =
        isTransitionable &&
        sprite.transition &&
        timestamp >= transitionStartTime &&
        timestamp < transitionEndTime;

      // Handle video rendering if we have a Pixi app
      if (
        hasVideoTrack &&
        pixiApp != null &&
        clipsNormalContainer != null &&
        transitionManager != null
      ) {
        if (sprite instanceof Transition) {
          const fromClip = spriteById.get(sprite.fromClipId ?? "");
          const toClip = spriteById.get(sprite.toClipId ?? "");

          if (fromClip && toClip) {
            const didRender = await transitionManager.renderTransition({
              sprite,
              timestamp,
              fromClip,
              toClip,
              getFrameCached,
              clipsNormalContainer,
              clipsClaimedByTransition,
              onVideoState: () => {
                hasVideo = true;
              },
            });

            if (didRender) {
              // Set the individual renderers of from/to clips to hidden
              const fromRenderer = spriteRenderers.get(fromClip as any);
              if (fromRenderer) {
                const root = fromRenderer.getRoot();
                if (root) root.visible = false;
              }

              const toRenderer = spriteRenderers.get(toClip as any);
              if (toRenderer) {
                const root = toRenderer.getRoot();
                if (root) root.visible = false;
              }
              continue;
            }
          }
        }

        let renderer = spriteRenderers.get(sprite);
        if (renderer == null && video != null) {
          renderer = new PixiSpriteRenderer(pixiApp, sprite, clipsNormalContainer);
          spriteRenderers.set(sprite, renderer);
        }

        if (renderer != null) {
          const root = renderer.getRoot();
          const claimedByTransition = clipsClaimedByTransition.has(sprite.id);
          if (video != null && !inTransition && !claimedByTransition) {
            hasVideo = true;
            if (root) root.visible = true;
            await renderer.updateFrame(video);
          } else {
            if (root) root.visible = false;
            await renderer.updateFrame(null);
          }

          renderer.updateTransforms();
        }
      }

      // Check if sprite is done or expired
      const exceededDuration = sprite.duration > 0 && relativeTime > sprite.duration;
      const exceededDisplayToAfter = sprite.display.to > 0 && timestamp >= sprite.display.to;
      if (exceededDuration || exceededDisplayToAfter || done) {
        if (sprite.main) mainSprDone = true;

        // Mark as expired but DON'T destroy yet
        sprite.expired = true;

        // Clean up renderer if it exists
        if (hasVideoTrack) {
          const renderer = spriteRenderers.get(sprite);
          if (renderer != null) {
            const root = renderer.getRoot();
            if (root) root.visible = false;
          }
        }
      }
    }

    // Handle Global Effects rendering
    if (
      hasVideoTrack &&
      pixiApp != null &&
      clipsEffectContainer != null &&
      clipsNormalContainer != null &&
      postProcessContainer != null &&
      effectManager != null
    ) {
      // Map transition sprites to transitionManager sprites Map
      const transitionSpritesMap = new Map();
      for (const sprite of sprites) {
        if (sprite instanceof Transition) {
          const transSprite = transitionManager?.getTransitionSprite(sprite.id);
          if (transSprite) {
            transitionSpritesMap.set(sprite.id, transSprite);
          }
        }
      }

      await effectManager.processEffects({
        timestamp,
        sprites,
        spriteById,
        spriteIndexById,
        spriteRenderers,
        transitionSprites: transitionSpritesMap,
        clipsEffectContainer,
        clipsNormalContainer,
        postProcessContainer,
      });
    }

    // Render the entire Pixi.js scene (only if we have video track and app is ready)
    if (hasVideoTrack && pixiApp != null) {
      pixiApp.render();
    }

    return {
      audios,
      mainSprDone,
      hasVideo,
    };
  };

  const cleanup = () => {
    if (transitionManager) {
      transitionManager.cleanup();
    }
    if (effectManager) {
      effectManager.cleanup();
    }

    // Clean up containers
    if (clipsEffectContainer) clipsEffectContainer.destroy({ children: true });
    if (clipsNormalContainer) clipsNormalContainer.destroy({ children: true });
    if (postProcessContainer) postProcessContainer.destroy({ children: true });

    // Clean up all sprite renderers
    spriteRenderers.forEach((renderer) => {
      renderer.destroy();
    });
    spriteRenderers.clear();
  };

  return { render, cleanup };
}
