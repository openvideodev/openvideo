export const CUSTOM_TRANSITIONS = [
  {
    key: "circleSpread",
    label: "Circle Spread",
    previewStatic: "",
    previewDynamic: "",
    fragment: `
const float PI = 3.141592653589;

vec4 transition(vec2 p) {
  vec2 center = vec2(0.5, 0.5);
  float dist = distance(p, center);
  float maxRadius = 0.8;
  float radius = progress * maxRadius;
  float mix_factor = smoothstep(radius - 0.1, radius, dist);
  return mix(getToColor(p), getFromColor(p), mix_factor);
}
    `,
  },

  {
    key: "zoomIn",
    label: "Zoom In",
    previewStatic: "",
    previewDynamic: "",
    fragment: `
vec4 transition(vec2 p) {
  vec2 center = vec2(0.5);
  vec2 zoomed = (p - center) * (1.0 - progress) + center;

  return mix(
    getFromColor(p),
    getToColor(zoomed),
    progress
  );
}
    `,
  },

  {
    key: "ripple",
    label: "Ripple",
    previewStatic: "",
    previewDynamic: "",
    fragment: `
const float PI = 3.141592653589;

vec4 transition(vec2 p) {
  vec2 center = vec2(0.5);
  float dist = distance(p, center);
  float wave = sin(dist * 40.0 - progress * 15.0) * 0.02;

  vec2 distorted = p + normalize(p - center) * wave;

  return mix(
    getFromColor(distorted),
    getToColor(p),
    progress
  );
}
    `,
  },

  {
    key: "glitch",
    label: "Glitch",
    previewStatic: "",
    previewDynamic: "",
    fragment: `
float random(vec2 co){
  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

vec4 transition(vec2 p) {
  float noise = random(vec2(progress, p.y));
  float offset = step(0.8, noise) * 0.05 * (1.0 - progress);

  vec2 glitchP = vec2(p.x + offset, p.y);

  return mix(
    getFromColor(glitchP),
    getToColor(p),
    progress
  );
}
    `,
  },
];
