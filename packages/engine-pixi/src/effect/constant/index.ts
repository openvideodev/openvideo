import {
  AdjustmentFilter,
  AdvancedBloomFilter,
  AsciiFilter,
  BackdropBlurFilter,
  BevelFilter,
  BloomFilter,
  BulgePinchFilter,
  ColorGradientFilter,
  ColorMapFilter,
  ColorOverlayFilter,
  ColorReplaceFilter,
  ConvolutionFilter,
  CrossHatchFilter,
  CRTFilter,
  DotFilter,
  DropShadowFilter,
  EmbossFilter,
  GlitchFilter,
  GlowFilter,
  GodrayFilter,
  GrayscaleFilter,
  HslAdjustmentFilter,
  KawaseBlurFilter,
  MotionBlurFilter,
  MultiColorReplaceFilter,
  OldFilmFilter,
  OutlineFilter,
  PixelateFilter,
  RadialBlurFilter,
  ReflectionFilter,
  RGBSplitFilter,
  ShockwaveFilter,
  SimpleLightmapFilter,
  SimplexNoiseFilter,
  TiltShiftFilter,
  TwistFilter,
  ZoomBlurFilter,
} from "pixi-filters";
import { FilterOptionsMap } from "../interface";

export const FILTER_CLASSES: Record<string, any> = {
  adjustmentFilter: AdjustmentFilter,
  advancedBloomFilter: AdvancedBloomFilter,
  asciiFilter: AsciiFilter,
  backdropBlurFilter: BackdropBlurFilter,
  bevelFilter: BevelFilter,
  bloomFilter: BloomFilter,
  bulgePinchFilter: BulgePinchFilter,
  colorGradientFilter: ColorGradientFilter,
  colorMapFilter: ColorMapFilter,
  colorOverlayFilter: ColorOverlayFilter,
  colorReplaceFilter: ColorReplaceFilter,
  convolutionFilter: ConvolutionFilter,
  crossHatchFilter: CrossHatchFilter,
  crtFilter: CRTFilter,
  dotFilter: DotFilter,
  dropShadowFilter: DropShadowFilter,
  embossFilter: EmbossFilter,
  glitchFilter: GlitchFilter,
  glowFilter: GlowFilter,
  godrayFilter: GodrayFilter,
  grayscaleFilter: GrayscaleFilter,
  hslAdjustmentFilter: HslAdjustmentFilter,
  kawaseBlurFilter: KawaseBlurFilter,
  motionBlurFilter: MotionBlurFilter,
  multiColorReplaceFilter: MultiColorReplaceFilter,
  oldFilmFilter: OldFilmFilter,
  outlineFilter: OutlineFilter,
  pixelateFilter: PixelateFilter,
  radialBlurFilter: RadialBlurFilter,
  reflectionFilter: ReflectionFilter,
  rgbSplitFilter: RGBSplitFilter,
  shockwaveFilter: ShockwaveFilter,
  simpleLightmapFilter: SimpleLightmapFilter,
  simplexNoiseFilter: SimplexNoiseFilter,
  tiltShiftFilter: TiltShiftFilter,
  twistFilter: TwistFilter,
  zoomBlurFilter: ZoomBlurFilter,
};

