"use client";

/**
 * Property Registry
 *
 * Defines which properties are available for each clip type.
 * The unified PropertiesPanel uses this to render the correct
 * set of properties based on clip.type
 */

export type PropertyKey =
  // Common visual properties
  | "transform"
  | "rotation"
  | "flip"
  | "opacity"
  | "fill"
  | "stroke"
  | "shadow"
  | "cornerRadius"
  | "chromaKey"
  | "animations"
  // Text specific
  | "text"
  | "font"
  | "textStyle"
  | "textAlignment"
  | "textSpacing"
  | "textBlur"
  // Caption specific
  | "captionStyle"
  | "captionColors"
  | "captionPosition"
  | "captionWordsPerLine"
  | "captionLayout"
  // Audio specific
  | "volume"
  | "fade"
  | "aiTools"
  // Effect specific
  | "effectConfig"
  // Transition specific
  | "transitionDuration"
  | "transitionSelector"
  // Grouping
  | "visualGroup" // visual properties grouped together
  | "audioGroup" // audio properties grouped together
  | "textGroup" // text properties grouped together
  | "captionGroup"; // caption properties grouped together

// Property configuration for each clip type
export const PROPERTY_REGISTRY: Record<string, PropertyKey[]> = {
  // Image clip properties
  Image: [
    "transform",
    "rotation",
    "flip",
    "opacity",
    "stroke",
    "shadow",
    "cornerRadius",
    "chromaKey",
    "animations",
  ],

  // Video clip properties (includes audio)
  Video: [
    "transform",
    "rotation",
    "flip",
    "opacity",
    "stroke",
    "shadow",
    "cornerRadius",
    "chromaKey",
    "animations",
    "volume",
    "fade",
    "aiTools",
  ],

  // Text clip properties - grouped for unified UI
  Text: ["transform", "textGroup", "rotation", "opacity", "stroke", "shadow", "animations"],

  // Caption clip properties - grouped for unified UI
  Caption: [
    "transform",
    "captionColors",
    "captionPosition",
    "captionWordsPerLine",
    "textGroup",

    "opacity",
    "animations",
  ],

  // Audio clip properties
  Audio: ["volume", "fade", "aiTools"],

  // Effect clip properties
  Effect: ["effectConfig"],

  // Transition clip properties
  Transition: ["transitionDuration"],

  // Shape clip properties
  Shape: [
    "transform",
    "rotation",
    "opacity",
    "fill",
    "stroke",
    "shadow",
    "cornerRadius",
    "animations",
  ],
};

// Property labels for UI display
export const PROPERTY_LABELS: Record<PropertyKey, string> = {
  transform: "Transform",
  rotation: "Rotation",
  flip: "Flip",
  opacity: "Opacity",
  fill: "Fill",
  stroke: "Stroke",
  shadow: "Shadow",
  cornerRadius: "Corner Radius",
  chromaKey: "Chroma Key",
  animations: "Animations",
  text: "Content",
  font: "Font",
  textStyle: "Style",
  textAlignment: "Alignment",
  textSpacing: "Spacing",
  textBlur: "Blur",
  captionStyle: "Style",
  captionColors: "Colors",
  captionPosition: "Position",
  captionWordsPerLine: "Words Per Line",
  captionLayout: "Layout",
  volume: "Volume",
  fade: "Fade",
  aiTools: "AI Tools",
  effectConfig: "Configuration",
  transitionDuration: "Duration",
  transitionSelector: "Transition",
  visualGroup: "Visual",
  audioGroup: "Audio",
  textGroup: "Text",
  captionGroup: "Caption",
};

// Helper to check if a clip type supports a property
export function supportsProperty(clipType: string, property: PropertyKey): boolean {
  return PROPERTY_REGISTRY[clipType]?.includes(property) ?? false;
}

// Helper to get all properties for a clip type
export function getPropertiesForType(clipType: string): PropertyKey[] {
  return PROPERTY_REGISTRY[clipType] ?? [];
}
