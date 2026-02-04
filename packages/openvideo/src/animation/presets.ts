import { AnimationFactory, animationRegistry } from './registry';
import { KeyframeAnimation } from './keyframe-animation';

// Animation Presets

// Actually, let's fix the logic in KeyframeAnimation getTransform for multipliers.
// In the implementation plan, I said: "Animation Layer: Active animations calculate additive offsets (e.g., xOffset: +50px, scaleMultiplier: 1.2x)".
// So opacity should be a multiplier or additive? 
// If it's a multiplier, base 1.0 * 0.0 = 0.
// If it's fadeIn, progress 0 should be multiplier 0, progress 1 should be multiplier 1.

export const fadeIn: AnimationFactory = (opts) => {
    return new KeyframeAnimation({
        '0%': { opacity: 0, scale: 0.9 },
        '100%': { opacity: 1, scale: 1 }
    }, { ...opts, easing: opts.easing || 'easeOutQuad' }, 'fadeIn');
};

export const fadeOut: AnimationFactory = (opts) => {
    return new KeyframeAnimation({
        '0%': { opacity: 1 },
        '100%': { opacity: 0 }
    }, { ...opts, easing: opts.easing || 'easeInQuad' }, 'fadeOut');
};

export const slideIn: AnimationFactory = (opts, params: { direction: 'left' | 'right' | 'top' | 'bottom', distance?: number } = { direction: 'left' }) => {
    const dist = params.distance || 100;
    const frames: any = {
        '100%': { x: 0, y: 0, opacity: 1 }
    };
    
    if (params.direction === 'left') frames['0%'] = { x: -dist, opacity: 0 };
    if (params.direction === 'right') frames['0%'] = { x: dist, opacity: 0 };
    if (params.direction === 'top') frames['0%'] = { y: -dist, opacity: 0 };
    if (params.direction === 'bottom') frames['0%'] = { y: dist, opacity: 0 };
    
    const anim = new KeyframeAnimation(frames, { ...opts, easing: opts.easing || 'easeOutCubic' }, 'slideIn');
    (anim as any).params = params; // Preserve original params for serialization
    return anim;
};

export const slideOut: AnimationFactory = (opts, params: { direction: 'left' | 'right' | 'top' | 'bottom', distance?: number } = { direction: 'left' }) => {
    const dist = params.distance || 100;
    const frames: any = {
        '0%': { x: 0, y: 0, opacity: 1 }
    };
    
    if (params.direction === 'left') frames['100%'] = { x: -dist, opacity: 0 };
    if (params.direction === 'right') frames['100%'] = { x: dist, opacity: 0 };
    if (params.direction === 'top') frames['100%'] = { y: -dist, opacity: 0 };
    if (params.direction === 'bottom') frames['100%'] = { y: dist, opacity: 0 };
    
    const anim = new KeyframeAnimation(frames, { ...opts, easing: opts.easing || 'easeInCubic' }, 'slideOut');
    (anim as any).params = params; // Preserve original params for serialization
    return anim;
};

// Register them
animationRegistry.register('fadeIn', fadeIn);
animationRegistry.register('fadeOut', fadeOut);
animationRegistry.register('slideIn', slideIn);
animationRegistry.register('slideOut', slideOut);

/**
 * Get the keyframe template for a preset animation
 * Useful for populating the animation editor UI
 */
export function getPresetTemplate(type: string, params?: any): any {
  switch (type) {
    case 'fadeIn':
      return {
        '0%': { opacity: 0, scale: 0.9 },
        '100%': { opacity: 1, scale: 1 }
      };
    case 'fadeOut':
      return {
        '0%': { opacity: 1 },
        '100%': { opacity: 0 }
      };
    case 'slideIn': {
      const direction = params?.direction || 'left';
      const distance = params?.distance || 100;
      return {
        '0%': {
          x: direction === 'left' ? -distance : direction === 'right' ? distance : 0,
          y: direction === 'top' ? -distance : direction === 'bottom' ? distance : 0,
          opacity: 0
        },
        '100%': { x: 0, y: 0, opacity: 1 }
      };
    }
    case 'slideOut': {
      const direction = params?.direction || 'left';
      const distance = params?.distance || 100;
      return {
        '0%': { x: 0, y: 0, opacity: 1 },
        '100%': {
          x: direction === 'left' ? -distance : direction === 'right' ? distance : 0,
          y: direction === 'top' ? -distance : direction === 'bottom' ? distance : 0,
          opacity: 0
        }
      };
    }
    case 'custom':
    default:
      return {
        '0%': {},
        '100%': {}
      };
  }
}