export const VALUES_FILTER_SPECIAL: FilterOptionsMap = {
  adjustmentFilter: {
    gamma: 1.5,
    saturation: 0.5,
    contrast: 1.2,
    brightness: 1.5,
    red: 1.5,
    green: 1.5,
    blue: 1.5,
    alpha: 1.0,
  },
  advancedBloomFilter: {
    threshold: 0.2,
    bloomScale: 1.0,
    brightness: 1.0,
    blur: 20.0,
    quality: 1.0,
  },
  asciiFilter: {
    size: 8,
    color: "#ffffff",
    replaceColor: true,
  },
  backdropBlurFilter: {
    blur: 10,
    quality: 4,
  },
  bevelFilter: {
    rotation: 45,
    thickness: 10,
    lightColor: "#ffffff",
    lightAlpha: 1.0,
    shadowColor: "#000000",
    shadowAlpha: 1.0,
  },
  bloomFilter: {
    kernelSize: 5,
    quality: 2,
    resolution: 3,
    strength: {
      x: 10.0,
      y: 10.0,
    },
  },
  bulgePinchFilter: {
    center: { x: 0.5, y: 0.5 },
    radius: 400,
    strength: 1.0,
  },
  colorGradientFilter: {
    type: 1,
    alpha: 1,
    angle: 90,
    maxColors: 0,
    replace: true,
    stops: [
      {
        color: "#ffffff",
        offset: 0,
        alpha: 1,
      },
      {
        color: "#000000",
        offset: 1,
        alpha: 1,
      },
    ],
  },
  colorMapFilter: {
    mix: 1,
    nearest: true,
    // colorMap
  },
  colorOverlayFilter: {
    color: "#ffffff",
    alpha: 1,
  },
  colorReplaceFilter: {
    originalColor: "#ffffff",
    targetColor: "#000000",
    tolerance: 0.1,
  },
  convolutionFilter: {
    width: 3,
    height: 3,
    matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
  },
  crossHatchFilter: {},
  crtFilter: {
    curvature: 1,
    lineWidth: 3,
    lineContrast: 0.4,
    verticalLine: true,
    noise: 0.2,
    noiseSize: 1,
    vignetting: 0.3,
    vignettingAlpha: 1.0,
    vignettingBlur: 0.3,
    seed: 0,
    time: 0.5,
  },
  dotFilter: {
    scale: 1,
    angle: 1,
    grayscale: true,
  },
  dropShadowFilter: {
    blur: 1,
    quality: 3,
    alpha: 0.5,
    offset: { x: 4, y: 4 },
    color: "#000000",
    shadowOnly: true,
  },
  embossFilter: {
    strength: 5,
  },
  glitchFilter: {
    seed: 0.5,
    slices: 10,
    offset: 0.1,
    direction: 0,
    fillMode: 0,
    red: {
      x: 2,
      y: 2,
    },
    green: {
      x: 10,
      y: -4,
    },
    blue: {
      x: -10,
      y: 4,
    },
  },
  glowFilter: {
    distance: 10,
    outerStrength: 2,
    innerStrength: 0,
    color: "#ffffff",
    quality: 1,
    alpha: 1,
    knockout: false,
  },
  godrayFilter: {
    time: 0,
    gain: 0.6,
    lacunarity: 2.75,
    alpha: 1,
    parallel: true,
    angle: 30,
    center: {
      x: 426,
      y: -100,
    },
  },
  grayscaleFilter: {},
  hslAdjustmentFilter: {
    hue: 100,
    saturation: 1,
    lightness: 0,
    colorize: false,
    alpha: 1,
  },
  kawaseBlurFilter: {
    strength: 4,
    quality: 3,
    pixelSize: {
      x: 1,
      y: 1,
    },
  },
  motionBlurFilter: {
    velocity: {
      x: 40,
      y: 40,
    },
    kernelSize: 5,
    offset: 0,
  },
  multiColorReplaceFilter: {
    replacements: [
      ["#ff0000", "#00ff00"],
      ["#0000ff", "#ffff00"],
    ],
    tolerance: 0.1,
  },

  oldFilmFilter: {
    sepia: 0.3,
    noise: 0.3,
    noiseSize: 1,
    scratch: 0.5,
    scratchDensity: 0.5,
    scratchWidth: 1,
    vignetting: 0.3,
    vignettingAlpha: 1.0,
    vignettingBlur: 0.3,
  },
  outlineFilter: {
    thickness: 1,
    color: "#000000",
    alpha: 1,
    knockout: false,
  },
  pixelateFilter: {
    size: 10,
  },
  radialBlurFilter: {
    angle: 20,
    center: {
      x: 0,
      y: 0,
    },
    radius: 300,
    kernelSize: 15,
  },
  reflectionFilter: {
    mirror: true,
    boundary: 0.5,
    amplitude: [20, 50],
    waveLength: [30, 100],
    alpha: [1, 1],
    time: 0,
  },
  rgbSplitFilter: {
    red: { x: 2, y: 2 },
    green: { x: 10, y: -4 },
    blue: { x: -10, y: 4 },
  },
  shockwaveFilter: {
    speed: 500,
    amplitude: 30,
    wavelength: 160,
    brightness: 1,
    radius: -1,
    center: {
      x: 420,
      y: 410,
    },
  },
  simpleLightmapFilter: {
    color: "#ffffff",
    alpha: 1,
  },
  simplexNoiseFilter: {
    strength: 0.5,
    noiseScale: 10,
    offsetX: 0,
    offsetY: 0,
    offsetZ: 0,
    step: -1,
  },
  tiltShiftFilter: {
    blur: 100,
    gradientBlur: 600,
    start: {
      x: 0,
      y: 0,
    },
    end: {
      x: 853,
      y: 414,
    },
  },
  twistFilter: {
    angle: 10,
    radius: 100,
    offset: {
      x: 426,
      y: 414,
    },
  },
  zoomBlurFilter: {
    strength: 0.1,
    center: {
      x: 426,
      y: 414,
    },
    innerRadius: 80,
    radius: -1,
  },
};

