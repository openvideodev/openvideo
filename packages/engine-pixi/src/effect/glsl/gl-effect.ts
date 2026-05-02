//@ts-ignore
import {
  BAD_SIGNAL_FRAGMENT,
  BAD_SIGNAL_UNIFORMS,
  BLACK_FLASH_FRAGMENT,
  BLACK_FLASH_UNIFORMS,
  BLINK_FRAGMENT,
  BLINK_UNIFORMS,
  BOUNCING_BALLS_FRAGMENT,
  BOUNCING_BALLS_UNIFORMS,
  BRIGHT_PULSE_FRAGMENT,
  BRIGHT_PULSE_UNIFORMS,
  BUBBLE_SPARKLES_FRAGMENT,
  BUBBLE_SPARKLES_UNIFORMS,
  BUTTERFLY_SPARKLES_FRAGMENT,
  BUTTERFLY_SPARKLES_UNIFORMS,
  CAMERA_MOVE_FRAGMENT,
  CAMERA_MOVE_UNIFORMS,
  CHROMATIC_FRAGMENT,
  CHROMATIC_UNIFORMS,
  CURTAIN_BLUR_FRAGMENT,
  CURTAIN_BLUR_UNIFORMS,
  CURTAIN_OPEN_FRAGMENT,
  CURTAIN_OPEN_UNIFORMS,
  DARK_ERROR_FRAGMENT,
  DARK_ERROR_UNIFORMS,
  DISTORT_EFFECT_FRAGMENT,
  DISTORT_GRID_FRAGMENT,
  DISTORT_GRID_UNIFORMS,
  DISTORT_RIP_FRAGMENT,
  DISTORT_RIP_UNIFORMS,
  DISTORT_SPIN_FRAGMENT,
  DISTORT_SPIN_UNIFORMS,
  DISTORT_UNIFORMS,
  DISTORT_V2_FRAGMENT,
  DISTORT_V2_UNIFORMS,
  DUOTONE_FRAGMENT,
  DUOTONE_UNIFORMS,
  FAST_ZOOM_FRAGMENT,
  FAST_ZOOM_UNIFORMS,
  FILM_STRIP_PRO_FRAGMENT,
  FILM_STRIP_PRO_UNIFORMS,
  FLASH_LOOP_FRAGMENT,
  FLASH_LOOP_UNIFORMS,
  FOCUS_TRANSITION_FRAGMENT,
  FOCUS_TRANSITION_UNIFORMS,
  GLITCH_FRAGMENT,
  GLITCH_UNIFORMS,
  GRAFFITI_FRAGMENT,
  GRAFFITI_UNIFORMS,
  GRAYSCALE_FRAGMENT,
  GRAYSCALE_UNIFORMS,
  HALFTONE_FRAGMENT,
  HALFTONE_UNIFORMS,
  HDR_FRAGMENT,
  HDR_UNIFORMS,
  HDR_V2_FRAGMENT,
  HDR_V2_UNIFORMS,
  HEART_SPARKLES_FRAGMENT,
  HEART_SPARKLES_UNIFORMS,
  HOLOGRAM_SCAN_FRAGMENT,
  HOLOGRAM_SCAN_UNIFORMS,
  HUE_SHIFT_FRAGMENT,
  HUE_SHIFT_UNIFORMS,
  IG_OUTLINE_FRAGMENT,
  IG_OUTLINE_UNIFORMS,
  INVERSE_APERTURE_FRAGMENT,
  INVERSE_APERTURE_UNIFORMS,
  INVERT_FRAGMENT,
  INVERT_UNIFORMS,
  LASER_FRAGMENT,
  LASER_UNIFORMS,
  LIGHTNING_FRAGMENT,
  LIGHTNING_UNIFORMS,
  LIGHTNING_VEINS_FRAGMENT,
  LIGHTNING_VEINS_UNIFORMS,
  MIRROR_TILE_FRAGMENT,
  MIRROR_TILE_UNIFORMS,
  NEGATIVE_DIVISION_FRAGMENT,
  NEGATIVE_DIVISION_UNIFORMS,
  NEON_FLASH_FRAGMENT,
  NEON_FLASH_UNIFORMS,
  OMNIFLEXION_FRAGMENT,
  OMNIFLEXION_UNIFORMS,
  PAPER_BREAK_REVEAL_FRAGMENT,
  PAPER_BREAK_REVEAL_UNIFORMS,
  PERSPECTIVE_SINGLE_FRAGMENT,
  PERSPECTIVE_SINGLE_UNIFORMS,
  PIXEL_ERROR_FRAGMENT,
  PIXEL_ERROR_UNIFORMS,
  PIXELATE_FRAGMENT,
  PIXELATE_TRANSITION_FRAGMENT,
  PIXELATE_TRANSITION_UNIFORMS,
  PIXELATE_UNIFORMS,
  RAINBOW_FRAGMENT,
  RAINBOW_UNIFORMS,
  RANDOM_ACCENTS_FRAGMENT,
  RANDOM_ACCENTS_UNIFORMS,
  RED_GRADIENT_FRAGMENT,
  RED_GRADIENT_UNIFORMS,
  RETRO_70S_FRAGMENT,
  RETRO_70S_UNIFORMS,
  RGB_GLITCH_FRAGMENT,
  RGB_GLITCH_UNIFORMS,
  RGB_SHIFT_FRAGMENT,
  RGB_SHIFT_UNIFORMS,
  ROTATION_MOVEMENT_FRAGMENT,
  ROTATION_MOVEMENT_UNIFORMS,
  SCALE_MOVE_BLUR_FRAGMENT,
  SCALE_MOVE_BLUR_UNIFORMS,
  SEPIA_FRAGMENT,
  SEPIA_UNIFORMS,
  SHINE_FRAGMENT,
  SHINE_UNIFORMS,
  SINEWAVE_FRAGMENT,
  SINEWAVE_UNIFORMS,
  SLIT_SCAN_FRAGMENT,
  SLIT_SCAN_GLITCH_FRAGMENT,
  SLIT_SCAN_GLITCH_UNIFORMS,
  SLIT_SCAN_UNIFORMS,
  SOLUTION_EFFECT_FRAGMENT,
  SOLUTION_EFFECT_UNIFORMS,
  SPARKS_FRAGMENT,
  SPARKS_UNIFORMS,
  SPRING_FRAGMENT,
  SPRING_UNIFORMS,
  SWIRL_MOVEMENT_FRAGMENT,
  SWIRL_MOVEMENT_UNIFORMS,
  TRIANGLE_PATTERN_EFFECT_FRAGMENT,
  TRIANGLE_PATTERN_EFFECT_UNIFORMS,
  TRITONE_FRAGMENT,
  TRITONE_UNIFORMS,
  TV_SCANLINES_FRAGMENT,
  TV_SCANLINES_UNIFORMS,
  TWO_CURTAIN_FRAGMENT,
  TWO_CURTAIN_UNIFORMS,
  UV_GRADIENT_FRAGMENT,
  UV_GRADIENT_UNIFORMS,
  VIGNETTE_FRAGMENT,
  VIGNETTE_UNIFORMS,
  WARP_TRANSITION_FRAGMENT,
  WARP_TRANSITION_UNIFORMS,
  WATER_REFLECTION_FRAGMENT,
  WATER_REFLECTION_UNIFORMS,
  WAVE_DISTORT_FRAGMENT,
  WAVE_DISTORT_UNIFORMS,
  WAVE_FRAGMENT,
  WAVE_UNIFORMS,
} from './custom-glsl';

