import { getEasing } from "./easings";
import {
  AnimationOptions,
  AnimationProps,
  AnimationTransform,
  IAnimation,
  KeyframeData,
} from "./types";

export class KeyframeAnimation implements IAnimation {
  readonly id: string;
  readonly type: string;
  readonly options: Required<AnimationOptions>;
  readonly params: any;
  private frames: Array<{
    progress: number;
    props: Partial<AnimationProps>;
    easing?: string | ((t: number) => number);
  }>;

  constructor(
    data: KeyframeData | any[],
    opts: AnimationOptions,
    type: string = "keyframes",
  ) {
    this.id = opts.id || `keyframe_${Math.random().toString(36).substr(2, 9)}`;
    this.type = type;
    this.params = data;
    this.options = {
      duration: opts.duration,
      delay: opts.delay ?? 0,
      easing: opts.easing ?? "linear",
      iterCount: opts.iterCount ?? 1,
      id: this.id,
      disableGlobalEasing: opts.disableGlobalEasing ?? false,
    };

    // Handle array format (internal representation)
    if (Array.isArray(data)) {
      this.frames = data.map((f: any) => ({
        progress: f.progress,
        props: f.props || f, // handle cases where props is missing or is the object itself
        easing: f.easing,
      }));
    } else {
      // Handle object format (percentage keys)
      this.frames = Object.entries(data)
        .filter(([k]) => {
          if (k === "from" || k === "to") return true;
          const num = Number(k.replace("%", ""));
          return !isNaN(num) && num >= 0 && num <= 100;
        })
        .map(([k, val]) => {
          const progress =
            { from: 0, to: 100 }[k] ?? Number(k.replace("%", ""));

          const { easing, ...props } = val;
          return {
            progress: progress / 100,
            props,
            easing: easing,
          };
        })
        .sort((a, b) => a.progress - b.progress);
    }

    // Ensure 0 and 1 exist
    if (this.frames.length > 0 && this.frames[0].progress !== 0) {
      this.frames.unshift({ progress: 0, props: {} });
    }
    if (
      this.frames.length > 0 &&
      this.frames[this.frames.length - 1].progress !== 1
    ) {
      this.frames.push({ progress: 1, props: {} });
    }
  }

  getTransform(time: number): AnimationTransform {
    const { duration, delay, iterCount, easing, disableGlobalEasing } =
      this.options;
    const offsetTime = time - delay;

    if (offsetTime < 0) return {};

    // If iterCount is finite, the whole animation must finish at precisely 'duration'
    if (iterCount !== Infinity && offsetTime >= duration) {
      const transform = this.interpolateProps(1);
      if ("mirror" in transform) {
        (transform as any).mirror = 0;
      }
      return transform;
    }

    const cycleDuration =
      iterCount === Infinity ? duration : duration / iterCount;
    let progress = (offsetTime % cycleDuration) / cycleDuration;

    if (!disableGlobalEasing && easing !== "linear") {
      const easingFn = getEasing(easing);
      progress = easingFn(progress);
    }

    return this.interpolateProps(progress);
  }

  private interpolateProps(progress: number): AnimationTransform {
    const idx = this.frames.findIndex((f) => f.progress >= progress);
    if (idx === -1)
      return this.frames[this.frames.length - 1].props as AnimationTransform;
    if (idx === 0) return this.frames[0].props as AnimationTransform;

    const startFrame = this.frames[idx - 1];
    const endFrame = this.frames[idx];

    const segmentProgress =
      (progress - startFrame.progress) /
      (endFrame.progress - startFrame.progress);

    // If global easing is used, the input progress is already eased.
    // In that case, we default to linear interpolation between keyframes
    // unless a specific per-segment easing is provided.
    const easingSource =
      endFrame.easing ??
      (this.options.disableGlobalEasing ? this.options.easing : "linear");

    const easingFn = getEasing(easingSource);

    const easedProgress = easingFn(segmentProgress);

    const transform: AnimationTransform = {};
    const props = new Set([
      ...Object.keys(startFrame.props),
      ...Object.keys(endFrame.props),
    ]);

    for (const prop of props) {
      const p = prop as keyof AnimationProps;
      const def = p === "scale" || p === "opacity" ? 1 : 0;
      const s = startFrame.props[p] ?? def;
      const e = endFrame.props[p] ?? def;
      (transform as any)[p] = s + (e - s) * easedProgress;
    }

    return transform;
  }
}
