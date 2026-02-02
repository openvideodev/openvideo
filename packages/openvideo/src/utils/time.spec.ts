import { describe, it, expect } from 'vitest';
import { Time } from './time';

describe('Time', () => {
  describe('from()', () => {
    it('should convert seconds to microseconds', () => {
      expect(Time.from(5, 's')).toBe(5000000);
      expect(Time.from(0, 's')).toBe(0);
      expect(Time.from(1.5, 's')).toBe(1500000);
    });

    it('should convert milliseconds to microseconds', () => {
      expect(Time.from(500, 'ms')).toBe(500000);
      expect(Time.from(1000, 'ms')).toBe(1000000);
    });

    it('should convert minutes to microseconds', () => {
      expect(Time.from(1, 'm')).toBe(60000000);
      expect(Time.from(2, 'm')).toBe(120000000);
      expect(Time.from(2.5, 'm')).toBe(150000000);
    });

    it('should convert hours to microseconds', () => {
      expect(Time.from(1, 'h')).toBe(3600000000);
      expect(Time.from(2, 'h')).toBe(7200000000);
    });

    it('should default to seconds when no unit is specified', () => {
      expect(Time.from(5)).toBe(5000000);
    });

    it('should parse time strings with unit suffixes', () => {
      expect(Time.from('5s')).toBe(5000000);
      expect(Time.from('500ms')).toBe(500000);
      expect(Time.from('2m')).toBe(120000000);
      expect(Time.from('1h')).toBe(3600000000);
      expect(Time.from('2.5m')).toBe(150000000);
    });

    it('should parse mm:ss timestamp format', () => {
      expect(Time.from('1:30')).toBe(90000000); // 1 min 30 sec
      expect(Time.from('0:05')).toBe(5000000); // 5 sec
      expect(Time.from('2:00')).toBe(120000000); // 2 min
    });

    it('should parse hh:mm:ss timestamp format', () => {
      expect(Time.from('1:23:45')).toBe(5025000000); // 1 hr 23 min 45 sec
      expect(Time.from('0:01:30')).toBe(90000000); // 1 min 30 sec
      expect(Time.from('2:00:00')).toBe(7200000000); // 2 hours
    });

    it('should throw error for invalid time strings', () => {
      expect(() => Time.from('invalid')).toThrow('Invalid time format');
      expect(() => Time.from('5x')).toThrow('Invalid time format');
      expect(() => Time.from('1:2:3:4')).toThrow('Invalid time format');
      expect(() => Time.from('abc:def')).toThrow('Invalid time format');
    });
  });

  describe('format()', () => {
    it('should format microseconds to hh:mm:ss', () => {
      expect(Time.format(5000000)).toBe('0:05'); // 5 seconds
      expect(Time.format(90000000)).toBe('1:30'); // 1 min 30 sec
      expect(Time.format(5025000000)).toBe('1:23:45'); // 1 hr 23 min 45 sec
      expect(Time.format(3600000000)).toBe('1:00:00'); // 1 hour
    });

    it('should format microseconds to seconds string', () => {
      expect(Time.format(5000000, 's')).toBe('5s');
      expect(Time.format(90000000, 's')).toBe('90s');
      expect(Time.format(1500000, 's')).toBe('1.5s');
    });

    it('should format microseconds to milliseconds string', () => {
      expect(Time.format(5000000, 'ms')).toBe('5000ms');
      expect(Time.format(500000, 'ms')).toBe('500ms');
    });

    it('should handle zero time', () => {
      expect(Time.format(0)).toBe('0:00');
      expect(Time.format(0, 's')).toBe('0s');
      expect(Time.format(0, 'ms')).toBe('0ms');
    });
  });

  describe('now()', () => {
    it('should return current time in microseconds', () => {
      const now = Time.now();
      expect(now).toBeGreaterThan(0);
      expect(typeof now).toBe('number');
    });
  });

  describe('add()', () => {
    it('should add two time values', () => {
      const a = Time.from(5, 's');
      const b = Time.from(10, 's');
      expect(Time.add(a, b)).toBe(15000000);
    });

    it('should handle zero values', () => {
      expect(Time.add(0, Time.from(5, 's'))).toBe(5000000);
      expect(Time.add(Time.from(5, 's'), 0)).toBe(5000000);
    });
  });

  describe('subtract()', () => {
    it('should subtract two time values', () => {
      const a = Time.from(15, 's');
      const b = Time.from(5, 's');
      expect(Time.subtract(a, b)).toBe(10000000);
    });

    it('should allow negative results', () => {
      const a = Time.from(5, 's');
      const b = Time.from(10, 's');
      expect(Time.subtract(a, b)).toBe(-5000000);
    });
  });

  describe('clamp()', () => {
    it('should clamp value within range', () => {
      const min = Time.from(0, 's');
      const max = Time.from(60, 's');

      expect(Time.clamp(Time.from(30, 's'), min, max)).toBe(30000000);
      expect(Time.clamp(Time.from(100, 's'), min, max)).toBe(60000000);
      expect(Time.clamp(Time.from(-10, 's'), min, max)).toBe(0);
    });
  });

  describe('toSeconds()', () => {
    it('should convert microseconds to seconds', () => {
      expect(Time.toSeconds(5000000)).toBe(5);
      expect(Time.toSeconds(1500000)).toBe(1.5);
      expect(Time.toSeconds(0)).toBe(0);
    });
  });

  describe('toMilliseconds()', () => {
    it('should convert microseconds to milliseconds', () => {
      expect(Time.toMilliseconds(5000000)).toBe(5000);
      expect(Time.toMilliseconds(500000)).toBe(500);
      expect(Time.toMilliseconds(0)).toBe(0);
    });
  });

  describe('inRange()', () => {
    it('should check if value is within range', () => {
      const start = Time.from(0, 's');
      const end = Time.from(10, 's');

      expect(Time.inRange(Time.from(5, 's'), start, end)).toBe(true);
      expect(Time.inRange(Time.from(0, 's'), start, end)).toBe(true);
      expect(Time.inRange(Time.from(10, 's'), start, end)).toBe(true);
      expect(Time.inRange(Time.from(15, 's'), start, end)).toBe(false);
      expect(Time.inRange(Time.from(-5, 's'), start, end)).toBe(false);
    });
  });

  describe('real-world usage examples', () => {
    it('should work for typical clip display times', () => {
      const clip = {
        display: {
          from: Time.from(0, 's'),
          to: Time.from(10, 's'),
        },
      };

      expect(clip.display.from).toBe(0);
      expect(clip.display.to).toBe(10000000);
      expect(Time.format(clip.display.to)).toBe('0:10');
    });

    it('should work for trim operations', () => {
      const clip = {
        trim: {
          from: Time.from('0:05'),
          to: Time.from('0:15'),
        },
      };

      expect(clip.trim.from).toBe(5000000);
      expect(clip.trim.to).toBe(15000000);
    });

    it('should work for seeking', () => {
      const seekTime = Time.from('1:30');
      expect(seekTime).toBe(90000000);
      expect(Time.format(seekTime)).toBe('1:30');
    });
  });
});
