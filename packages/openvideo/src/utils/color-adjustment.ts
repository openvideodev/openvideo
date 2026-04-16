import { ColorMatrixFilter } from "pixi.js";

export interface ColorAdjustmentBasic {
  saturation?: number;
  temperature?: number;
  hue?: number;
  brightness?: number;
  contrast?: number;
  shine?: number;
  highlight?: number;
  shadow?: number;
  sharpness?: number;
  vignette?: number;
  fade?: number;
  grain?: number;
}

export interface ColorAdjustmentHsl {
  hue?: number;
  saturation?: number;
  lightness?: number;
  selectedColor?: string;
  byColor?: Record<
    string,
    {
      hue?: number;
      saturation?: number;
      lightness?: number;
    }
  >;
}

export interface CurvePoint {
  x: number;
  y: number;
}

export interface ColorAdjustmentCurves {
  rgb?: CurvePoint[];
  red?: CurvePoint[];
  green?: CurvePoint[];
  blue?: CurvePoint[];
}

export interface ColorAdjustment {
  enabled?: boolean;
  type?: "basic" | "hsl" | "curves";
  basic?: ColorAdjustmentBasic;
  hsl?: ColorAdjustmentHsl;
  curves?: ColorAdjustmentCurves;
}

export interface ActiveSelectiveHslAdjustment {
  targetColor: string;
  hue: number;
  saturation: number;
  lightness: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getCurveValue(points: CurvePoint[] | undefined, x: number): number {
  if (!points || points.length === 0) return x;
  const sorted = [...points].sort((a, b) => a.x - b.x);
  if (x <= sorted[0].x) return sorted[0].y;
  if (x >= sorted[sorted.length - 1].x) return sorted[sorted.length - 1].y;

  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i];
    const p2 = sorted[i + 1];
    if (x >= p1.x && x <= p2.x) {
      const t = (x - p1.x) / Math.max(p2.x - p1.x, 1e-6);
      return p1.y + (p2.y - p1.y) * t;
    }
  }
  return x;
}

export function hasColorAdjustment(adjustment?: ColorAdjustment): boolean {
  if (!adjustment || adjustment.enabled === false) return false;
  return Boolean(adjustment.basic || adjustment.hsl || adjustment.curves);
}

export function getActiveSelectiveHsl(
  adjustment?: ColorAdjustment,
): ActiveSelectiveHslAdjustment | null {
  const all = getAllSelectiveHsl(adjustment);
  return all.length > 0 ? all[0] : null;
}

export function getAllSelectiveHsl(
  adjustment?: ColorAdjustment,
): ActiveSelectiveHslAdjustment[] {
  if (!adjustment || adjustment.enabled === false) return [];
  const hsl = adjustment.hsl;
  if (!hsl) return [];

  const byColor = hsl.byColor ?? {};
  const entries = Object.entries(byColor)
    .map(([targetColor, value]) => ({
      targetColor,
      hue: value?.hue ?? 0,
      saturation: value?.saturation ?? 0,
      lightness: value?.lightness ?? 0,
    }))
    .filter(
      (entry) =>
        entry.hue !== 0 || entry.saturation !== 0 || entry.lightness !== 0,
    );

  if (entries.length > 0) return entries;

  if (!hsl.selectedColor) return [];

  const hue = hsl.hue ?? 0;
  const saturation = hsl.saturation ?? 0;
  const lightness = hsl.lightness ?? 0;
  if (hue === 0 && saturation === 0 && lightness === 0) return [];

  return [
    {
      targetColor: hsl.selectedColor,
      hue,
      saturation,
      lightness,
    },
  ];
}

