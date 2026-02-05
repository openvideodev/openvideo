export type EasingFunction = (t: number) => number;

export interface AnimationProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  scale?: number;
  opacity?: number;
  angle?: number;
}

export interface AnimationOptions {
  duration: number; // in microseconds
  delay?: number; // in microseconds
  easing?: string | EasingFunction;
  iterCount?: number;
  id?: string;
}

export interface IAnimation {
  readonly id: string;
  readonly type: string;
  readonly options: Required<AnimationOptions>;
  readonly params?: any;

  /**
   * Calculate offsets and multipliers for the given time
   * @param time Relative time from the start of the clip in microseconds
   * @returns Partial state containing offsets/multipliers
   */
  getTransform(time: number): AnimationTransform;

  /**
   * Apply complex animations (like GSAP character animations) directly to a target
   * @param target The target object (e.g., PixiJS Container)
   * @param time Relative time in microseconds
   */
  apply?(target: any, time: number): void;
}

export interface AnimationTransform {
  x?: number; // additive offset
  y?: number; // additive offset
  width?: number; // additive offset
  height?: number; // additive offset
  scale?: number; // multiplier (relative to 1.0)
  opacity?: number; // multiplier (relative to 1.0)
  angle?: number; // additive offset
}

export interface KeyframeData {
  [key: string]: Partial<AnimationProps & { easing?: string | EasingFunction }>;
}

export const ANIMATABLE_PROPERTIES = {
  x: { label: "X Position", min: -2000, max: 2000, step: 1, default: 0 },
  y: { label: "Y Position", min: -2000, max: 2000, step: 1, default: 0 },
  width: { label: "Width", min: -1000, max: 1000, step: 1, default: 0 },
  height: { label: "Height", min: -1000, max: 1000, step: 1, default: 0 },
  scale: { label: "Scale", min: 0, max: 3, step: 0.1, default: 1 },
  opacity: { label: "Opacity", min: 0, max: 1, step: 0.01, default: 1 },
  angle: { label: "Rotation", min: -360, max: 360, step: 1, default: 0 },
} as const;
