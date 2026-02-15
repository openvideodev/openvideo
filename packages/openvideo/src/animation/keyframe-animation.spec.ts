import { describe, it, expect } from 'vitest';
import { KeyframeAnimation } from './keyframe-animation';

describe('KeyframeAnimation', () => {
  describe('Global Easing', () => {
    it('should-apply-easing-globally-by-default', () => {
      // Keyframes: 0% -> y: 0, 50% -> y: 100, 100% -> y: 200
      // Easing: "easeInQuad" (t^2)
      const anim = new KeyframeAnimation(
        {
          "0%": { y: 0 },
          "50%": { y: 100 },
          "100%": { y: 200 }
        },
        {
          duration: 1000,
          easing: "easeInQuad"
        }
      );

      // t=0.5 -> globalProgress = 0.5 -> easedProgress = 0.5^2 = 0.25
      // easedProgress 0.25 is in segment [0, 0.5]
      // interpolation within segment: 0.25 / 0.5 = 0.5
      // y = 0 + (100 - 0) * 0.5 = 50
      
      const transform = anim.getTransform(500);
      expect(transform.y).toBeCloseTo(50, 5);
    });

    it('should-apply-easing-per-segment-if-disabled', () => {
      const anim = new KeyframeAnimation(
        {
          "0%": { y: 0 },
          "50%": { y: 100 },
          "100%": { y: 200 }
        },
        {
          duration: 1000,
          easing: "easeInQuad",
          disableGlobalEasing: true
        }
      );

      // t=0.5 -> linearProgress = 0.5 -> segment [0, 0.5] is DONE
      // wait, at exactly 0.5 it should be 100
      
      // Let's check t=0.25 (halfway through first segment)
      // linearProgress = 0.25 -> segmentProgress = 0.25 / 0.5 = 0.5
      // easedSegmentProgress = 0.5^2 = 0.25
      // y = 0 + (100 - 0) * 0.25 = 25
      
      const transform = anim.getTransform(250);
      expect(transform.y).toBeCloseTo(25, 5);
      
      // compare with global:
      // t=0.25 -> globalProgress = 0.25 -> easedGlobal = 0.25^2 = 0.0625
      // segmentProgress = 0.0625 / 0.5 = 0.125
      // y = 0 + 100 * 0.125 = 12.5
    });

    it('should-work-with-slow-easing-smoothly', () => {
      // 0% -> y: 0
      // 50% -> y: 100
      // 100% -> y: 200
      const anim = new KeyframeAnimation(
        {
          "0%": { y: -600 },
          "50%": { y: 0 },
          "100%": { y: -600 }
        },
        {
          duration: 2000,
          easing: "slow"
        }
      );

      // t=0.25 (500ms) -> linearProgress=0.25 -> easedProgress (slow) ~ 0.44...
      // Since it's global, it should be moving towards 50% (y=0)
      const t1 = anim.getTransform(500); 
      const t2 = anim.getTransform(1500);
      
      // In old system, t=500 was 50% through segment 1, 
      // slope was resetting.
      // In new system, it should be one continuous curve.
      
      expect(t1.y).not.toBe(t2.y); // mirror points should have same value if easing is symmetric
      
      // Slow easing is symmetric around 0.5
      // slow(0.25) -> progress
      // slow(0.75) -> 1 - slow(0.25)
      // So at 0.25 and 0.75, the distance from center (y=0) should be the same.
      
      expect(t1.y!).toBeCloseTo(t2.y!, 1);
    });
  });
});