export function applyColorAdjustmentToMatrix(
  matrix: ColorMatrixFilter,
  adjustment?: ColorAdjustment,
  animationBrightnessMultiplier = 1,
): void {
  matrix.reset();

  const basic = adjustment?.basic ?? {};
  const hsl = adjustment?.hsl ?? {};
  const curves = adjustment?.curves;
  const selectiveHsl = getActiveSelectiveHsl(adjustment);

  const combinedSaturation =
    (basic.saturation ?? 0) + (selectiveHsl ? 0 : (hsl.saturation ?? 0));
  if (combinedSaturation !== 0) {
    matrix.saturate(clamp(combinedSaturation / 100, -1, 2), true);
  }

  const combinedHue = (basic.hue ?? 0) + (selectiveHsl ? 0 : (hsl.hue ?? 0));
  if (combinedHue !== 0) {
    matrix.hue(combinedHue, true);
  }

  const basicBrightness = basic.brightness ?? 0;
  const shine = basic.shine ?? 0;
  const highlight = basic.highlight ?? 0;
  const shadow = basic.shadow ?? 0;
  const hslLightness = selectiveHsl ? 0 : (hsl.lightness ?? 0);
  const lightnessScore =
    basicBrightness + hslLightness + shine * 0.25 + highlight * 0.25 - shadow * 0.25;
  const brightness = clamp(1 + lightnessScore / 100, 0, 5) * animationBrightnessMultiplier;
  if (brightness !== 1) {
    matrix.brightness(brightness, true);
  }

  const contrast = clamp(1 + (basic.contrast ?? 0) / 100, 0, 5);
  if (contrast !== 1) {
    matrix.contrast(contrast, true);
  }

  // Effects (basic approximation on top of the color matrix pipeline)
  // Sharpness is approximated as extra micro-contrast.
  const sharpness = basic.sharpness ?? 0;
  if (sharpness !== 0) {
    const sharpnessContrast = clamp(1 + sharpness / 300, 0, 5);
    matrix.contrast(sharpnessContrast, true);
  }

  // Fade reduces punch and color intensity.
  const fade = basic.fade ?? 0;
  if (fade !== 0) {
    const fadeFactor = clamp(fade / 100, 0, 1);
    const fadeContrast = clamp(1 - fadeFactor * 0.35, 0, 5);
    const fadeSaturation = clamp(-fadeFactor * 0.45, -1, 2);
    matrix.contrast(fadeContrast, true);
    matrix.saturate(fadeSaturation, true);
  }

  // Vignette is approximated as a global edge-darkening feel by reducing
  // overall brightness. A true radial vignette would require a fragment shader.
  const vignette = Math.abs(basic.vignette ?? 0);
  if (vignette !== 0) {
    const vignetteFactor = clamp(vignette / 100, 0, 1);
    const vignetteBrightness = clamp(1 - vignetteFactor * 0.2, 0, 5);
    matrix.brightness(vignetteBrightness, true);
  }

  // Grain is approximated with a subtle contrast + saturation perturbation.
  // Real per-pixel film grain requires a noise shader/filter.
  const grain = basic.grain ?? 0;
  if (grain !== 0) {
    const grainFactor = clamp(grain / 100, 0, 1);
    const grainContrast = clamp(1 + grainFactor * 0.08, 0, 5);
    const grainSaturation = clamp(-grainFactor * 0.05, -1, 2);
    matrix.contrast(grainContrast, true);
    matrix.saturate(grainSaturation, true);
  }

  const temperature = clamp((basic.temperature ?? 0) / 100, -1, 1);
  if (temperature !== 0) {
    // Warmth/coolness approximation via RGB channel balance.
    const m = matrix.matrix;
    const redScale = 1 + temperature * 0.2;
    const blueScale = 1 - temperature * 0.2;
    m[0] *= redScale;
    m[6] *= 1;
    m[12] *= blueScale;
  }

  if (curves) {
    // Curves approximation from midpoint response in each channel.
    const rgbMid = getCurveValue(curves.rgb, 0.5);
    const redMid = getCurveValue(curves.red, 0.5);
    const greenMid = getCurveValue(curves.green, 0.5);
    const blueMid = getCurveValue(curves.blue, 0.5);

    const rgbContrast = clamp((rgbMid - 0.5) * 1.8, -0.6, 0.6);
    if (rgbContrast !== 0) {
      matrix.contrast(1 + rgbContrast, true);
    }

    const m = matrix.matrix;
    m[0] *= clamp(1 + (redMid - 0.5) * 0.8, 0.6, 1.4);
    m[6] *= clamp(1 + (greenMid - 0.5) * 0.8, 0.6, 1.4);
    m[12] *= clamp(1 + (blueMid - 0.5) * 0.8, 0.6, 1.4);
  }
}