export const VALUES_FILTER_SPECIAL_LIMITS = {
  adjustmentFilter: {
    gamma: { min: 0, max: 5, step: 0.07 },
    saturation: { min: 0, max: 5, step: 0.07 },
    contrast: { min: 0, max: 5, step: 0.07 },
    brightness: { min: 0, max: 5, step: 0.07 },
    red: { min: 0, max: 5, step: 0.07 },
    green: { min: 0, max: 5, step: 0.07 },
    blue: { min: 0, max: 5, step: 0.07 },
    alpha: { min: 0, max: 5, step: 0.07 },
  },
  advancedBloomFilter: {
    threshold: { min: 0.1, max: 0.9, step: 0.009 },
    bloomScale: { min: 0.5, max: 1.5, step: 0.015 },
    brightness: { min: 0.5, max: 1.5, step: 0.015 },
    blur: { min: 0, max: 20, step: 0.2 },
    quality: { min: 1, max: 20, step: 1 },
  },
  asciiFilter: {
    size: { min: 2, max: 20, step: 0.015 },
  },
  backdropBlurFilter: {
    blur: { min: 0, max: 100, step: 2.3 },
    quality: { min: 1, max: 10, step: 0.1 },
  },
  bevelFilter: {
    rotation: { min: 0, max: 360, step: 5 },
    thickness: { min: 0, max: 10, step: 0.25 },
    lightAlpha: { min: 0, max: 1, step: 0.013 },
    shadowAlpha: { min: 0, max: 1, step: 0.013 },
  },
  bloomFilter: {
    kernelSize: { min: 0, max: 15, step: 1 },
    quality: { min: 0, max: 10, step: 1 },
    resolution: { min: 0, max: 10, step: 1 },
    strength: {
      x: { min: 0, max: 20, step: 0.5 },
      y: { min: 0, max: 20, step: 0.5 },
    },
  },
  bulgePinchFilter: {
    center: {
      x: { min: 0, max: 1, step: 0.013 },
      y: { min: 0, max: 1, step: 0.013 },
    },
    radius: { min: 0, max: 1000, step: 12.0 },
    strength: { min: -1.0, max: 1.0, step: 0.1 },
  },
  colorGradientFilter: {
    alpha: { min: 0, max: 1, step: 0.013 },
    angle: { min: 0, max: 360, step: 1 },
    stops: [
      {
        offset: { min: 0, max: 1, step: 0.012 },
        alpha: { min: 0, max: 1, step: 0.012 },
      },
    ],
  },
  colorMapFilter: {
    mix: { min: 0, max: 1, step: 0.013 },
  },
  colorOverlayFilter: {
    alpha: { min: 0, max: 1, step: 0.013 },
  },
  colorReplaceFilter: {
    tolerance: { min: 0, max: 1, step: 0.013 },
  },
  convolutionFilter: {
    width: { min: 0, max: 500, step: 1.0 },
    height: { min: 0, max: 500, step: 1.0 },
    matrix: [
      {
        max: 0,
        min: 1,
        step: 0.01,
      },
      {
        max: 0,
        min: 1,
        step: 0.01,
      },
      {
        max: 0,
        min: 1,
        step: 0.01,
      },
      {
        max: 0,
        min: 1,
        step: 0.01,
      },
      {
        max: 0,
        min: 1,
        step: 0.01,
      },
      {
        max: 0,
        min: 1,
        step: 0.01,
      },
      {
        max: 0,
        min: 1,
        step: 0.01,
      },
      {
        max: 0,
        min: 1,
        step: 0.01,
      },
    ],
  },
  crossHatchFilter: {},
  crtFilter: {
    curvature: { min: 0, max: 10, step: 0.01 },
    lineWidth: { min: 0, max: 5, step: 0.1 },
    lineContrast: { min: 0, max: 1, step: 0.013 },
    noise: { min: 0, max: 1, step: 0.013 },
    noiseSize: { min: 1, max: 10, step: 0.01 },
    vignetting: { min: 0, max: 1, step: 0.013 },
    vignettingAlpha: { min: 0, max: 1, step: 0.013 },
    vignettingBlur: { min: 0, max: 1, step: 0.013 },
    seed: { min: 0, max: 1, step: 0.01 },
    time: { min: 0, max: 20, step: 0.01 },
  },
  dotFilter: {
    scale: { min: 0.3, max: 1, step: 0.01 },
    angle: { min: 0, max: 5, step: 0.01 },
  },
  dropShadowFilter: {
    blur: { min: 0, max: 20, step: 0.5 },
    quality: { min: 1, max: 20, step: 1 },
    alpha: { min: 0, max: 1, step: 0.013 },
    offset: {
      x: { min: -50, max: 50, step: 2.5 },
      y: { min: -50, max: 50, step: 2.5 },
    },
  },
  embossFilter: {
    strength: { min: 0, max: 20, step: 0.1 },
  },
  glitchFilter: {
    seed: { min: 0, max: 1, step: 0.01 },
    slices: { min: 2, max: 20, step: 0.01 },
    offset: { min: -400, max: 400, step: 0.1 },
    direction: { min: -180, max: 180, step: 0.1 },
    red: {
      x: { min: -50, max: 50, step: 1 },
      y: { min: -50, max: 50, step: 1 },
    },
    green: {
      x: { min: -50, max: 50, step: 1 },
      y: { min: -50, max: 50, step: 1 },
    },
    blue: {
      x: { min: -50, max: 50, step: 1 },
      y: { min: -50, max: 50, step: 1 },
    },
  },
  glowFilter: {
    distance: { min: 0, max: 20, step: 0.013 },
    outerStrength: { min: 0, max: 20, step: 0.013 },
    innerStrength: { min: 0, max: 20, step: 0.013 },
    quality: { min: 0, max: 1, step: 0.013 },
    alpha: { min: 0, max: 1, step: 0.013 },
  },
  godrayFilter: {
    time: { min: 0, max: 1, step: 0.013 },
    gain: { min: 0, max: 1, step: 0.013 },
    lacunarity: { min: 0, max: 5, step: 0.013 },
    alpha: { min: 0, max: 1, step: 0.013 },

    angle: { min: -60, max: 60, step: 0.1 },
    center: {
      x: { min: -100, max: 960, step: 14 },
      y: { min: -1000, max: -100, step: 14 },
    },
  },
  grayscaleFilter: {},
  hslAdjustmentFilter: {
    hue: { min: -180, max: 180, step: 0.013 },
    saturation: { min: -1, max: 1, step: 0.013 },
    lightness: { min: -1, max: 1, step: 0.013 },
    alpha: { min: 0, max: 1, step: 0.013 },
  },
  kawaseBlurFilter: {
    strength: { min: 0, max: 20, step: 0.013 },
    quality: { min: 1, max: 20, step: 0.013 },
    pixelSize: {
      x: { min: 0, max: 10, step: 0.013 },
      y: { min: 0, max: 10, step: 0.013 },
    },
  },
  motionBlurFilter: {
    velocity: {
      x: { min: -90, max: 90, step: 0.013 },
      y: { min: -90, max: 90, step: 0.013 },
    },
    kernelSize: { min: 0, max: 25, step: 3 },
    offset: { min: -150, max: 150, step: 0.1 },
  },
  multiColorReplaceFilter: {
    tolerance: { min: 0, max: 1, step: 0.01 },
  },
  oldFilmFilter: {
    sepia: { min: 0, max: 1, step: 0.01 },
    noise: { min: 0, max: 1, step: 0.01 },
    noiseSize: { min: 1, max: 20, step: 1 },
    scratch: { min: -1, max: 1, step: 0.01 },
    scratchDensity: { min: 0, max: 1, step: 0.01 },
    scratchWidth: { min: 1, max: 20, step: 1 },
    vignetting: { min: 0, max: 1, step: 0.01 },
    vignettingAlpha: { min: 0, max: 1, step: 0.01 },
    vignettingBlur: { min: 0, max: 1, step: 0.01 },
  },
  outlineFilter: {
    thickness: { min: 0, max: 10, step: 0.1 },
    alpha: { min: 0, max: 1, step: 0.001 },
  },
  pixelateFilter: {
    size: { min: 4, max: 40, step: 0.013 },
  },
  radialBlurFilter: {
    angle: { min: -180, max: 180, step: 0.1 },
    center: {
      x: { min: 0, max: 2000, step: 0.1 },
      y: { min: 0, max: 2000, step: 0.1 },
    },
    radius: { min: -1, max: 860, step: 0.1 },
    kernelSize: { min: 0, max: 25, step: 3 },
  },
  reflectionFilter: {
    boundary: { min: 0, max: 1, step: 0.01 },
    amplitude: [
      {
        min: 0,
        max: 50,
        step: 0.013,
      },
      {
        min: 0,
        max: 50,
        step: 0.013,
      },
    ],
    waveLength: [
      {
        min: 0,
        max: 200,
        step: 0.013,
      },
      {
        min: 0,
        max: 200,
        step: 0.013,
      },
    ],
    alpha: [
      {
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
    time: { min: 0, max: 20, step: 0.01 },
  },
  rgbSplitFilter: {
    red: {
      x: { min: -20, max: 20, step: 0.013 },
      y: { min: -20, max: 20, step: 0.013 },
    },
    green: {
      x: { min: -20, max: 20, step: 0.013 },
      y: { min: -20, max: 20, step: 0.013 },
    },
    blue: {
      x: { min: -20, max: 20, step: 0.013 },
      y: { min: -20, max: 20, step: 0.013 },
    },
  },
  shockwaveFilter: {
    speed: { min: 500, max: 2000, step: 0.7 },
    amplitude: { min: 1, max: 100, step: 0.01 },
    wavelength: { min: 2, max: 400, step: 0.01 },
    brightness: { min: 0.2, max: 2, step: 0.01 },
    radius: { min: 100, max: 2000, step: 0.7 },
    center: {
      x: { min: 0, max: 2000, step: 0.013 },
      y: { min: 0, max: 2000, step: 0.013 },
    },
  },
  simpleLightmapFilter: {
    alpha: { min: 0, max: 1, step: 0.01 },
  },
  simplexNoiseFilter: {
    strength: { min: 0, max: 1, step: 0.01 },
    noiseScale: { min: 0, max: 50, step: 0.1 },
    offsetX: { min: 0, max: 5, step: 0.01 },
    offsetY: { min: 0, max: 5, step: 0.01 },
    offsetZ: { min: 0, max: 5, step: 0.01 },
    step: { min: -1, max: 1, step: 0.01 },
  },
  tiltShiftFilter: {
    blur: { min: 0, max: 200, step: 0.1 },
    gradientBlur: { min: 0, max: 1000, step: 1 },
    start: {
      x: { min: 0, max: 2000, step: 0.1 },
      y: { min: 0, max: 2000, step: 0.1 },
    },
    end: {
      x: { min: 0, max: 2000, step: 0.1 },
      y: { min: 0, max: 2000, step: 0.1 },
    },
  },
  twistFilter: {
    angle: { min: -10, max: 10, step: 0.1 },
    radius: { min: 0, max: 2000, step: 0.1 },
    offset: {
      x: { min: 0, max: 2000, step: 0.1 },
      y: { min: 0, max: 2000, step: 0.1 },
    },
  },
  zoomBlurFilter: {
    strength: { min: 0.01, max: 0.5, step: 0.001 },
    center: {
      x: { min: 0, max: 2000, step: 0.1 },
      y: { min: 0, max: 2000, step: 0.1 },
    },
    innerRadius: { min: 0, max: 430, step: 0.1 },
    radius: { min: 0, max: 430, step: 0.1 },
  },
};
