import { Color } from 'pixi.js';

/**
 * Convert color string or number to PixiJS color number
 */
export function parseColor(
  color: string | number | undefined
): number | undefined {
  if (color === undefined || color === null) return undefined;
  if (typeof color === 'number') return color;
  if (typeof color === 'string') {
    if (color === 'transparent') return undefined;

    // Handle hex strings like '#ff0000' or '0xff0000'
    if (color.startsWith('#')) {
      const parsed = parseInt(color.slice(1), 16);
      if (!isNaN(parsed)) return parsed;
    }
    if (color.startsWith('0x')) {
      const parsed = parseInt(color, 16);
      if (!isNaN(parsed)) return parsed;
    }
    // Try to parse as hex number
    const parsed = parseInt(color, 16);
    if (!isNaN(parsed)) return parsed;
    // Use PixiJS Color to parse named colors (like 'red', 'blue', etc.)
    try {
      const colorObj = new Color(color);
      return colorObj.toNumber();
    } catch (e) {
      // If color parsing fails, return undefined
      return undefined;
    }
  }
  return undefined;
}

export const isTransparent = (color?: any) => color === 'transparent';

export const resolveColor = (color?: string | number, fallback = 0xffffff) => {
  if (isTransparent(color)) {
    return { color: fallback, alpha: 0 };
  }
  return {
    color: parseColor(color) ?? fallback,
    alpha: 1,
  };
};
