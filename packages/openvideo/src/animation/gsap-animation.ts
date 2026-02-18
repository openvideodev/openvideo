import gsap from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin";
import * as PIXI from "pixi.js";
import { AnimationOptions, AnimationTransform, IAnimation } from "./types";

// Register PixiPlugin to support skewX, skewY, and other PixiJS properties
gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);

export interface GsapAnimationParams {
  /**
   * Animation presets or custom GSAP vars
   */
  type: "character" | "word" | "line";
  from: gsap.TweenVars;
  to: gsap.TweenVars;
  stagger?: number | gsap.StaggerVars;
}

export class GsapAnimation implements IAnimation {
  readonly id: string;
  readonly type: string;
  readonly options: Required<AnimationOptions>;
  readonly params: GsapAnimationParams;

  private timeline: gsap.core.Timeline | null = null;
  private lastTarget: any = null;

  constructor(
    params: GsapAnimationParams,
    opts: AnimationOptions,
    type: string = "gsap",
  ) {
    this.id = opts.id || `gsap_${Math.random().toString(36).substr(2, 9)}`;
    this.type = type;
    this.params = params;
    this.options = {
      duration: opts.duration,
      delay: opts.delay ?? 0,
      easing: opts.easing ?? "none",
      iterCount: opts.iterCount ?? 1,
      id: this.id,
      disableGlobalEasing: opts.disableGlobalEasing ?? false,
    };
  }

  getTransform(_time: number): AnimationTransform {
    // GSAP animations usually handle properties directly on children,
    // so the base transform is empty.
    return {};
  }

  private getTargetCount(target: any): number {
    if (!target) return 0;
    const { type } = this.params;
    if (type === "character") {
      const countLeafNodes = (node: any, isRoot: boolean = false): number => {
        if (!node.children || node.children.length === 0) {
          return isRoot ? 0 : 1;
        }
        let count = 0;
        for (const child of node.children) {
          count += countLeafNodes(child);
        }
        return count;
      };
      return countLeafNodes(target, true);
    } else if (type === "word") {
      return target.children ? target.children.length : 0;
    }
    return 1;
  }

  apply(target: any, time: number): void {
    const { duration, delay } = this.options;
    const offsetTime = time - delay;

    // Check if we need to re-initialize the timeline
    let needsReinit = this.lastTarget !== target || !this.timeline;

    // Get current actual targets from the container for comparison
    const currentActualTargets = this.getCurrentTargets(target);

    // If target is the same, check if its children (the things we are animating)
    // have been destroyed and recreated (e.g. by TextClip refresh)
    // OR if the timeline was previously empty (no targets were found yet)
    if (!needsReinit && this.timeline) {
      const tweens = this.timeline.getChildren();
      if (tweens.length === 0) {
        // No tweens? Check if we expected children and now have them
        if (target && target.children && target.children.length > 0) {
          needsReinit = true;
        }
      } else {
        // Check if existing targets are destroyed or removed
        const tween = tweens[0] as any;
        const gsapTargets =
          typeof tween.targets === "function" ? tween.targets() : [];

        // Check if the number of targets has changed (e.g. word -> characters)
        const currentCount = this.getTargetCount(target);
        if (gsapTargets.length !== currentCount) {
          needsReinit = true;
        } else if (
          gsapTargets &&
          gsapTargets.length > 0 &&
          currentActualTargets.length > 0
        ) {
          // If the target is the container itself, but we expected children, re-init
          if (
            gsapTargets[0] === target &&
            target.children &&
            target.children.length > 0
          ) {
            needsReinit = true;
          } else {
            // Check if ANY of the old targets is destroyed or if the actual targets have changed
            // This handles the case where children are destroyed and recreated during style updates
            for (let i = 0; i < gsapTargets.length; i++) {
              const oldTarget = gsapTargets[i];
              if (oldTarget.destroyed || !oldTarget.parent) {
                needsReinit = true;
                break;
              }
              // Also check if the target reference has changed (new objects created)
              if (
                i < currentActualTargets.length &&
                oldTarget !== currentActualTargets[i]
              ) {
                needsReinit = true;
                break;
              }
            }
          }
        } else if (target && target.children && target.children.length > 0) {
          // Tweens exist but targets are empty? (Safe to check)
          needsReinit = true;
        }
      }
    }

    if (needsReinit) {
      this.initTimeline(target);
      this.lastTarget = target;
    }

    if (!this.timeline) return;

    if (offsetTime < 0) {
      this.timeline.pause(0);
      return;
    }

    // Convert microseconds to seconds
    // (Used for GSAP timeline, but we now use progress)

    // Handle iteration and clamping
    const cycleDuration =
      this.options.iterCount === Infinity
        ? duration
        : duration / this.options.iterCount;

    if (this.options.iterCount !== Infinity && offsetTime >= duration) {
      this.timeline.progress(1);
      return;
    }

    const progress = (offsetTime % cycleDuration) / cycleDuration;
    this.timeline.progress(progress);
  }

