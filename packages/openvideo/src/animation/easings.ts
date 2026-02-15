import { EasingFunction } from './types';

export const easings: Record<string, EasingFunction> = {
  linear: (t) => t,
  
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => --t * t * t + 1,
  easeInOutCubic: (t) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    
  easeInSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine: (t) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t) => 0.5 * (1 - Math.cos(Math.PI * t)),
  
  easeInExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if ((t /= 0.5) < 1) return 0.5 * Math.pow(2, 10 * (t - 1));
    return 0.5 * (2 - Math.pow(2, -10 * --t));
  },
  
  easeInCirc: (t) => 1 - Math.sqrt(1 - t * t),
  easeOutCirc: (t) => Math.sqrt(1 - (t - 1) * (t - 1)),
  easeInOutCirc: (t) => {
    if ((t /= 0.5) < 1) return -0.5 * (Math.sqrt(1 - t * t) - 1);
    return 0.5 * (Math.sqrt(1 - (t - 2) * t) + 1);
  },
  
  slow: createSlowMo(0.7, 0.7, false),
};

export function createSlowMo(
  linearRatio: number = 0.7,
  power: number = 0.7,
  yoyoMode: boolean = false
): EasingFunction {
  const lr = Math.min(1, linearRatio);
  const pow = lr < 1 ? power : 0;
  const t1 = (1 - lr) / 2;
  const t3 = t1 + lr;

  return (t: number) => {
    const r = t + (0.5 - t) * pow;
    if (t < t1) {
      const tMod = 1 - t / t1;
      return yoyoMode ? 1 - tMod * tMod : r - tMod * tMod * tMod * r;
    }
    if (t > t3) {
      const tMod = (t - t3) / t1;
      return yoyoMode
        ? (t === 1 ? 0 : 1 - tMod * tMod)
        : r + (t - r) * tMod * tMod * tMod;
    }
    return yoyoMode ? 1 : r;
  };
}

export function getEasing(easing: string | EasingFunction | undefined): EasingFunction {
  if (typeof easing === 'function') return easing;
  if (typeof easing === 'string' && easings[easing]) return easings[easing];
  return easings.linear;
}