export interface GlEffect {
  label: string;
  fragment: string;
  uniforms?: Record<string, { value: any; type: string }>;
  previewStatic?: string;
  previewDynamic?: string;
}

// Registry for runtime custom effects
const REGISTERED_EFFECTS: Record<string, GlEffect> = {};

/**
 * Register a custom effect at runtime
 */
export function registerCustomEffect(name: string, effect: GlEffect) {
  REGISTERED_EFFECTS[name] = effect;
}

/**
 * Unregister a custom effect at runtime
 */
export function unregisterCustomEffect(name: string) {
  delete REGISTERED_EFFECTS[name];
}

const STATIC_EFFECTS = {
  rotationMovement: {
    label: 'Rotation Movement',
    fragment: ROTATION_MOVEMENT_FRAGMENT,
    uniforms: ROTATION_MOVEMENT_UNIFORMS,
  },
  redGradient: {
    label: 'Red Gradient',
    fragment: RED_GRADIENT_FRAGMENT,
    uniforms: RED_GRADIENT_UNIFORMS,
  },
  bubbleSparkles: {
    label: 'Bubble Sparkles',
    fragment: BUBBLE_SPARKLES_FRAGMENT,
    uniforms: BUBBLE_SPARKLES_UNIFORMS,
  },
  sepia: {
    label: 'Sepia',
    fragment: SEPIA_FRAGMENT,
    uniforms: SEPIA_UNIFORMS,
  },
  uvGradient: {
    label: 'UV Gradient',
    fragment: UV_GRADIENT_FRAGMENT,
    uniforms: UV_GRADIENT_UNIFORMS,
  },
  rainbow: {
    label: 'Rainbow',
    fragment: RAINBOW_FRAGMENT,
    uniforms: RAINBOW_UNIFORMS,
  },
  glitch: {
    label: 'Glitch',
    fragment: GLITCH_FRAGMENT,
    uniforms: GLITCH_UNIFORMS,
  },
  pixelate: {
    label: 'Pixelate',
    fragment: PIXELATE_FRAGMENT,
    uniforms: PIXELATE_UNIFORMS,
  },
  rgbGlitch: {
    label: 'RGB Glitch',
    fragment: RGB_GLITCH_FRAGMENT,
    uniforms: RGB_GLITCH_UNIFORMS,
  },
  rgbShift: {
    label: 'RGB Shift',
    fragment: RGB_SHIFT_FRAGMENT,
    uniforms: RGB_SHIFT_UNIFORMS,
  },
  halftone: {
    label: 'Halftone',
    fragment: HALFTONE_FRAGMENT,
    uniforms: HALFTONE_UNIFORMS,
  },
  sinewave: {
    label: 'Sinewave',
    fragment: SINEWAVE_FRAGMENT,
    uniforms: SINEWAVE_UNIFORMS,
  },
  shine: {
    label: 'Shine',
    fragment: SHINE_FRAGMENT,
    uniforms: SHINE_UNIFORMS,
  },
  blink: {
    label: 'Blink',
    fragment: BLINK_FRAGMENT,
    uniforms: BLINK_UNIFORMS,
  },
  spring: {
    label: 'Spring',
    fragment: SPRING_FRAGMENT,
    uniforms: SPRING_UNIFORMS,
  },
  duotone: {
    label: 'Duotone',
    fragment: DUOTONE_FRAGMENT,
    uniforms: DUOTONE_UNIFORMS,
  },
  tritone: {
    label: 'Tritone',
    fragment: TRITONE_FRAGMENT,
    uniforms: TRITONE_UNIFORMS,
  },
  hueShift: {
    label: 'Hue Shift',
    fragment: HUE_SHIFT_FRAGMENT,
    uniforms: HUE_SHIFT_UNIFORMS,
  },
  warpTransition: {
    label: 'Warp Transition',
    fragment: WARP_TRANSITION_FRAGMENT,
    uniforms: WARP_TRANSITION_UNIFORMS,
  },
  slitScan: {
    label: 'Slit Scan',
    fragment: SLIT_SCAN_FRAGMENT,
    uniforms: SLIT_SCAN_UNIFORMS,
  },
  slitScanGlitch: {
    label: 'Slit Scan Glitch',
    fragment: SLIT_SCAN_GLITCH_FRAGMENT,
    uniforms: SLIT_SCAN_GLITCH_UNIFORMS,
  },
  pixelateTransition: {
    label: 'Pixelate Transition',
    fragment: PIXELATE_TRANSITION_FRAGMENT,
    uniforms: PIXELATE_TRANSITION_UNIFORMS,
  },
  focusTransition: {
    label: 'Focus Transition',
    fragment: FOCUS_TRANSITION_FRAGMENT,
    uniforms: FOCUS_TRANSITION_UNIFORMS,
  },
  invert: {
    label: 'Invert',
    fragment: INVERT_FRAGMENT,
    uniforms: INVERT_UNIFORMS,
  },
  grayscale: {
    label: 'Grayscale',
    fragment: GRAYSCALE_FRAGMENT,
    uniforms: GRAYSCALE_UNIFORMS,
  },
  vignette: {
    label: 'Vignette',
    fragment: VIGNETTE_FRAGMENT,
    uniforms: VIGNETTE_UNIFORMS,
  },
  chromatic: {
    label: 'Chromatic',
    fragment: CHROMATIC_FRAGMENT,
    uniforms: CHROMATIC_UNIFORMS,
  },
  swirlMovement: {
    label: 'Swirl Movement',
    fragment: SWIRL_MOVEMENT_FRAGMENT,
    uniforms: SWIRL_MOVEMENT_UNIFORMS,
  },
  heartSparkles: {
    label: 'Heart Sparkles',
    fragment: HEART_SPARKLES_FRAGMENT,
    uniforms: HEART_SPARKLES_UNIFORMS,
  },
  butterflySparkles: {
    label: 'Butterfly Sparkles',
    fragment: BUTTERFLY_SPARKLES_FRAGMENT,
    uniforms: BUTTERFLY_SPARKLES_UNIFORMS,
  },
  distort: {
    label: 'Distort',
    fragment: DISTORT_EFFECT_FRAGMENT,
    uniforms: DISTORT_UNIFORMS,
  },
  perspectiveSingle: {
    label: 'Perspective Single',
    fragment: PERSPECTIVE_SINGLE_FRAGMENT,
    uniforms: PERSPECTIVE_SINGLE_UNIFORMS,
  },
  distortSpin: {
    label: 'Distort Spin',
    fragment: DISTORT_SPIN_FRAGMENT,
    uniforms: DISTORT_SPIN_UNIFORMS,
  },
  distortGrid: {
    label: 'Distort Grid',
    fragment: DISTORT_GRID_FRAGMENT,
    uniforms: DISTORT_GRID_UNIFORMS,
  },
  distortRip: {
    label: 'Distort Rip',
    fragment: DISTORT_RIP_FRAGMENT,
    uniforms: DISTORT_RIP_UNIFORMS,
  },
  twoCurtain: {
    label: 'Two Curtain',
    fragment: TWO_CURTAIN_FRAGMENT,
    uniforms: TWO_CURTAIN_UNIFORMS,
  },
  trianglePattern: {
    label: 'Triangle Pattern',
    fragment: TRIANGLE_PATTERN_EFFECT_FRAGMENT,
    uniforms: TRIANGLE_PATTERN_EFFECT_UNIFORMS,
  },
  mirrorTile: {
    label: 'Mirror Tile',
    fragment: MIRROR_TILE_FRAGMENT,
    uniforms: MIRROR_TILE_UNIFORMS,
  },
  flashLoop: {
    label: 'Flash Loop',
    fragment: FLASH_LOOP_FRAGMENT,
    uniforms: FLASH_LOOP_UNIFORMS,
  },
  filmStripPro: {
    label: 'Film Strip Pro',
    fragment: FILM_STRIP_PRO_FRAGMENT,
    uniforms: FILM_STRIP_PRO_UNIFORMS,
  },
  badSignal: {
    label: 'Bad Signal',
    fragment: BAD_SIGNAL_FRAGMENT,
    uniforms: BAD_SIGNAL_UNIFORMS,
  },
  omniflexion: {
    label: 'Omniflexion',
    fragment: OMNIFLEXION_FRAGMENT,
    uniforms: OMNIFLEXION_UNIFORMS,
  },
  inverseAperture: {
    label: 'Inverse Aperture',
    fragment: INVERSE_APERTURE_FRAGMENT,
    uniforms: INVERSE_APERTURE_UNIFORMS,
  },
  curtainOpen: {
    label: 'Curtain Open',
    fragment: CURTAIN_OPEN_FRAGMENT,
    uniforms: CURTAIN_OPEN_UNIFORMS,
  },
  curtainBlur: {
    label: 'Curtain Blur',
    fragment: CURTAIN_BLUR_FRAGMENT,
    uniforms: CURTAIN_BLUR_UNIFORMS,
  },
  distortV2: {
    label: 'Distort V2',
    fragment: DISTORT_V2_FRAGMENT,
    uniforms: DISTORT_V2_UNIFORMS,
  },
  lightning: {
    label: 'Lightning',
    fragment: LIGHTNING_FRAGMENT,
    uniforms: LIGHTNING_UNIFORMS,
  },
  lightningVeins: {
    label: 'Lightning Veins',
    fragment: LIGHTNING_VEINS_FRAGMENT,
    uniforms: LIGHTNING_VEINS_UNIFORMS,
  },
  pixelError: {
    label: 'Pixel Error',
    fragment: PIXEL_ERROR_FRAGMENT,
    uniforms: PIXEL_ERROR_UNIFORMS,
  },
  neonFlash: {
    label: 'Neon Flash',
    fragment: NEON_FLASH_FRAGMENT,
    uniforms: NEON_FLASH_UNIFORMS,
  },
  waveDistort: {
    label: 'Wave Distort',
    fragment: WAVE_DISTORT_FRAGMENT,
    uniforms: WAVE_DISTORT_UNIFORMS,
  },
  bouncingBalls: {
    label: 'Bouncing Balls',
    fragment: BOUNCING_BALLS_FRAGMENT,
    uniforms: BOUNCING_BALLS_UNIFORMS,
  },
  waterReflection: {
    label: 'Water Reflection',
    fragment: WATER_REFLECTION_FRAGMENT,
    uniforms: WATER_REFLECTION_UNIFORMS,
  },
  darkError: {
    label: 'Dark Error',
    fragment: DARK_ERROR_FRAGMENT,
    uniforms: DARK_ERROR_UNIFORMS,
  },
  scaleMoveBlur: {
    label: 'Scale Move Blur',
    fragment: SCALE_MOVE_BLUR_FRAGMENT,
    uniforms: SCALE_MOVE_BLUR_UNIFORMS,
  },
  paperBreakReveal: {
    label: 'Paper Break Reveal',
    fragment: PAPER_BREAK_REVEAL_FRAGMENT,
    uniforms: PAPER_BREAK_REVEAL_UNIFORMS,
  },
  graffiti: {
    label: 'Graffiti',
    fragment: GRAFFITI_FRAGMENT,
    uniforms: GRAFFITI_UNIFORMS,
  },
  laser: {
    label: 'Laser',
    fragment: LASER_FRAGMENT,
    uniforms: LASER_UNIFORMS,
  },
  wave: {
    label: 'Wave',
    fragment: WAVE_FRAGMENT,
    uniforms: WAVE_UNIFORMS,
  },
  sparks: {
    label: 'Sparks',
    fragment: SPARKS_FRAGMENT,
    uniforms: SPARKS_UNIFORMS,
  },
  hologramScan: {
    label: 'Hologram Scan',
    fragment: HOLOGRAM_SCAN_FRAGMENT,
    uniforms: HOLOGRAM_SCAN_UNIFORMS,
  },
  retro70s: {
    label: 'Retro 70s',
    fragment: RETRO_70S_FRAGMENT,
    uniforms: RETRO_70S_UNIFORMS,
  },
  igOutline: {
    label: 'IG Outline',
    fragment: IG_OUTLINE_FRAGMENT,
    uniforms: IG_OUTLINE_UNIFORMS,
  },
  randomAccents: {
    label: 'Random Accents',
    fragment: RANDOM_ACCENTS_FRAGMENT,
    uniforms: RANDOM_ACCENTS_UNIFORMS,
  },
  solution: {
    label: 'Solution',
    fragment: SOLUTION_EFFECT_FRAGMENT,
    uniforms: SOLUTION_EFFECT_UNIFORMS,
  },
  tvScanlines: {
    label: 'TV Scanlines',
    fragment: TV_SCANLINES_FRAGMENT,
    uniforms: TV_SCANLINES_UNIFORMS,
  },
  hdr: {
    label: 'HDR',
    fragment: HDR_FRAGMENT,
    uniforms: HDR_UNIFORMS,
  },
  blackFlash: {
    label: 'Black Flash',
    fragment: BLACK_FLASH_FRAGMENT,
    uniforms: BLACK_FLASH_UNIFORMS,
  },
  brightPulse: {
    label: 'Bright Pulse',
    fragment: BRIGHT_PULSE_FRAGMENT,
    uniforms: BRIGHT_PULSE_UNIFORMS,
  },
  negativeDivision: {
    label: 'Negative Division',
    fragment: NEGATIVE_DIVISION_FRAGMENT,
    uniforms: NEGATIVE_DIVISION_UNIFORMS,
  },
  cameraMove: {
    label: 'Camera Move',
    fragment: CAMERA_MOVE_FRAGMENT,
    uniforms: CAMERA_MOVE_UNIFORMS,
  },
  hdrV2: {
    label: 'HDR V2',
    fragment: HDR_V2_FRAGMENT,
    uniforms: HDR_V2_UNIFORMS,
  },
  fastZoom: {
    label: 'Fast Zoom',
    fragment: FAST_ZOOM_FRAGMENT,
    uniforms: FAST_ZOOM_UNIFORMS,
  },
} as const satisfies Record<string, GlEffect>;

/**
 * Get all available effects, including library and runtime registered ones
 */
export function getAllEffects(): Record<string, GlEffect> {
  return {
    ...STATIC_EFFECTS,
    ...REGISTERED_EFFECTS,
  };
}

// Keep GL_EFFECTS for backward compatibility, but it will only contain initial ones
export const GL_EFFECTS = getAllEffects();

export type EffectKey = string;

export function getEffectOptions() {
  const registeredKeys = Object.keys(REGISTERED_EFFECTS);
  return Object.entries(getAllEffects()).map(([key, value]) => ({
    key: key as EffectKey,
    label: value.label,
    isCustom: registeredKeys.includes(key),
    previewStatic:
      value.previewStatic ||
      `https://cdn.subgen.co/previews/effects/static/effect_${key}_static.webp`,
    previewDynamic:
      value.previewDynamic ||
      `https://cdn.subgen.co/previews/effects/dynamic/effect_${key}_dynamic.webp`,
  }));
}

// Keep GL_EFFECT_OPTIONS for backward compatibility
export const GL_EFFECT_OPTIONS = getEffectOptions();
