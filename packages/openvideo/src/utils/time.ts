/**
 * Time utility class for converting between different time formats and microseconds.
 *
 * OpenVideo uses microseconds internally for precision, but this utility makes it
 * easier to work with more human-friendly time formats.
 *
 * @example
 * ```typescript
 * import { Time } from 'openvideo';
 *
 * // Convert to microseconds
 * const fiveSeconds = Time.from(5, 's');
 * const twoMinutes = Time.from(2, 'm');
 * const timestamp = Time.from('1:30'); // 1 minute 30 seconds
 *
 * // Format microseconds to human-readable
 * console.log(Time.format(fiveSeconds)); // "0:05"
 * console.log(Time.format(twoMinutes, 's')); // "120s"
 *
 * // Use in clips
 * clip.display = {
 *   from: Time.from(0, 's'),
 *   to: Time.from(10, 's')
 * };
 * ```
 */
export class Time {
  /**
   * Convert various time formats to microseconds (the internal unit used by OpenVideo)
   *
   * @param value - Numeric value or time string
   * @param unit - Unit of time ('ms', 's', 'm', 'h'). Defaults to 's' (seconds)
   * @returns Time in microseconds
   *
   * @example
   * ```typescript
   * Time.from(5, 's')        // 5000000 (5 seconds in microseconds)
   * Time.from(500, 'ms')     // 500000 (500 milliseconds)
   * Time.from(2, 'm')        // 120000000 (2 minutes)
   * Time.from(1, 'h')        // 3600000000 (1 hour)
   *
   * // String formats
   * Time.from('5s')          // 5000000
   * Time.from('500ms')       // 500000
   * Time.from('2.5m')        // 150000000
   * Time.from('1:30')        // 90000000 (1 min 30 sec)
   * Time.from('1:23:45')     // 5025000000 (1 hr 23 min 45 sec)
   * ```
   */
  static from(value: number | string, unit?: 'ms' | 's' | 'm' | 'h'): number {
    if (typeof value === 'string') {
      return Time.parseTimeString(value);
    }

    const multipliers = {
      ms: 1000, // milliseconds to microseconds
      s: 1e6, // seconds to microseconds
      m: 60e6, // minutes to microseconds
      h: 3600e6, // hours to microseconds
    };

    return Math.round(value * (multipliers[unit || 's'] || 1e6));
  }

