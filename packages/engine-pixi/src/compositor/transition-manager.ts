import { Application, Container, RenderTexture, Sprite, Graphics, Texture } from "pixi.js";
import { type IClip, Transition } from "../clips";
import { makeTransition } from "../transition/transition";
import { applyClipStylesAndFilters, type IPooledClipObjects } from "./clip-style-renderer";

export class TransitionManager {
  private pixiApp: Application;
  private scaleX: number;
  private scaleY: number;

  private transitionRenderers = new Map<string, ReturnType<typeof makeTransition>>();
  private transitionSprites = new Map<string, Sprite>();
  private transFromTexture: RenderTexture;
  private transToTexture: RenderTexture;
  private transBgGraphics: Graphics;

  // Pooled scene objects for renderClipToTransitionTexture, keyed by clip ID.
  // Avoids creating+destroying Container/Sprite/Graphics on every frame during transitions.
  private transClipPool = new Map<string, IPooledClipObjects>();

  constructor(pixiApp: Application, scaleX: number, scaleY: number) {
    this.pixiApp = pixiApp;
    this.scaleX = scaleX;
    this.scaleY = scaleY;

    this.transFromTexture = RenderTexture.create({
      width: pixiApp.renderer.width,
      height: pixiApp.renderer.height,
    });
    this.transToTexture = RenderTexture.create({
      width: pixiApp.renderer.width,
      height: pixiApp.renderer.height,
    });

    this.transBgGraphics = new Graphics()
      .rect(0, 0, pixiApp.renderer.width / scaleX, pixiApp.renderer.height / scaleY)
      .fill({ color: 0x000000 });
  }

  /**
   * Reset the visibility of all transition sprites at the start of a frame.
   */
  public resetFrame(): void {
    for (const sprite of this.transitionSprites.values()) {
      sprite.visible = false;
    }
  }

  /**
   * Checks if a transition sprite has been created for a given ID.
   */
  public getTransitionSprite(id: string): Sprite | undefined {
    return this.transitionSprites.get(id);
  }

  /**
   * Retrieve pool container/sprite elements for a given clip to avoid allocations.
   */
  private getTransClipObjects(clipId: string): IPooledClipObjects {
    let entry = this.transClipPool.get(clipId);
    if (entry == null) {
      const root = new Container();
      const mainSprite = new Sprite();
      mainSprite.anchor.set(0.5, 0.5);
      root.addChild(mainSprite);
      entry = {
        root,
        mainSprite,
        mirrors: [],
        maskGfx: null,
        strokeGfx: null,
        shadowGfx: null,
      };
      this.transClipPool.set(clipId, entry);
    }
    return entry;
  }

  private async getClipFrameAtTimestamp(
    clip: IClip,
    timestamp: number,
    getFrameCached: (clip: IClip, timestamp: number) => Promise<any>,
  ): Promise<any> {
    const relTime = Math.max(0, Math.min(timestamp - clip.display.from, clip.duration));
    // Ensure animation state is updated for the sampled timestamp
    clip.animate(relTime * clip.playbackRate);

    const { video } = await getFrameCached(clip, relTime);
    return video;
  }

  private renderClipToTransitionTexture(
    clip: IClip,
    frame: VideoFrame | ImageBitmap | Texture,
    target: RenderTexture,
  ): void {
    const isFrameTexture = frame instanceof Texture;
    const tex = isFrameTexture ? frame : Texture.from(frame as any);

    const pooled = this.getTransClipObjects(clip.id);
    const { root: rootContainer, mainSprite: tempSprite } = pooled;

    applyClipStylesAndFilters({
      clip,
      tex,
      rootContainer,
      tempSprite,
      pooled,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
    });

    this.pixiApp.renderer.render({
      container: rootContainer,
      target: target,
      clear: true,
    });

    if (!isFrameTexture) {
      tex.destroy(true);
    }
  }

  /**
   * Render transition between two clips at a given timeline timestamp.
   * Modifies target claimed set and updates internal transition sprite.
   */
  public async renderTransition(opts: {
    sprite: Transition & { expired?: boolean };
    timestamp: number;
    fromClip: IClip;
    toClip: IClip;
    getFrameCached: (clip: IClip, timestamp: number) => Promise<any>;
    clipsNormalContainer: Container;
    clipsClaimedByTransition: Set<string>;
    onVideoState: () => void;
  }): Promise<boolean> {
    const {
      sprite,
      timestamp,
      fromClip,
      toClip,
      getFrameCached,
      clipsNormalContainer,
      clipsClaimedByTransition,
      onVideoState,
    } = opts;

    const relativeTime = timestamp - sprite.display.from;

    if (relativeTime >= sprite.duration) {
      sprite.expired = true;
      const transSprite = this.transitionSprites.get(sprite.id);
      if (transSprite) {
        transSprite.visible = false;
      }
      return false;
    }

    const fromFrame = await this.getClipFrameAtTimestamp(fromClip, timestamp, getFrameCached);
    const toFrame = await this.getClipFrameAtTimestamp(toClip, timestamp, getFrameCached);

    if (!fromFrame || !toFrame) {
      return false;
    }

    const progress = Math.min(Math.max(relativeTime / sprite.duration, 0), 1);

    this.renderClipToTransitionTexture(fromClip, fromFrame, this.transFromTexture);
    this.renderClipToTransitionTexture(toClip, toFrame, this.transToTexture);

    let transRenderer = this.transitionRenderers.get(sprite.id);
    if (!transRenderer) {
      transRenderer = makeTransition({
        name: sprite.transitionKey,
        renderer: this.pixiApp.renderer,
      });
      this.transitionRenderers.set(sprite.id, transRenderer);
    }

    const transTexture = transRenderer.render({
      width: this.pixiApp.renderer.width,
      height: this.pixiApp.renderer.height,
      from: this.transFromTexture,
      to: this.transToTexture,
      progress,
    });

    let transSprite = this.transitionSprites.get(sprite.id);
    if (!transSprite) {
      transSprite = new Sprite();
      transSprite.label = `TransitionSprite_${sprite.id}`;
      this.transitionSprites.set(sprite.id, transSprite);
      clipsNormalContainer.addChild(transSprite);
    }

    transSprite.texture = transTexture;
    transSprite.visible = true;
    transSprite.x = 0;
    transSprite.y = 0;
    transSprite.width = this.pixiApp.renderer.width;
    transSprite.height = this.pixiApp.renderer.height;
    transSprite.anchor.set(0, 0);
    transSprite.zIndex = sprite.zIndex;

    onVideoState();

    clipsClaimedByTransition.add(fromClip.id);
    clipsClaimedByTransition.add(toClip.id);

    return true;
  }

  public cleanup(): void {
    if (this.transFromTexture) this.transFromTexture.destroy(true);
    if (this.transToTexture) this.transToTexture.destroy(true);
    if (this.transBgGraphics) this.transBgGraphics.destroy(true);

    for (const sprite of this.transitionSprites.values()) {
      sprite.destroy();
    }
    this.transitionSprites.clear();
    this.transitionRenderers.clear();

    for (const entry of this.transClipPool.values()) {
      entry.root.destroy({ children: true });
    }
    this.transClipPool.clear();
  }
}
