import { describe, it, expect } from 'vitest';
import { easings } from './easings';

describe('easings', () => {
  describe('slow', () => {
    const slow = easings.slow;

    it('should-be-0-at-0', () => {
      expect(slow(0)).toBeCloseTo(0, 5);
    });

    it('should-be-1-at-1', () => {
      expect(slow(1)).toBeCloseTo(1, 5);
    });

    it('should-be-0.5-at-0.5', () => {
      expect(slow(0.5)).toBeCloseTo(0.5, 5);
    });

    it('should-slow-down-in-the-middle', () => {
      // At p=0.15, r = 0.395
      // At p=0.5, r = 0.5 (delta = 0.35, slope = 0.105 / 0.35 = 0.3)
      // Standard linear would be 0.15 -> 0.5 -> 0.85
      
      const v015 = slow(0.15);
      const v05 = slow(0.5);
      const v085 = slow(0.85);

      expect(v015).toBeCloseTo(0.395, 5);
      expect(v05).toBeCloseTo(0.5, 5);
      expect(v085).toBeCloseTo(0.605, 5);
    });
  });
});
