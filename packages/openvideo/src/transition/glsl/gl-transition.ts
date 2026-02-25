//@ts-ignore
import glTransitions from "gl-transitions";
import { RADIAL_SWIPE_FRAGMENT } from "./custom-glsl";

export interface GlTransition {
  label: string;
  fragment: string;
  uniforms?: Record<string, { value: any; type: string }>;
  previewDynamic?: string;
  previewStatic?: string;
}

// Custom transitions that override or extend the library
const STATIC_CUSTOM_TRANSITIONS = {
  radialSwipe: {
    label: "Radial Swipe",
    fragment: RADIAL_SWIPE_FRAGMENT,
  },
} as const satisfies Record<string, GlTransition>;

// Registry for runtime custom transitions
const REGISTERED_TRANSITIONS: Record<string, GlTransition> = {};

/**
 * Register a custom transition at runtime
 */
export function registerCustomTransition(
  name: string,
  transition: GlTransition,
) {
  REGISTERED_TRANSITIONS[name] = transition;
}

/**
 * Unregister a custom transition at runtime
 */
export function unregisterCustomTransition(name: string) {
  delete REGISTERED_TRANSITIONS[name];
}

/**
 * Get all available transitions, including library, static custom, and runtime registered ones
 */
export function getAllTransitions(): Record<string, GlTransition> {
  return {
    ...glTransitions.reduce((acc: Record<string, any>, t: any) => {
      acc[t.name] = {
        label: t.name,
        fragment: t.glsl,
        uniforms: t.defaultParams,
        previewDynamic: "",
      };
      return acc;
    }, {}),
    ...STATIC_CUSTOM_TRANSITIONS,
    ...REGISTERED_TRANSITIONS,
  };
}

// Keep GL_TRANSITIONS for backward compatibility, but it will only contain initial ones
export const GL_TRANSITIONS = getAllTransitions();

export type TransitionKey = string;

export function getTransitionOptions() {
  const registeredKeys = Object.keys(REGISTERED_TRANSITIONS);
  return Object.entries(getAllTransitions()).map(([key, value]) => ({
    key: key as TransitionKey,
    label: value.label,
    isCustom: registeredKeys.includes(key),
    previewStatic:
      value.previewStatic ||
      `https://cdn.subgen.co/previews/static/transition_${key}_static.webp`,
    previewDynamic:
      value.previewDynamic ||
      `https://cdn.subgen.co/previews/dynamic/transition_${key}_dynamic.webp`,
  }));
}

// Keep GL_TRANSITION_OPTIONS for backward compatibility
export const GL_TRANSITION_OPTIONS = getTransitionOptions();
