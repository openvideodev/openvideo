export type AnimationType =
  | "slideIn"
  | "slideOut"
  | "fadeIn"
  | "fadeOut"
  | "scaleIn"
  | "scaleOut"
  | "wipeIn"
  | "wipeOut";

export type EasingType =
  | "linear"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | "bounceIn"
  | "bounceOut";

export interface IAnimation {
  id: string;
  type: AnimationType;
  duration: number; // ms - relative to clip start (or end for out animations)
  delay: number; // ms
  easing: EasingType;

  // Generic properties
  params: {
    direction?: "left" | "right" | "top" | "bottom";
    // distance: 0-1 (percentage of dimension) or > 1 for pixels.
    // Usually convenient to treat < 1 as percentage.
    distance?: number;
    // For scale, target scale start/end
    zoomScale?: number;
    // For wipe, maybe angle
    angle?: number;
  };

  // Text specific configuration
  scope?: "element" | "letters" | "words" | "lines";
  textParams?: {
    order?: "forward" | "backward" | "random";
    // Overlap between items (letters/words). 0 = no overlap (sequential), 1 = all at once.
    // Or maybe delay per item? Overlap is often easier to reason about for "smooth waves".
    overlap?: number;
  };
}