  /**
   * Convert microseconds to human-readable format
   *
   * @param us - Time in microseconds
   * @param format - Output format ('hms', 's', 'ms'). Defaults to 'hms'
   * @returns Formatted time string
   *
   * @example
   * ```typescript
   * const duration = Time.from(90, 's'); // 90 seconds
   *
   * Time.format(duration)         // "1:30" (default hms)
   * Time.format(duration, 'hms')  // "1:30"
   * Time.format(duration, 's')    // "90s"
   * Time.format(duration, 'ms')   // "90000ms"
   *
   * const longDuration = Time.from(3665, 's'); // 1 hour 1 minute 5 seconds
   * Time.format(longDuration)     // "1:01:05"
   * ```
   */
  static format(us: number, format: 'hms' | 'ms' | 's' = 'hms'): string {
    const seconds = us / 1e6;

    if (format === 's') return `${seconds}s`;
    if (format === 'ms') return `${us / 1000}ms`;

    // hms format: "1:23:45" or "0:05"
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  /**
   * Parse time strings in various formats
   *
   * Supports:
   * - Unit suffixes: "5s", "500ms", "2.5m", "1h"
   * - Timestamp format: "1:30" (mm:ss) or "1:23:45" (hh:mm:ss)
   *
   * @param str - Time string to parse
   * @returns Time in microseconds
   * @throws Error if format is invalid
   *
   * @private
   */
  private static parseTimeString(str: string): number {
    // Handle unit suffixes: "5s", "2.5m", "30ms", "1h"
    const unitMatch = str.match(/^([\d.]+)(ms|s|m|h)$/);
    if (unitMatch) {
      return Time.from(parseFloat(unitMatch[1]), unitMatch[2] as any);
    }

    // Handle timestamp format: "1:30" or "1:23:45"
    const parts = str.split(':').map(Number);

    // Validate all parts are numbers
    if (parts.some(isNaN)) {
      throw new Error(`Invalid time format: ${str}`);
    }

    if (parts.length === 2) {
      // mm:ss
      const [minutes, seconds] = parts;
      return Time.from(minutes * 60 + seconds, 's');
    } else if (parts.length === 3) {
      // hh:mm:ss
      const [hours, minutes, seconds] = parts;
      return Time.from(hours * 3600 + minutes * 60 + seconds, 's');
    }

    throw new Error(
      `Invalid time format: ${str}. Expected formats: "5s", "500ms", "2.5m", "1:30", or "1:23:45"`
    );
  }

  /**
   * Get current timestamp in microseconds
   *
   * @returns Current time in microseconds (based on performance.now())
   *
   * @example
   * ```typescript
   * const start = Time.now();
   * // ... do work ...
   * const elapsed = Time.now() - start;
   * console.log(`Elapsed: ${Time.format(elapsed)}`);
   * ```
   */
  static now(): number {
    return Math.round(performance.now() * 1000);
  }

  /**
   * Add two time values
   *
   * @param a - First time value in microseconds
   * @param b - Second time value in microseconds
   * @returns Sum in microseconds
   *
   * @example
   * ```typescript
   * const start = Time.from(5, 's');
   * const duration = Time.from(10, 's');
   * const end = Time.add(start, duration); // 15 seconds
   * ```
   */
  static add(a: number, b: number): number {
    return a + b;
  }

  /**
   * Subtract time values
   *
   * @param a - First time value in microseconds
   * @param b - Second time value in microseconds (subtracted from a)
   * @returns Difference in microseconds
   *
   * @example
   * ```typescript
   * const end = Time.from(15, 's');
   * const start = Time.from(5, 's');
   * const duration = Time.subtract(end, start); // 10 seconds
   * ```
   */
  static subtract(a: number, b: number): number {
    return a - b;
  }

  /**
   * Clamp time value between min and max
   *
   * @param value - Time value to clamp
   * @param min - Minimum allowed value
   * @param max - Maximum allowed value
   * @returns Clamped value
   *
   * @example
   * ```typescript
   * const clamped = Time.clamp(
   *   Time.from(100, 's'),
   *   Time.from(0, 's'),
   *   Time.from(60, 's')
   * ); // Returns 60 seconds (clamped to max)
   * ```
   */
  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Convert microseconds to seconds (as a number)
   *
   * @param us - Time in microseconds
   * @returns Time in seconds
   *
   * @example
   * ```typescript
   * const us = Time.from(5, 's');
   * const seconds = Time.toSeconds(us); // 5
   * ```
   */
  static toSeconds(us: number): number {
    return us / 1e6;
  }

  /**
   * Convert microseconds to milliseconds (as a number)
   *
   * @param us - Time in microseconds
   * @returns Time in milliseconds
   *
   * @example
   * ```typescript
   * const us = Time.from(5, 's');
   * const ms = Time.toMilliseconds(us); // 5000
   * ```
   */
  static toMilliseconds(us: number): number {
    return us / 1000;
  }

  /**
   * Check if a time value is within a range
   *
   * @param value - Time value to check
   * @param start - Range start (inclusive)
   * @param end - Range end (inclusive)
   * @returns True if value is within range
   *
   * @example
   * ```typescript
   * const currentTime = Time.from(5, 's');
   * const isActive = Time.inRange(
   *   currentTime,
   *   Time.from(0, 's'),
   *   Time.from(10, 's')
   * ); // true
   * ```
   */
  static inRange(value: number, start: number, end: number): boolean {
    return value >= start && value <= end;
  }
}
