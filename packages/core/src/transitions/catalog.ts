/**
 * @openvideo/core — Transition Catalog
 *
 * This is the single source of truth for all supported transitions across rendering providers.
 * Each entry provides human-readable metadata, a description, default parameters, and the
 * list of rendering providers that support this transition.
 *
 * Supported providers:
 *  - "engine-pixi"   : PixiJS-based GLSL renderer (gl-transitions library + custom)
 *  - "react-skia"    : React Native Skia renderer
 *  - (add more as needed)
 *
 * To add a new transition:
 *  1. Append an ITransitionDefinition entry to TRANSITION_CATALOG.
 *  2. List which providers support it under `supportedProviders`.
 *  3. If it needs custom params, add them under `defaultParams`.
 *  4. Register the actual shader/implementation in the provider package.
 */

export type TransitionCategory =
  | "fade"
  | "wipe"
  | "slide"
  | "zoom"
  | "distort"
  | "stylized"
  | "glitch"
  | "geometric"
  | "blur";

export interface ITransitionDefinition {
  /** The key matching the GLSL shader name or skia handler identifier */
  key: string;
  /** Human-readable display name */
  name: string;
  /** Describes what the transition looks like to the user/AI */
  description: string;
  /** Broad visual category used for filtering and AI matching */
  category: TransitionCategory;
  /**
   * Default parameter values for the transition.
   * These mirror the shader's uniform defaults and can be overridden per use.
   */
  defaultParams: Record<string, any>;
  /**
   * Which rendering providers implement this transition.
   * The key used in the provider must match `key` above.
   */
  supportedProviders: string[];
  /** Whether this transition was manually added (not from gl-transitions library) */
  isCustom?: boolean;
}

/**
 * Complete catalog of all supported transitions.
 * Ordered alphabetically within categories for readability.
 */
