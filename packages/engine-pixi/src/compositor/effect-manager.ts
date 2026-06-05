import { Application, Container, RenderTexture, Sprite, Filter, Texture } from "pixi.js";
import { type IClip, Effect } from "../clips";
import { makeEffect } from "../effect/effect";
import { PixiSpriteRenderer } from "../sprite/pixi-sprite-renderer";

export class EffectManager {
  private pixiApp: Application;
  private effectCache = new Map<string, { filter: Filter; render: (opts: any) => Texture }>();
  private effectInputTexture: RenderTexture | null = null;

  constructor(pixiApp: Application, hasVideoTrack: boolean) {
    this.pixiApp = pixiApp;
    this.effectInputTexture = hasVideoTrack
      ? RenderTexture.create({
          width: pixiApp.renderer.width,
          height: pixiApp.renderer.height,
        })
      : null;
  }

  /**
   * Processes all active global and adjustment layer effects at the given timestamp.
   */
  public async processEffects(opts: {
    timestamp: number;
    sprites: Array<IClip & { expired?: boolean }>;
    spriteById: Map<string, IClip>;
    spriteIndexById: Map<string, number>;
    spriteRenderers: Map<IClip & { expired?: boolean }, PixiSpriteRenderer>;
    transitionSprites: Map<string, Sprite>;
    clipsEffectContainer: Container;
    clipsNormalContainer: Container;
    postProcessContainer: Container;
  }): Promise<void> {
    const {
      timestamp,
      sprites,
      spriteById,
      spriteIndexById,
      spriteRenderers,
      transitionSprites,
      clipsEffectContainer,
      clipsNormalContainer,
      postProcessContainer,
    } = opts;

    if (!this.effectInputTexture) return;

    // 1. Collect all active global and adjustment layer effects
    const activeGlobalEffects: Array<{
      id: string;
      key: string;
      startTime: number;
      duration: number;
      zIndex: number;
      values?: Record<string, any>;
    }> = [];

    for (const sprite of sprites) {
      if (sprite instanceof Effect) {
        if (timestamp >= sprite.display.from && timestamp < sprite.display.from + sprite.duration) {
          activeGlobalEffects.push({
            id: sprite.id,
            key: (sprite as Effect).effectKey,
            startTime: sprite.display.from,
            duration: sprite.duration,
            zIndex: sprite.zIndex,
            values: (sprite as Effect).values,
          });
        }
      }

      // Check for attached effects (legacy)
      if (sprite.effects && sprite.effects.length > 0) {
        for (const effect of sprite.effects) {
          if (timestamp >= effect.startTime && timestamp < effect.startTime + effect.duration) {
            // Attached effects use the clip's zIndex for sorting
            activeGlobalEffects.push({
              ...effect,
              zIndex: sprite.zIndex,
            });
          }
        }
      }
    }

    // 2. Sort effects bottom-up by zIndex
    activeGlobalEffects.sort((a, b) => a.zIndex - b.zIndex);

    // Clean post process container
    postProcessContainer.removeChildren();

    // Reset all clips to normal container first
    for (const renderer of spriteRenderers.values()) {
      const root = renderer.getRoot();
      if (root && root.parent !== clipsNormalContainer) {
        if (root.parent) (root.parent as Container).removeChild(root);
        clipsNormalContainer.addChild(root);
      }
    }

    if (activeGlobalEffects.length > 0) {
      const width = this.pixiApp.renderer.width;
      const height = this.pixiApp.renderer.height;

      let lastResultTexture: Texture | null = null;
      const processedClips = new Set<string>();

      for (const effect of activeGlobalEffects) {
        const { key, startTime, duration, id, zIndex } = effect;
        const elapsed = timestamp - startTime;
        const progress = duration > 0 ? Math.min(Math.max(elapsed / duration, 0), 1) : 0;

        // Check if this is an Adjustment Layer Effect
        const adjSprite = spriteById.get(id);
        const isAdjustmentLayer = adjSprite != null && adjSprite instanceof Effect;

        clipsEffectContainer.removeChildren();

        // If we have a previous result, add it bottom-most
        if (lastResultTexture) {
          const prevSprite = new Sprite(lastResultTexture);
          prevSprite.width = width;
          prevSprite.height = height;
          clipsEffectContainer.addChild(prevSprite);
        }

        // Move affected clips that are BELOW this effect layer
        const effectIdx = spriteIndexById.get(id) ?? -1;

        for (const sprite of sprites) {
          if (processedClips.has(sprite.id)) continue;

          let shouldApply = false;
          if (isAdjustmentLayer) {
            if (sprite.id === id) continue;
            const sprIdx = spriteIndexById.get(sprite.id) ?? -1;
            shouldApply =
              sprite.zIndex < zIndex || (sprite.zIndex === zIndex && sprIdx > effectIdx);
          } else {
            // Legacy attached effect
            shouldApply = !!sprite.effects && sprite.effects.some((e) => e.id === id);
          }

          if (shouldApply) {
            const renderer = spriteRenderers.get(sprite);
            if (renderer) {
              const root = renderer.getRoot();
              if (root) {
                if (root.parent) (root.parent as Container).removeChild(root);
                clipsEffectContainer.addChild(root);
                processedClips.add(sprite.id);
              }
            }

            // Also check for Transition Sprite
            const transSprite = transitionSprites.get(sprite.id);
            if (transSprite) {
              if (transSprite.parent) (transSprite.parent as Container).removeChild(transSprite);
              clipsEffectContainer.addChild(transSprite);
              processedClips.add(sprite.id);
            }
          }
        }

        if (clipsEffectContainer.children.length > 0) {
          let effectCached = this.effectCache.get(id);
          if (!effectCached) {
            try {
              const res = await makeEffect({
                name: key as any,
                renderer: this.pixiApp.renderer,
                values: effect.values,
              });
              if (res && res.filter) {
                effectCached = { filter: res.filter, render: res.render };
                this.effectCache.set(id, effectCached);
              }
            } catch (e) {
              console.warn("Failed to create effect", key, e);
            }
          }

          if (effectCached) {
            const { filter, render: effectRenderFunc } = effectCached;
            if (filter.resources && filter.resources.effectUniforms) {
              filter.resources.effectUniforms.uniforms.uTime = progress;
            }

            clipsEffectContainer.visible = true;
            this.pixiApp.renderer.render({
              container: clipsEffectContainer,
              target: this.effectInputTexture!,
              clear: true,
            });
            clipsEffectContainer.visible = false;

            if (effectRenderFunc) {
              const resultTexture = effectRenderFunc({
                canvasTexture: this.effectInputTexture!,
                progress,
                width,
                height,
              });
              lastResultTexture = resultTexture;
            }
          }
        }
      }

      if (lastResultTexture) {
        const resultSprite = new Sprite(lastResultTexture);
        resultSprite.width = width;
        resultSprite.height = height;
        postProcessContainer.addChild(resultSprite);

        // Move clips that are ABOVE all effects into postProcessContainer
        for (const sprite of sprites) {
          if (processedClips.has(sprite.id)) continue;
          if (sprite instanceof Effect) continue;
          if (sprite.expired) continue;

          const renderer = spriteRenderers.get(sprite);
          if (renderer) {
            const root = renderer.getRoot();
            if (root && root.visible) {
              if (root.parent) (root.parent as Container).removeChild(root);
              postProcessContainer.addChild(root);
            }
          }
        }
      }
    }
  }

  public cleanup(): void {
    if (this.effectInputTexture) {
      this.effectInputTexture.destroy(true);
    }
    this.effectCache.clear();
  }
}
