import { KeyframeAnimation } from './keyframe-animation';
import { AnimationOptions, IAnimation, KeyframeData } from './types';

export type AnimationFactory = (opts: AnimationOptions, params?: any) => IAnimation;

class AnimationRegistry {
  private factories = new Map<string, AnimationFactory>();

  constructor() {
    this.register('keyframes', (opts, params: KeyframeData) => new KeyframeAnimation(params, opts));
  }

  register(name: string, factory: AnimationFactory) {
    this.factories.set(name, factory);
  }

  create(name: string, opts: AnimationOptions, params?: any): IAnimation {
    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(`Animation "${name}" not found in registry`);
    }
    return factory(opts, params);
  }

  has(name: string): boolean {
    return this.factories.has(name);
  }
}

export const animationRegistry = new AnimationRegistry();