export const TRANSITION_CATALOG: ITransitionDefinition[] = [
  // ─── Fade ──────────────────────────────────────────────────────────────────
  {
    key: "fade",
    name: "Fade",
    description:
      "A simple cross-dissolve where the outgoing scene fades out while the incoming scene fades in.",
    category: "fade",
    defaultParams: {},
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "fadecolor",
    name: "Fade Through Color",
    description:
      "Fades out through a solid color (default: black) then fades into the next scene, creating a cinematic dip-to-color effect.",
    category: "fade",
    defaultParams: { color: [0, 0, 0], colorPhase: 0.4 },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "fadegrayscale",
    name: "Fade to Grayscale",
    description:
      "Transitions by temporarily desaturating both clips before blending, giving a nostalgic film-like feel.",
    category: "fade",
    defaultParams: { intensity: 0.3 },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "burn",
    name: "Burn",
    description:
      "A vibrant, fiery cross-burn blend that uses a warm color overlay during the transition.",
    category: "fade",
    defaultParams: { color: [0.9, 0.4, 0.2] },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "multiply_blend",
    name: "Multiply Blend",
    description:
      "Blends scenes using multiply compositing mode for a dark, layered photographic look.",
    category: "fade",
    defaultParams: {},
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "colorphase",
    name: "Color Phase",
    description:
      "Shifts through color channel phases (RGBA steps) during the transition for a chromatic prism effect.",
    category: "fade",
    defaultParams: {
      fromStep: [0, 0.2, 0.4, 0],
      toStep: [0.6, 0.8, 1, 1],
    },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "luma",
    name: "Luma Matte",
    description:
      "Uses a custom luminance matte image to control the reveal pattern, allowing fully custom shaped transitions.",
    category: "fade",
    defaultParams: { luma: null },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "luminance_melt",
    name: "Luminance Melt",
    description:
      "Melts the scene by luminance value — brighter areas transition first, creating a gradient melt-away effect.",
    category: "fade",
    defaultParams: { direction: true, l_threshold: 0.8, above: false },
    supportedProviders: ["engine-pixi"],
  },

  // ─── Wipe ──────────────────────────────────────────────────────────────────
  {
    key: "wipeDown",
    name: "Wipe Down",
    description: "Reveals the next scene with a clean horizontal line sweeping downward.",
    category: "wipe",
    defaultParams: {},
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "wipeUp",
    name: "Wipe Up",
    description: "Reveals the next scene with a clean horizontal line sweeping upward.",
    category: "wipe",
    defaultParams: {},
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "wipeLeft",
    name: "Wipe Left",
    description: "Reveals the next scene with a clean vertical line sweeping from right to left.",
    category: "wipe",
    defaultParams: {},
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "wipeRight",
    name: "Wipe Right",
    description: "Reveals the next scene with a clean vertical line sweeping from left to right.",
    category: "wipe",
    defaultParams: {},
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "directionalwipe",
    name: "Directional Wipe",
    description: "A smooth diagonal wipe where direction and smoothness are fully configurable.",
    category: "wipe",
    defaultParams: { direction: [1, -1], smoothness: 0.5 },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "windowblinds",
    name: "Window Blinds",
    description:
      "Simulates horizontal window blinds closing over the outgoing scene before revealing the next.",
    category: "wipe",
    defaultParams: {},
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "windowslice",
    name: "Window Slice",
    description:
      "Slices the screen into vertical strips that each independently slide away, like venetian blinds on their side.",
    category: "wipe",
    defaultParams: { count: 10, smoothness: 0.5 },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "squareswire",
    name: "Squares Wire",
    description:
      "A grid of squares that animate in a diagonal wave pattern, sweeping across the screen.",
    category: "wipe",
    defaultParams: { squares: [10, 10], direction: [1, -0.5], smoothness: 1.6 },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "wind",
    name: "Wind",
    description: "A subtle wind-like horizontal streak effect that blows the outgoing scene away.",
    category: "wipe",
    defaultParams: { size: 0.2 },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "BowTieHorizontal",
    name: "Bow Tie Horizontal",
    description:
      "Two bow-tie shapes expand horizontally from the center, revealing the next scene.",
    category: "wipe",
    defaultParams: {},
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "BowTieVertical",
    name: "Bow Tie Vertical",
    description: "Two bow-tie shapes expand vertically from the center, revealing the next scene.",
    category: "wipe",
    defaultParams: {},
    supportedProviders: ["engine-pixi"],
  },

  // ─── Slide ─────────────────────────────────────────────────────────────────
  {
    key: "Directional",
    name: "Directional Slide",
    description:
      "The incoming clip slides in from a configurable direction while the outgoing clip slides out.",
    category: "slide",
    defaultParams: { direction: [0, 1] },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "directionalwarp",
    name: "Directional Warp",
    description:
      "Slides with a warping distortion in the direction of movement, adding flow and energy.",
    category: "slide",
    defaultParams: { direction: [-1, 1] },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "Mosaic",
    name: "Mosaic Slide",
    description:
      "A diagonal mosaic scroll that moves the outgoing scene off-screen while bringing in the new one.",
    category: "slide",
    defaultParams: { endx: 2, endy: -1 },
    supportedProviders: ["engine-pixi"],
  },

  // ─── Zoom ──────────────────────────────────────────────────────────────────
  {
    key: "SimpleZoom",
    name: "Simple Zoom",
    description:
      "A fast zoom-in/zoom-out transition — zooms into the outgoing clip then zooms out on the incoming clip.",
    category: "zoom",
    defaultParams: { zoom_quickness: 0.8 },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "DreamyZoom",
    name: "Dreamy Zoom",
    description:
      "A dreamy zoom that rotates and scales the scene smoothly, creating a soft cinematic blur-zoom feel.",
    category: "zoom",
    defaultParams: { rotation: 6, scale: 1.2 },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "CrossZoom",
    name: "Cross Zoom",
    description:
      "A zoom-through transition where both clips appear to rush through each other with radial motion blur.",
    category: "zoom",
    defaultParams: { strength: 0.4 },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "ZoomInCircles",
    name: "Zoom In Circles",
    description:
      "Zooms concentrically inward in expanding circular rings to reveal the next scene.",
    category: "zoom",
    defaultParams: {},
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "rotate_scale_fade",
    name: "Rotate Scale Fade",
    description:
      "The outgoing scene rotates and scales down while the incoming scene rotates and scales up.",
    category: "zoom",
    defaultParams: {
      center: [0.5, 0.5],
      rotations: 1,
      scale: 8,
      backColor: [0.15, 0.15, 0.15, 1],
    },
    supportedProviders: ["engine-pixi"],
  },

  // ─── Geometric ─────────────────────────────────────────────────────────────
  {
    key: "circle",
    name: "Circle",
    description:
      "A circle expands from the center to reveal the next scene, like a camera iris opening.",
    category: "geometric",
    defaultParams: { center: [0.5, 0.5], backColor: [0.1, 0.1, 0.1] },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "circleopen",
    name: "Circle Open",
    description:
      "A circular mask opens or closes to transition between scenes with configurable smoothness.",
    category: "geometric",
    defaultParams: { smoothness: 0.3, opening: true },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "CircleCrop",
    name: "Circle Crop",
    description:
      "The outgoing scene is cropped into a shrinking circle before the next scene fills the frame.",
    category: "geometric",
    defaultParams: { bgcolor: [0, 0, 0, 1] },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "heart",
    name: "Heart",
    description:
      "A heart-shaped mask expands to reveal the next scene — great for romantic or emotional moments.",
    category: "geometric",
    defaultParams: {},
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "angular",
    name: "Angular",
    description: "A rotating angular wipe that sweeps around from a configurable starting angle.",
    category: "geometric",
    defaultParams: { startingAngle: 90 },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "Radial",
    name: "Radial Wipe",
    description: "A radial sweep (like a clock hand) that wipes the scene from 0 to 360 degrees.",
    category: "geometric",
    defaultParams: { smoothness: 1 },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "radialSwipe",
    name: "Radial Swipe",
    description:
      "A custom radial swipe transition that rotates the new scene in from behind like turning a page.",
    category: "geometric",
    defaultParams: {},
    supportedProviders: ["engine-pixi"],
    isCustom: true,
  },
  {
    key: "polar_function",
    name: "Polar Function",
    description: "Uses a polar mathematical function to create a petal/star shaped wipe pattern.",
    category: "geometric",
    defaultParams: { segments: 5 },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "cannabisleaf",
    name: "Cannabis Leaf",
    description:
      "A cannabis leaf silhouette morphs to reveal the next scene — quirky and unconventional.",
    category: "geometric",
    defaultParams: {},
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "crosshatch",
    name: "Crosshatch",
    description:
      "A crosshatching pattern burns through the outgoing scene from the center, revealing the next.",
    category: "geometric",
    defaultParams: { center: [0.5, 0.5], threshold: 3, fadeEdge: 0.1 },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "hexagonalize",
    name: "Hexagonalize",
    description:
      "Breaks the scene into a hexagonal grid pattern that progressively transitions to the next scene.",
    category: "geometric",
    defaultParams: { steps: 50, horizontalHexagons: 20 },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "GridFlip",
    name: "Grid Flip",
    description:
      "Divides the screen into a grid of tiles that each individually flip to reveal the next scene.",
    category: "geometric",
    defaultParams: {
      size: [4, 4],
      pause: 0.1,
      dividerWidth: 0.05,
      bgcolor: [0, 0, 0, 1],
      randomness: 0.1,
    },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "PolkaDotsCurtain",
    name: "Polka Dots Curtain",
    description:
      "Polka dots expand from a corner, like a curtain of growing circles that sweep the scene.",
    category: "geometric",
    defaultParams: { dots: 20, center: [0, 0] },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "pinwheel",
    name: "Pinwheel",
    description:
      "A spinning pinwheel that rotates to sweep the scene away, revealing the next one.",
    category: "geometric",
    defaultParams: { speed: 2 },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "StereoViewer",
    name: "Stereo Viewer",
    description:
      "Simulates a stereoscopic slide viewer clicking to the next slide, with rounded corner cards zooming in.",
    category: "geometric",
    defaultParams: { zoom: 0.88, corner_radius: 0.22 },
    supportedProviders: ["engine-pixi"],
  },

  // ─── Blur ──────────────────────────────────────────────────────────────────
  {
    key: "LinearBlur",
    name: "Linear Blur",
    description:
      "Blurs the transition linearly — the outgoing scene blurs out while the incoming scene blurs in.",
    category: "blur",
    defaultParams: { intensity: 0.1 },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "Dreamy",
    name: "Dreamy",
    description:
      "A dreamy wavy blur that distorts both clips with soft ripple blur during the transition.",
    category: "blur",
    defaultParams: {},
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "morph",
    name: "Morph",
    description:
      "Smoothly morphs between scenes using pixel displacement — great for natural, fluid transitions.",
    category: "blur",
    defaultParams: { strength: 0.1 },
    supportedProviders: ["engine-pixi"],
  },

  // ─── Distort ───────────────────────────────────────────────────────────────
  {
    key: "Swirl",
    name: "Swirl",
    description:
      "A swirling vortex spins the outgoing scene away into the center while bringing in the next.",
    category: "distort",
    defaultParams: {},
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "WaterDrop",
    name: "Water Drop",
    description:
      "Ripple waves emanate from the center as if a water drop hit the screen, revealing the next scene.",
    category: "distort",
    defaultParams: { amplitude: 30, speed: 30 },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "ripple",
    name: "Ripple",
    description:
      "Full-screen ripple waves (like a reflection in water) distort the scene during the blend.",
    category: "distort",
    defaultParams: { amplitude: 100, speed: 50 },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "ButterflyWaveScrawler",
    name: "Butterfly Wave",
    description:
      "A butterfly-wing shaped wave pattern that crawls across the scene with color separation.",
    category: "distort",
    defaultParams: { amplitude: 1, waves: 30, colorSeparation: 0.3 },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "CrazyParametricFun",
    name: "Crazy Parametric",
    description:
      "A wild parametric math-based warping pattern — unpredictable and highly energetic.",
    category: "distort",
    defaultParams: { a: 4, b: 1, amplitude: 120, smoothness: 0.1 },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "crosswarp",
    name: "Cross Warp",
    description:
      "Both scenes warp toward and away from each other simultaneously, creating a vortex pull effect.",
    category: "distort",
    defaultParams: {},
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "flyeye",
    name: "Fly Eye",
    description:
      "A compound fly-eye lens pattern fractures the scene into many small circular lenses.",
    category: "distort",
    defaultParams: { size: 0.04, zoom: 50, colorSeparation: 0.3 },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "kaleidoscope",
    name: "Kaleidoscope",
    description:
      "A rotating kaleidoscope mirror effect that fractures and spins the scene during transition.",
    category: "distort",
    defaultParams: { speed: 1, angle: 1, power: 1.5 },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "perlin",
    name: "Perlin Noise",
    description:
      "Uses Perlin noise to organically dissolve the scene in flowing, cloud-like patches.",
    category: "distort",
    defaultParams: { scale: 4, smoothness: 0.01, seed: 12.9898 },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "randomsquares",
    name: "Random Squares",
    description:
      "A grid of squares that randomly disappear to reveal the next scene, like tiles falling away.",
    category: "distort",
    defaultParams: { size: [10, 10], smoothness: 0.5 },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "pixelize",
    name: "Pixelize",
    description:
      "Pixelates the outgoing scene into large blocks that progressively shrink into the new scene.",
    category: "distort",
    defaultParams: { squaresMin: [20, 20], steps: 50 },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "displacement",
    name: "Displacement Map",
    description:
      "Uses a custom displacement map texture to warp the scene during transition. Fully configurable shape.",
    category: "distort",
    defaultParams: { displacementMap: null, strength: 0.5 },
    supportedProviders: ["engine-pixi"],
  },

  // ─── Stylized ──────────────────────────────────────────────────────────────
  {
    key: "Bounce",
    name: "Bounce",
    description:
      "The outgoing scene drops away with a bouncing shadow below it, like a stage trapdoor dropping.",
    category: "stylized",
    defaultParams: {
      shadow_colour: [0, 0, 0, 0.6],
      shadow_height: 0.075,
      bounces: 3,
    },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "ColourDistance",
    name: "Colour Distance",
    description:
      "Transitions pixels based on color difference between the two scenes — creates an organic chemical reaction look.",
    category: "stylized",
    defaultParams: { power: 5 },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "cube",
    name: "3D Cube",
    description:
      "A 3D cube rotation transition where the scenes are mapped to cube faces that rotate into view.",
    category: "stylized",
    defaultParams: { persp: 0.7, unzoom: 0.3, reflection: 0.4, floating: 3 },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "doorway",
    name: "Doorway",
    description:
      "Opens like double doors — the outgoing scene splits and swings open to reveal the next scene behind it.",
    category: "stylized",
    defaultParams: { reflection: 0.4, perspective: 0.4, depth: 3 },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "swap",
    name: "Swap",
    description:
      "The outgoing and incoming scenes swap positions using a perspective flip, like swapping two cards.",
    category: "stylized",
    defaultParams: { reflection: 0.4, perspective: 0.2, depth: 3 },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "InvertedPageCurl",
    name: "Inverted Page Curl",
    description:
      "Simulates a page being curled back from the corner, like turning a page in a book.",
    category: "stylized",
    defaultParams: {},
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "DoomScreenTransition",
    name: "Doom",
    description:
      "The classic Doom screen melt — the outgoing screen melts downward in jagged vertical strips.",
    category: "stylized",
    defaultParams: {
      bars: 30,
      amplitude: 2,
      noise: 0.1,
      frequency: 0.5,
      dripScale: 0.5,
    },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "squeeze",
    name: "Squeeze",
    description:
      "The scene squeezes horizontally with a chromatic color separation artifact during the blend.",
    category: "stylized",
    defaultParams: { colorSeparation: 0.04 },
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "undulatingBurnOut",
    name: "Undulating Burn Out",
    description:
      "The outgoing scene burns away in an undulating wave pattern from the center outward.",
    category: "stylized",
    defaultParams: {
      smoothness: 0.03,
      center: [0.5, 0.5],
      color: [0, 0, 0],
    },
    supportedProviders: ["engine-pixi"],
  },

  // ─── Glitch ────────────────────────────────────────────────────────────────
  {
    key: "GlitchDisplace",
    name: "Glitch Displace",
    description:
      "A digital glitch effect that displaces pixel rows horizontally, like a VHS tracking error.",
    category: "glitch",
    defaultParams: {},
    supportedProviders: ["engine-pixi"],
  },
  {
    key: "GlitchMemories",
    name: "Glitch Memories",
    description:
      "A nostalgic glitch effect with chromatic aberration and random block corruption artifacts.",
    category: "glitch",
    defaultParams: {},
    supportedProviders: ["engine-pixi"],
  },
];