  /**
   * Get current animation targets from the container based on animation type.
   * Used to compare against GSAP's cached targets to detect when children are recreated.
   */
  private getCurrentTargets(target: any): any[] {
    if (!target || !target.children) {
      return [target];
    }

    const { type } = this.params;
    if (type === "character") {
      // Find all characters (leaf nodes) recursively
      const findCharacters = (node: any, isRoot: boolean = false): any[] => {
        if (!node.children || node.children.length === 0) {
          return isRoot ? [] : [node];
        }
        let results: any[] = [];
        for (const child of node.children) {
          results = results.concat(findCharacters(child));
        }
        return results;
      };
      return findCharacters(target, true);
    } else if (type === "word") {
      return [...(target.children || [])];
    }
    return [target];
  }

  private initTimeline(target: any): void {
    const { from, to, stagger, type } = this.params;
    const durationInSeconds = this.options.duration / 1e6;

    // Identify animation targets based on type
    let animTargets: any[] = [];

    // PixiJS SplitBitmapText structure:
    // Container -> Words -> Characters
    if (target && target.children) {
      if (type === "character") {
        // Find all characters (recursive)
        const findCharacters = (node: any, isRoot: boolean = false): any[] => {
          if (!node.children || node.children.length === 0) {
            return isRoot ? [] : [node];
          }
          let results: any[] = [];
          for (const child of node.children) {
            results = results.concat(findCharacters(child));
          }
          return results;
        };
        animTargets = findCharacters(target, true);
      } else if (type === "word") {
        animTargets = target.children || [];
      } else {
        animTargets = [target];
      }
    } else {
      animTargets = [target];
    }

    // CRITICAL: Don't create the timeline if we have no targets but expected them.
    // By keeping this.timeline as null, the apply method will keep retrying every frame.
    if ((type === "character" || type === "word") && animTargets.length === 0) {
      if (this.timeline) {
        this.timeline.kill();
        this.timeline = null;
      }
      return;
    }

    // Re-initialize the timeline
    if (this.timeline) {
      this.timeline.kill();
    }
    this.timeline = gsap.timeline({ paused: true });
    animTargets.forEach((t) => {
      if (t.anchor) {
        if (t.anchor.x !== 0.5 || t.anchor.y !== 0.5) {
          const oldX = t.anchor.x;
          const oldY = t.anchor.y;
          t.anchor.set(0.5, 0.5);
          const w = t.width / (t.scale?.x || 1);
          const h = t.height / (t.scale?.y || 1);
          t.x += (0.5 - oldX) * w * (t.scale?.x || 1);
          t.y += (0.5 - oldY) * h * (t.scale?.y || 1);
        }
      } else if (t.pivot && t.getLocalBounds) {
        const bounds = t.getLocalBounds();
        const cx = bounds.x + bounds.width / 2;
        const cy = bounds.y + bounds.height / 2;
        if (t.pivot.x !== cx || t.pivot.y !== cy) {
          const oldX = t.pivot.x;
          const oldY = t.pivot.y;
          t.pivot.set(cx, cy);
          t.x += (cx - oldX) * (t.scale?.x || 1);
          t.y += (cy - oldY) * (t.scale?.y || 1);
        }
      }
    });

    // List of properties that should be handled by PixiPlugin
    const pixiProps = [
      "scale",
      "scaleX",
      "scaleY",
      "rotation",
      "skewX",
      "skewY",
      "skew",
      "pivotX",
      "pivotY",
      "pivot",
      "anchorX",
      "anchorY",
      "anchor",
      "blur",
      "brightness",
      "contrast",
      "grayscale",
      "hueRotate",
      "invert",
      "saturate",
      "threshold",
      "matrix",
    ];

    const hasPixiProp = (obj: any) =>
      obj && Object.keys(obj).some((key) => pixiProps.includes(key));

    const prepareVars = (vars: any) => {
      if (!hasPixiProp(vars)) return vars;
      const newVars: any = { ...vars };
      const pixiVars: any = {};
      pixiProps.forEach((prop) => {
        if (prop in newVars) {
          pixiVars[prop] = newVars[prop];
          delete newVars[prop];
        }
      });
      newVars.pixi = pixiVars;
      return newVars;
    };

    const finalFrom = prepareVars(from);
    const finalTo = prepareVars(to);

    this.timeline.fromTo(animTargets, finalFrom, {
      duration: durationInSeconds,
      stagger: stagger || 0,
      ease: this.options.easing as any,
      ...finalTo,
    });
  }

  destroy() {
    if (this.timeline) {
      this.timeline.kill();
      this.timeline = null;
    }
  }
}