/**
 * Lookup a transition definition by its key.
 */
export function getTransitionByKey(key: string): ITransitionDefinition | undefined {
  return TRANSITION_CATALOG.find((t) => t.key === key);
}

/**
 * Get all transitions for a given provider.
 */
export function getTransitionsForProvider(provider: string): ITransitionDefinition[] {
  return TRANSITION_CATALOG.filter((t) => t.supportedProviders.includes(provider));
}

/**
 * Get all transitions by category.
 */
export function getTransitionsByCategory(category: TransitionCategory): ITransitionDefinition[] {
  return TRANSITION_CATALOG.filter((t) => t.category === category);
}

/**
 * Register a custom transition at runtime (e.g. from a third-party plugin).
 * If a transition with the same key already exists, it will be overwritten.
 */
export function registerTransition(definition: ITransitionDefinition): void {
  const existingIndex = TRANSITION_CATALOG.findIndex((t) => t.key === definition.key);
  if (existingIndex >= 0) {
    TRANSITION_CATALOG[existingIndex] = { ...definition, isCustom: true };
  } else {
    TRANSITION_CATALOG.push({ ...definition, isCustom: true });
  }
}

/**
 * Utility: returns a compact summary suitable for AI context injection.
 * Groups by category with key + description per entry.
 */
export function getTransitionCatalogSummary(): string {
  const grouped: Record<string, ITransitionDefinition[]> = {};
  for (const t of TRANSITION_CATALOG) {
    if (!grouped[t.category]) grouped[t.category] = [];
    grouped[t.category].push(t);
  }

  return Object.entries(grouped)
    .map(([category, transitions]) => {
      const lines = transitions.map((t) => `  - ${t.key} ("${t.name}"): ${t.description}`);
      return `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n${lines.join("\n")}`;
    })
    .join("\n\n");
}
