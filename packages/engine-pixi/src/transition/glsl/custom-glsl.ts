export const RADIAL_SWIPE_FRAGMENT = `
const float PI = 3.141592653589;

vec4 transition(vec2 p) {
  vec2 rp = p * 2.0 - 1.0;
  float angle = atan(rp.y, rp.x);
  float threshold = (progress - 0.5) * PI * 2.5;
  float mix_factor = smoothstep(0.0, 0.1, angle - threshold);
  return mix(getToColor(p), getFromColor(p), mix_factor);
}
`;

/**
 * GridFlip transition configuration
 * Custom fragment shader and uniforms for GridFlip transition
 */

export const GRIDFLIP_FRAGMENT = `
uniform vec2 gridSize;
uniform float pause;
uniform float dividerWidth;
uniform vec4 bgColor;
uniform float randomness;

float rand(vec2 co) { 
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

float getDelta(vec2 p) { 
  vec2 rectanglePos = floor(gridSize * p); 
  vec2 rectangleSize = vec2(1.0 / gridSize.x, 1.0 / gridSize.y); 
  float top = rectangleSize.y * (rectanglePos.y + 1.0); 
  float bottom = rectangleSize.y * rectanglePos.y; 
  float left = rectangleSize.x * rectanglePos.x; 
  float right = rectangleSize.x * (rectanglePos.x + 1.0); 
  float minX = min(abs(p.x - left), abs(p.x - right)); 
  float minY = min(abs(p.y - top), abs(p.y - bottom)); 
  return min(minX, minY);
}

float getDividerSize() { 
  vec2 rectangleSize = vec2(1.0 / gridSize.x, 1.0 / gridSize.y); 
  return min(rectangleSize.x, rectangleSize.y) * dividerWidth;
}

vec4 transition(vec2 p) { 
  if (progress < pause) { 
    float currentProg = progress / pause; 
    float a = 1.0; 
    if (getDelta(p) < getDividerSize()) { 
      a = 1.0 - currentProg; 
    } 
    return mix(bgColor, getFromColor(p), a); 
  } 

  if (progress < 1.0 - pause) { 
    if (getDelta(p) < getDividerSize()) { 
      return bgColor; 
    } 

    float currentProg = (progress - pause) / (1.0 - pause * 2.0); 
    vec2 rectanglePos = floor(gridSize * p); 
    float r = rand(rectanglePos) - randomness; 
    float cp = smoothstep(0.0, 1.0 - r, currentProg); 
    float rectangleSize = 1.0 / gridSize.x; 
    float delta = rectanglePos.x * rectangleSize; 
    float offset = rectangleSize * 0.5 + delta; 

    vec2 warped = p; 
    warped.x = (warped.x - offset) / max(abs(cp - 0.5), 0.001) * 0.5 + offset; 

    float s = step(abs(gridSize.x * (p.x - delta) - 0.5), abs(cp - 0.5)); 
    vec4 mixColor = mix(getToColor(warped), getFromColor(warped), step(cp, 0.5)); 
    return mix(bgColor, mixColor, s); 
  } 

  float currentProg = (progress - 1.0 + pause) / pause; 
  float a = 1.0; 
  if (getDelta(p) < getDividerSize()) { 
    a = currentProg; 
  } 
  return mix(bgColor, getToColor(p), a);
}
`;

export const GRIDFLIP_UNIFORMS: Record<string, { value: any; type: string }> = {
  gridSize: { value: [4, 4], type: 'vec2<f32>' },
  pause: { value: 0.1, type: 'f32' },
  dividerWidth: { value: 0.05, type: 'f32' },
  bgColor: { value: [0, 0, 0, 1], type: 'vec4<f32>' },
  randomness: { value: 0.1, type: 'f32' },
};

/**
 * Circle transition configuration
 * Custom fragment shader and uniforms for Circle transition
 */

export const CIRCLE_FRAGMENT = `
uniform vec3 backColor;

vec4 transition(vec2 uv) { 
  float distance = length(uv - center); 
  float radius = sqrt(8.0) * abs(progress - 0.5); 

  if (distance > radius) { 
    return vec4(backColor, 1.0); 
  } else { 
    if (progress < 0.5) return getFromColor(uv); 
    else return getToColor(uv); 
  }
}
`;

/**
 * Directional transition configuration
 * Custom fragment shader and uniforms for Directional transition
 */

export const DIRECTIONAL_FRAGMENT = `
uniform vec2 direction;

vec4 transition(vec2 uv) { 
  vec2 p = uv + progress * sign(direction); 
  vec2 f = fract(p); 
  return mix( 
    getToColor(f), 
    getFromColor(f), 
    step(0.0, p.y) * step(p.y, 1.0) * step(0.0, p.x) * step(p.x, 1.0) 
  );
}
`;

export const DIRECTIONAL_UNIFORMS: Record<
  string,
  { value: any; type: string }
> = {
  direction: { value: [0.0, 1.0], type: 'vec2<f32>' },
};

/**
 * UndulatingBurnOut transition configuration
 * Custom fragment shader and uniforms for UndulatingBurnOut transition
 */

export const UNDULATING_BURN_OUT_FRAGMENT = `
uniform float smoothness;
uniform vec3 color;

const float M_PI = 3.14159265358979323846;

float quadraticInOut(float t) { 
  float p = 2.0 * t * t; 
  return t < 0.5 ? p : -p + (4.0 * t) - 1.0;
}

float getGradient(float r, float dist) { 
  float d = r - dist; 
  return mix( 
    smoothstep(-smoothness, 0.0, r - dist * (1.0 + smoothness)), 
    -1.0 - step(0.005, d), 
    step(-0.005, d) * step(d, 0.01) 
  );
}

float getWave(vec2 p){ 
  vec2 _p = p - center; // offset from center 
  float rads = atan(_p.y, _p.x); 
  float degs = degrees(rads) + 180.0; 
  vec2 range = vec2(0.0, M_PI * 30.0); 
  vec2 domain = vec2(0.0, 360.0); 
  float ratio = (M_PI * 30.0) / 360.0; 
  degs = degs * ratio; 
  float x = progress; 
  float magnitude = mix(0.02, 0.09, smoothstep(0.0, 1.0, x)); 
  float offset = mix(40.0, 30.0, smoothstep(0.0, 1.0, x)); 
  float ease_degs = quadraticInOut(sin(degs)); 
  float deg_wave_pos = (ease_degs * magnitude) * sin(x * offset); 
  return x + deg_wave_pos;
}

vec4 transition(vec2 p) { 
  float dist = distance(center, p); 
  float m = getGradient(getWave(p), dist); 
  vec4 cfrom = getFromColor(p); 
  vec4 cto = getToColor(p); 
  return mix(mix(cfrom, cto, m), mix(cfrom, vec4(color, 1.0), 0.75), step(m, -2.0));
}
`;

export const UNDULATING_BURN_OUT_UNIFORMS: Record<
  string,
  { value: any; type: string }
> = {
  smoothness: { value: 0.1, type: 'f32' },
  center: { value: [0.5, 0.5], type: 'vec2<f32>' },
  color: { value: [1.0, 0.5, 0.0], type: 'vec3<f32>' },
};

/**
 * SquaresWire transition configuration
 * Custom fragment shader and uniforms for SquaresWire transition
 */

export const SQUARESWIRE_FRAGMENT = `
uniform ivec2 squares;
uniform vec2 direction;
uniform float smoothness;

vec4 transition (vec2 p) { 
  vec2 v = normalize(direction); 
  v /= abs(v.x)+abs(v.y); 
  float d = v.x * center.x + v.y * center.y; 
  float offset = smoothness; 
  float pr = smoothstep(-offset, 0.0, v.x * p.x + v.y * p.y - (d-0.5+progress*(1.+offset))); 
  vec2 squarep = fract(p*vec2(squares)); 
  vec2 squaremin = vec2(pr/2.0); 
  vec2 squaremax = vec2(1.0 - pr/2.0); 
  float a = (1.0 - step(progress, 0.0)) * step(squaremin.x, squarep.x) * step(squaremin.y, squarep.y) * step(squarep.x, squaremax.x) * step(squarep.y, squaremax.y); 
  return mix(getFromColor(p), getToColor(p), a);
}
`;

export const SQUARESWIRE_UNIFORMS: Record<
  string,
  { value: any; type: string }
> = {
  squares: { value: [10, 10], type: 'vec2<i32>' },
  direction: { value: [1.0, -0.5], type: 'vec2<f32>' },
  smoothness: { value: 1.6, type: 'f32' },
};

/**
 * RotateScaleFade transition configuration
 * Custom fragment shader and uniforms for RotateScaleFade transition
 */

export const ROTATE_SCALE_FADE_FRAGMENT = `
#define PI 3.14159265359

uniform float rotations;
uniform float scale;
uniform vec4 backColor;

vec4 transition (vec2 uv) { 
  vec2 difference = uv - center; 
  vec2 dir = normalize(difference); 
  float dist = length(difference); 

  float angle = 2.0 * PI * rotations * progress; 

  float c = cos(angle); 
  float s = sin(angle); 

  float currentScale = mix(scale, 1.0, 2.0 * abs(progress - 0.5)); 

  vec2 rotatedDir = vec2(dir.x * c - dir.y * s, dir.x * s + dir.y * c); 
  vec2 rotatedUv = center + rotatedDir * dist / currentScale; 

  if (rotatedUv.x < 0.0 || rotatedUv.x > 1.0 || 
      rotatedUv.y < 0.0 || rotatedUv.y > 1.0) 
    return backColor; 

  return mix(getFromColor(rotatedUv), getToColor(rotatedUv), progress);
}
`;

export const ROTATE_SCALE_FADE_UNIFORMS: Record<
  string,
  { value: any; type: string }
> = {
  center: { value: [0.5, 0.5], type: 'vec2<f32>' },
  rotations: { value: 1.0, type: 'f32' },
  scale: { value: 8.0, type: 'f32' },
  backColor: { value: [0.15, 0.15, 0.15, 1.0], type: 'vec4<f32>' },
};

/**
 * RandomSquares transition configuration
 * Custom fragment shader and uniforms for RandomSquares transition
 */

export const RANDOMSQUARES_FRAGMENT = `
uniform ivec2 size;
uniform float smoothness;

float rand (vec2 co) { 
  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

vec4 transition(vec2 p) { 
  float r = rand(floor(vec2(size) * p)); 
  float m = smoothstep(0.0, -smoothness, r - (progress * (1.0 + smoothness))); 
  return mix(getFromColor(p), getToColor(p), m);
}
`;

export const RANDOMSQUARES_UNIFORMS: Record<
  string,
  { value: any; type: string }
> = {
  size: { value: [10, 10], type: 'vec2<i32>' },
  smoothness: { value: 0.5, type: 'f32' },
};

/**
 * PolarFunction transition configuration
 * Custom fragment shader and uniforms for PolarFunction transition
 */

export const POLAR_FUNCTION_FRAGMENT = `
#define PI 3.14159265359

uniform int segments;

vec4 transition (vec2 uv) { 
  float angle = atan(uv.y - 0.5, uv.x - 0.5) - 0.5 * PI; 
  float normalized = (angle + 1.5 * PI) * (2.0 * PI); 

  float radius = (cos(float(segments) * angle) + 4.0) / 4.0; 
  float difference = length(uv - vec2(0.5, 0.5)); 

  if (difference > radius * progress) 
    return getFromColor(uv); 
  else 
    return getToColor(uv);
}
`;

export const POLAR_FUNCTION_UNIFORMS: Record<
  string,
  { value: any; type: string }
> = {
  segments: { value: 5, type: 'i32' },
};

/**
 * Pixelize transition configuration
 * Custom fragment shader and uniforms for Pixelize transition
 */

export const PIXELIZE_FRAGMENT = `
uniform ivec2 squaresMin;
uniform int steps;

vec4 transition(vec2 uv) { 
  float d = min(progress, 1.0 - progress);
  float dist = steps>0 ? ceil(d * float(steps)) / float(steps) : d;
  vec2 squareSize = 2.0 * dist / vec2(squaresMin);
  
  vec2 p = dist>0.0 ? (floor(uv / squareSize) + 0.5) * squareSize : uv; 
  return mix(getFromColor(p), getToColor(p), progress);
}
`;

export const PIXELIZE_UNIFORMS: Record<string, { value: any; type: string }> = {
  squaresMin: { value: [20, 20], type: 'vec2<i32>' },
  steps: { value: 50, type: 'i32' },
};

/**
 * Perlin transition configuration
 * Custom fragment shader and uniforms for Perlin transition
 */

export const PERLIN_FRAGMENT = `
uniform float scale;
uniform float smoothness;
uniform float seed;

// http://byteblacksmith.com/improvements-to-the-canonical-one-liner-glsl-rand-for-opengl-es-2-0/
float random(vec2 co)
{ 
  float a = seed; 
  float b = 78.233; 
  float c = 43758.5453; 
  float dt = dot(co.xy, vec2(a, b)); 
  float sn = mod(dt, 3.14); 
  return fract(sin(sn) * c);
}

// 2D Noise based on Morgan McGuire @morgan3d
// https://www.shadertoy.com/view/4dS3Wd
float noise(vec2 st) { 
  vec2 i = floor(st); 
  vec2 f = fract(st); 

  // Four corners in 2D of a tile 
  float a = random(i); 
  float b = random(i + vec2(1.0, 0.0)); 
  float c = random(i + vec2(0.0, 1.0)); 
  float d = random(i + vec2(1.0, 1.0)); 

  //Smooth Interpolation 

  // Cubic Hermine Curve. Same as SmoothStep() 
  vec2 u = f*f*(3.0-2.0*f); 
  // u = smoothstep(0.,1.,f); 

  // Mix 4 coorners percentages 
  return mix(a, b, u.x) + 
         (c - a)* u.y * (1.0 - u.x) + 
         (d - b) * u.x * u.y;
}

vec4 transition (vec2 uv) { 
  vec4 from = getFromColor(uv); 
  vec4 to = getToColor(uv); 
  float n = noise(uv * scale); 

  float p = mix(-smoothness, 1.0 + smoothness, progress); 
  float lower = p - smoothness; 
  float higher = p + smoothness; 

  float q = smoothstep(lower, higher, n); 

  return mix( 
    from, 
    to, 
    1.0 - q 
  );
}
`;

export const PERLIN_UNIFORMS: Record<string, { value: any; type: string }> = {
  scale: { value: 4.0, type: 'f32' },
  smoothness: { value: 0.01, type: 'f32' },
  seed: { value: 12.9898, type: 'f32' },
};

/**
 * Luma transition configuration
 * Custom fragment shader and uniforms for Luma transition
 * Creates a counter-clockwise spiral effect that fragments the image
 */

export const LUMA_FRAGMENT = `

#define PI 3.14159265358979323846

uniform float spiralTurns;
uniform float spiralWidth;

vec4 transition(vec2 uv) {

    vec2 p = uv - center;

    float r = length(p);
    float angle = atan(p.y, p.x);

    float normalizedAngle = (angle + PI) / (2.0 * PI);

    float spiral = normalizedAngle + r * spiralTurns;
    spiral = fract(spiral);

    float factor = smoothstep(
        progress - spiralWidth,
        progress + spiralWidth,
        spiral
    );
    return mix(
        getToColor(uv),       // ahora aparece primero
        getFromColor(uv),     // aparece después
        factor
    );
}


`;

export const LUMA_UNIFORMS: Record<string, { value: any; type: string }> = {
  spiralTurns: { value: 1.5, type: 'f32' },
  spiralWidth: { value: 0.02, type: 'f32' },
};

/**
 * LuminanceMelt transition configuration
 * Custom fragment shader and uniforms for LuminanceMelt transition
 * Creates a melting effect based on luminance threshold
 */

export const LUMINANCE_MELT_FRAGMENT = `
//direction of movement : 0 : up, 1, down
uniform float direction; // = 1.0 (using float instead of bool for WebGPU)

//luminance threshold
uniform float l_threshold; // = 0.8

//does the movement take effect above or below luminance threshold ?
uniform float above; // = 0.0 (false) (using float instead of bool for WebGPU)

//Random function borrowed from everywhere
float rand(vec2 co){ 
  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

// Simplex noise:
// Description : Array and textureless GLSL 2D simplex noise function.
// Author: Ian McEwan, Ashima Arts.
// Maintainer : ijm
// Lastmod: 20110822 (ijm)
// License: MIT
// 2011 Ashima Arts. All rights reserved.
// Distributed under the MIT License. See LICENSE file.
// https://github.com/ashima/webgl-noise

vec3 mod289(vec3 x) { 
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 mod289(vec2 x) { 
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute(vec3 x) { 
  return mod289(((x*34.0)+1.0)*x);
}

float snoise(vec2 v) 
{ 
  const vec4 C = vec4(0.211324865405187, // (3.0-sqrt(3.0))/6.0 
                      0.366025403784439, // 0.5*(sqrt(3.0)-1.0) 
                      -0.577350269189626, // -1.0 + 2.0 * C.x 
                      0.024390243902439); // 1.0 / 41.0
  // First corner 
  vec2 i = floor(v + dot(v, C.yy) ); 
  vec2 x0 = v - i + dot(i, C.xx);

  // Other corners 
  vec2 i1; 
  //i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0 
  //i1.y = 1.0 - i1.x; 
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0); 
  // x0 = x0 - 0.0 + 0.0 * C.xx ; 
  // x1 = x0 - i1 + 1.0 * C.xx ; 
  // x2 = x0 - 1.0 + 2.0 * C.xx ; 
  vec4 x12 = x0.xyxy + C.xxzz; 
  x12.xy -= i1;

  //Permutations 
  i = mod289(i); // Avoid truncation effects in permutation 
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) 
                    + i.x + vec3(0.0, i1.x, 1.0 )); 

  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0); 
  m = m*m ; 
  m = m*m ;

  // Gradients: 41 points uniformly over a line, mapped onto a diamond.
  // The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287) 

  vec3 x = 2.0 * fract(p * C.www) - 1.0; 
  vec3 h = abs(x) - 0.5; 
  vec3 ox = floor(x + 0.5); 
  vec3 a0 = x - ox;

  // Normalize gradients implicitly by scaling m
  // Approximation of: m *= inversesqrt( a0*a0 + h*h ); 
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

  // Compute final noise value at P 
  vec3 g; 
  g.x = a0.x * x0.x + h.x * x0.y; 
  g.yz = a0.yz * x12.xz + h.yz * x12.yw; 
  return 130.0 * dot(m, g);
}

// Simplex noise -- end

float luminance(vec4 color){ 
  //(0.299*R + 0.587*G + 0.114*B) 
  return color.r*0.299+color.g*0.587+color.b*0.114;
}

vec4 transition(vec2 uv) { 
  vec2 p = uv.xy / vec2(1.0).xy; 
  vec2 center = vec2(1.0, direction);
  
  if (progress == 0.0) { 
    return getFromColor(p); 
  } else if (progress == 1.0) { 
    return getToColor(p); 
  } else { 
    float x = progress; 
    float dist = distance(center, p) - progress*exp(snoise(vec2(p.x, 0.0))); 
    float r = x - rand(vec2(p.x, 0.1)); 
    float m; 
    if(above > 0.5){ 
      m = dist <= r && luminance(getFromColor(p))>l_threshold ? 1.0 : (progress*progress*progress); 
    } 
    else{ 
      m = dist <= r && luminance(getFromColor(p))<l_threshold ? 1.0 : (progress*progress*progress); 
    } 
    return mix(getFromColor(p), getToColor(p), m); 
  }
}
`;

export const LUMINANCE_MELT_UNIFORMS: Record<
  string,
  { value: any; type: string }
> = {
  direction: { value: 1.0, type: 'f32' }, // 0.0 = up, 1.0 = down
  l_threshold: { value: 0.8, type: 'f32' },
  above: { value: 0.0, type: 'f32' }, // 0.0 = false (below threshold), 1.0 = true (above threshold)
};

/**
 * Hexagonalize transition configuration
 * Custom fragment shader and uniforms for Hexagonalize transition
 * Creates a hexagonal pixelation effect
 */

export const HEXAGONALIZE_FRAGMENT = `
uniform int steps; // = 50
uniform float horizontalHexagons; // = 20.0

struct Hexagon { 
  float q; 
  float r; 
  float s;
};

Hexagon createHexagon(float q, float r){ 
  Hexagon hex; 
  hex.q = q; 
  hex.r = r; 
  hex.s = -q - r; 
  return hex;
}

Hexagon roundHexagon(Hexagon hex){ 
  float q = floor(hex.q + 0.5); 
  float r = floor(hex.r + 0.5); 
  float s = floor(hex.s + 0.5); 

  float deltaQ = abs(q - hex.q); 
  float deltaR = abs(r - hex.r); 
  float deltaS = abs(s - hex.s); 

  if (deltaQ > deltaR && deltaQ > deltaS) 
    q = -r - s; 
  else if (deltaR > deltaS) 
    r = -q - s; 
  else 
    s = -q - r; 

  return createHexagon(q, r);
}

Hexagon hexagonFromPoint(vec2 point, float size) { 
  point.y /= ratio; 
  point = (point - 0.5) / size; 

  float q = (sqrt(3.0) / 3.0) * point.x + (-1.0 / 3.0) * point.y; 
  float r = 0.0 * point.x + 2.0/3.0 * point.y; 

  Hexagon hex = createHexagon(q, r); 
  return roundHexagon(hex);
}

vec2 pointFromHexagon(Hexagon hex, float size) { 
  float x = (sqrt(3.0) * hex.q + (sqrt(3.0) / 2.0) * hex.r) * size + 0.5; 
  float y = (0.0 * hex.q + (3.0/2.0) * hex.r) * size + 0.5; 

  return vec2(x, y * ratio);
}

vec4 transition (vec2 uv) { 
  float dist = 2.0 * min(progress, 1.0 - progress); 
  dist = steps > 0 ? ceil(dist * float(steps)) / float(steps) : dist; 

  float size = (sqrt(3.0) / 3.0) * dist / horizontalHexagons; 

  vec2 point = dist > 0.0 ? pointFromHexagon(hexagonFromPoint(uv, size), size) : uv; 

  return mix(getFromColor(point), getToColor(point), progress);
}
`;

export const HEXAGONALIZE_UNIFORMS: Record<
  string,
  { value: any; type: string }
> = {
  steps: { value: 50, type: 'i32' },
  horizontalHexagons: { value: 20.0, type: 'f32' },
};

/**
 * Heart transition configuration
 * Custom fragment shader and uniforms for Heart transition
 * Creates a heart-shaped reveal effect
 */

export const HEART_FRAGMENT = `
float inHeart (vec2 p, vec2 center, float size) { 
  if (size==0.0) return 0.0; 
  vec2 o = (p-center)/(1.6*size); 
  o.y = -o.y;
  float a = o.x*o.x+o.y*o.y-0.3; 
  return step(a*a*a, o.x*o.x*o.y*o.y*o.y);
}

vec4 transition (vec2 uv) { 
  return mix( 
    getFromColor(uv), 
    getToColor(uv), 
    inHeart(uv, vec2(0.5, 0.5), progress) 
  );
}
`;

export const HEART_UNIFORMS: Record<string, { value: any; type: string }> = {
  // No custom uniforms needed, uses progress from basics
};

/**
 * Displacement transition configuration
 * Custom fragment shader and uniforms for Displacement transition
 * Creates a displacement effect using a displacement map
 */

export const DISPLACEMENT_FRAGMENT = `
uniform sampler2D displacementMap;
uniform float strength; // = 0.5

vec4 transition (vec2 uv) { 
  float displacement = texture2D(displacementMap, uv).r * strength; 

  vec2 uvFrom = vec2(uv.x + progress * displacement, uv.y); 
  vec2 uvTo = vec2(uv.x - (1.0 - progress) * displacement, uv.y); 

  return mix( 
    getFromColor(uvFrom), 
    getToColor(uvTo), 
    progress 
  );
}
`;

export const DISPLACEMENT_UNIFORMS: Record<
  string,
  { value: any; type: string }
> = {
  strength: { value: 0.5, type: 'f32' },
};

/**
 * DirectionalWipe transition configuration
 * Custom fragment shader and uniforms for DirectionalWipe transition
 * Creates a directional wipe effect
 */

export const DIRECTIONALWIPE_FRAGMENT = `
uniform vec2 direction; // = vec2(1.0, -1.0)
uniform float smoothness; // = 0.5

// Note: center is already defined as a uniform in the fragment wrapper

vec4 transition (vec2 uv) {
  vec2 v = normalize(direction);
  v /= abs(v.x)+abs(v.y);
  float d = v.x * center.x + v.y * center.y;
  float m = 
    (1.0-step(progress, 0.0)) * // there is something wrong with our formula that makes m not equals 0.0 with progress is 0.0 
    (1.0 - smoothstep(-smoothness, 0.0, v.x * uv.x + v.y * uv.y - (d-0.5+progress*(1.+smoothness)))); 
  return mix(getFromColor(uv), getToColor(uv), m);
}
`;

export const DIRECTIONALWIPE_UNIFORMS: Record<
  string,
  { value: any; type: string }
> = {
  direction: { value: [1.0, -1.0], type: 'vec2<f32>' },
  smoothness: { value: 0.5, type: 'f32' },
};

/**
 * DirectionalWarp transition configuration
 * Custom fragment shader and uniforms for DirectionalWarp transition
 * Creates a directional warp effect
 */

export const DIRECTIONALWARP_FRAGMENT = `
uniform vec2 direction; // = vec2(-1.0, 1.0)

const float smoothness = 0.5;
// Note: center is already defined as a uniform in the fragment wrapper

vec4 transition (vec2 uv) { 
  vec2 v = normalize(direction); 
  v /= abs(v.x) + abs(v.y); 
  float d = v.x * center.x + v.y * center.y; 
  float m = 1.0 - smoothstep(-smoothness, 0.0, v.x * uv.x + v.y * uv.y - (d - 0.5 + progress * (1.0 + smoothness))); 
  return mix(getFromColor((uv - 0.5) * (1.0 - m) + 0.5), getToColor((uv - 0.5) * m + 0.5), m);
}
`;

export const DIRECTIONALWARP_UNIFORMS: Record<
  string,
  { value: any; type: string }
> = {
  direction: { value: [-1.0, 1.0], type: 'vec2<f32>' },
};

/**
 * Crosshatch transition configuration
 * Custom fragment shader and uniforms for Crosshatch transition
 * Creates a crosshatch pattern transition effect
 */

export const CROSSHATCH_FRAGMENT = `
uniform float threshold; // = 3.0
uniform float fadeEdge; // = 0.1

// Note: center is already defined as a uniform in the fragment wrapper

float rand(vec2 co) { 
  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

vec4 transition(vec2 p) { 
  float dist = distance(center, p) / threshold; 
  float r = progress - min(rand(vec2(p.y, 0.0)), rand(vec2(0.0, p.x))); 
  return mix(getFromColor(p), getToColor(p), mix(0.0, mix(step(dist, r), 1.0, smoothstep(1.0-fadeEdge, 1.0, progress)), smoothstep(0.0, fadeEdge, progress)));
}
`;

export const CROSSHATCH_UNIFORMS: Record<string, { value: any; type: string }> =
  {
    threshold: { value: 3.0, type: 'f32' },
    fadeEdge: { value: 0.1, type: 'f32' },
  };

/**
 * CircleOpen transition configuration
 * Custom fragment shader and uniforms for CircleOpen transition
 * Creates a circular opening/closing transition effect
 */

export const CIRCLEOPEN_FRAGMENT = `
uniform float smoothness; // = 0.3
uniform float opening; // = 1.0 (using float instead of bool for WebGPU: 1.0 = true, 0.0 = false)

// Note: center is already defined as a uniform in the fragment wrapper
const float SQRT_2 = 1.414213562373;

vec4 transition (vec2 uv) { 
  float x = opening > 0.5 ? progress : 1.0 - progress; 
  float m = smoothstep(-smoothness, 0.0, SQRT_2*distance(center, uv) - x*(1.0+smoothness)); 
  return mix(getFromColor(uv), getToColor(uv), opening > 0.5 ? 1.0 - m : m);
}
`;

export const CIRCLEOPEN_UNIFORMS: Record<string, { value: any; type: string }> =
  {
    smoothness: { value: 0.3, type: 'f32' },
    opening: { value: 1.0, type: 'f32' }, // 1.0 = true (opening), 0.0 = false (closing)
  };

/**
 * CannabisLeaf transition configuration
 * Custom fragment shader and uniforms for CannabisLeaf transition
 * Creates a cannabis leaf-shaped reveal effect
 */

export const CANNABISLEAF_FRAGMENT = `
vec4 transition (vec2 uv) {
  if(progress == 0.0){
    return getFromColor(uv);
  }
  vec2 leaf_uv = (uv - vec2(0.5))/10.0/pow(progress,3.5);
  leaf_uv.y = -leaf_uv.y;
  leaf_uv.y += 0.35;
  float r = 0.18;
  float o = atan(leaf_uv.y, leaf_uv.x);
  return mix(getFromColor(uv), getToColor(uv), 1.0-step(1.0 - length(leaf_uv)+r*(1.0+sin(o))*(1.0+0.9 * cos(8.0*o))*(1.0+0.1*cos(24.0*o))*(0.9+0.05*cos(200.0*o)), 1.0));
}
`;

export const CANNABISLEAF_UNIFORMS: Record<
  string,
  { value: any; type: string }
> = {
  // No custom uniforms needed
};

/**
 * StereoViewer transition configuration
 * Custom fragment shader and uniforms for StereoViewer transition
 * Creates a stereo viewer effect with rounded corners and cross rotation
 */

export const STEREOVIEWER_FRAGMENT = `
uniform float zoom; // = 0.88
uniform float corner_radius; // = 0.22

const vec4 black = vec4(0.0, 0.0, 0.0, 1.0);
const vec2 c00 = vec2(0.0, 0.0);
const vec2 c01 = vec2(0.0, 1.0);
const vec2 c11 = vec2(1.0, 1.0);
const vec2 c10 = vec2(1.0, 0.0);

bool in_corner(vec2 p, vec2 corner, vec2 radius) { 
  vec2 axis = (c11 - corner) - corner; 
  p = p - (corner + axis * radius); 
  p *= axis / radius; 
  return (p.x > 0.0 && p.y > -1.0) || (p.y > 0.0 && p.x > -1.0) || dot(p, p) < 1.0;
}

bool test_rounded_mask(vec2 p, vec2 corner_size) { 
  return 
    in_corner(p, c00, corner_size) && 
    in_corner(p, c01, corner_size) && 
    in_corner(p, c10, corner_size) && 
    in_corner(p, c11, corner_size);
}

vec4 screen(vec4 a, vec4 b) { 
  return 1.0 - (1.0 - a) * (1.0 - b);
}

vec4 unscreen(vec4 c) { 
  return 1.0 - sqrt(1.0 - c);
}

vec4 sample_with_corners_from(vec2 p, vec2 corner_size) { 
  p = (p - 0.5) / zoom + 0.5; 
  if (!test_rounded_mask(p, corner_size)) { 
    return black; 
  } 
  return unscreen(getFromColor(p));
}

vec4 sample_with_corners_to(vec2 p, vec2 corner_size) { 
  p = (p - 0.5) / zoom + 0.5; 
  if (!test_rounded_mask(p, corner_size)) { 
    return black; 
  } 
  return unscreen(getToColor(p));
}

vec4 simple_sample_with_corners_from(vec2 p, vec2 corner_size, float zoom_amt) { 
  p = (p - 0.5) / (1.0 - zoom_amt + zoom * zoom_amt) + 0.5; 
  if (!test_rounded_mask(p, corner_size)) { 
    return black; 
  } 
  return getFromColor(p);
}

vec4 simple_sample_with_corners_to(vec2 p, vec2 corner_size, float zoom_amt) { 
  p = (p - 0.5) / (1.0 - zoom_amt + zoom * zoom_amt) + 0.5; 
  if (!test_rounded_mask(p, corner_size)) { 
    return black; 
  } 
  return getToColor(p);
}

mat3 rotate2d(float angle, float ratio) { 
  float s = sin(angle); 
  float c = cos(angle); 
  return mat3( 
    c, s, 0.0, 
    -s, c, 0.0, 
    0.0, 0.0, 1.0);
}

mat3 translate2d(float x, float y) { 
  return mat3( 
    1.0, 0.0, 0.0, 
    0.0, 1.0, 0.0, 
    -x, -y, 1.0);
}

mat3 scale2d(float x, float y) { 
  return mat3( 
    x, 0.0, 0.0, 
    0.0, y, 0.0, 
    0.0, 0.0, 1.0);
}

// Split an image and rotate one up and one down along off screen pivot points
vec4 get_cross_rotated(vec3 p3, float angle, vec2 corner_size, float ratio) { 
  angle = angle * angle; // easing 
  angle /= 2.4; // works out to be a good number of radians 

  mat3 center_and_scale = translate2d(-0.5, -0.5) * scale2d(1.0, ratio); 
  mat3 unscale_and_uncenter = scale2d(1.0, 1.0/ratio) * translate2d(0.5, 0.5); 
  mat3 slide_left = translate2d(-2.0, 0.0); 
  mat3 slide_right = translate2d(2.0, 0.0); 
  mat3 rotate = rotate2d(angle, ratio); 

  mat3 op_a = center_and_scale * slide_right * rotate * slide_left * unscale_and_uncenter; 
  mat3 op_b = center_and_scale * slide_left * rotate * slide_right * unscale_and_uncenter; 

  vec4 a = sample_with_corners_from((op_a * p3).xy, corner_size); 
  vec4 b = sample_with_corners_from((op_b * p3).xy, corner_size); 

  return screen(a, b);
}

// Image stays put, but this time moves two masks
vec4 get_cross_masked(vec3 p3, float angle, vec2 corner_size, float ratio) { 
  angle = 1.0 - angle; 
  angle = angle * angle; // easing 
  angle /= 2.4; 

  vec4 img; 

  mat3 center_and_scale = translate2d(-0.5, -0.5) * scale2d(1.0, ratio); 
  mat3 unscale_and_uncenter = scale2d(1.0 / zoom, 1.0 / (zoom * ratio)) * translate2d(0.5, 0.5); 
  mat3 slide_left = translate2d(-2.0, 0.0); 
  mat3 slide_right = translate2d(2.0, 0.0); 
  mat3 rotate = rotate2d(angle, ratio); 

  mat3 op_a = center_and_scale * slide_right * rotate * slide_left * unscale_and_uncenter; 
  mat3 op_b = center_and_scale * slide_left * rotate * slide_right * unscale_and_uncenter; 

  bool mask_a = test_rounded_mask((op_a * p3).xy, corner_size); 
  bool mask_b = test_rounded_mask((op_b * p3).xy, corner_size); 

  if (mask_a || mask_b) { 
    img = sample_with_corners_to(p3.xy, corner_size); 
    return screen(mask_a ? img : black, mask_b ? img : black); 
  } else { 
    return black; 
  }
}

vec4 transition(vec2 uv) { 
  float a; 
  vec2 p = uv.xy / vec2(1.0).xy; 
  vec3 p3 = vec3(p.xy, 1.0); 

  vec2 corner_size = vec2(corner_radius / ratio, corner_radius); 

  if (progress <= 0.0) { 
    return getFromColor(p); 
  } else if (progress < 0.1) { 
    a = progress / 0.1; 
    return simple_sample_with_corners_from(p, corner_size * a, a); 
  } else if (progress < 0.48) { 
    a = (progress - 0.1) / 0.38; 
    return get_cross_rotated(p3, a, corner_size, ratio); 
  } else if (progress < 0.9) { 
    return get_cross_masked(p3, (progress - 0.52) / 0.38, corner_size, ratio); 
  } else if (progress < 1.0) { 
    a = (1.0 - progress) / 0.1; 
    return simple_sample_with_corners_to(p, corner_size * a, a); 
  } else { 
    return getToColor(p); 
  }
}
`;

export const STEREOVIEWER_UNIFORMS: Record<
  string,
  { value: any; type: string }
> = {
  zoom: { value: 0.88, type: 'f32' },
  corner_radius: { value: 0.22, type: 'f32' },
};

/**
 * GlitchDisplace transition configuration
 * Custom fragment shader for GlitchDisplace transition
 */

export const GLITCH_DISPLACE_FRAGMENT = `
float random(vec2 co) { 
  float a = 12.9898; 
  float b = 78.233; 
  float c = 43758.5453; 
  float dt = dot(co.xy, vec2(a, b)); 
  float sn = mod(dt, 3.14); 
  return fract(sin(sn) * c);
}

float voronoi(vec2 x) { 
  vec2 p = floor(x); 
  vec2 f = fract(x); 
  float res = 8.0; 
  for(float j = -1.; j <= 1.; j++) 
    for(float i = -1.; i <= 1.; i++) { 
      vec2 b = vec2(i, j); 
      vec2 r = b - f + random(p + b); 
      float d = dot(r, r); 
      res = min(res, d); 
    } 
  return sqrt(res);
}

vec2 displace(vec4 tex, vec2 texCoord, float dotDepth, float textureDepth, float strength) { 
  float b = voronoi(.003 * texCoord + 2.0); 
  float g = voronoi(0.2 * texCoord); 
  float r = voronoi(texCoord - 1.0); 
  vec4 dt = tex * 1.0; 
  vec4 dis = dt * dotDepth + 1.0 - tex * textureDepth; 

  dis.x = dis.x - 1.0 + textureDepth * dotDepth; 
  dis.y = dis.y - 1.0 + textureDepth * dotDepth; 
  dis.x *= strength; 
  dis.y *= strength; 
  vec2 res_uv = texCoord; 
  res_uv.x = res_uv.x + dis.x - 0.0; 
  res_uv.y = res_uv.y + dis.y; 
  return res_uv;
}

float ease1(float t) { 
  return t == 0.0 || t == 1.0 
    ? t 
    : t < 0.5 
    ? +0.5 * pow(2.0, (20.0 * t) - 10.0) 
    : -0.5 * pow(2.0, 10.0 - (t * 20.0)) + 1.0;
}

float ease2(float t) { 
  return t == 1.0 ? t : 1.0 - pow(2.0, -10.0 * t);
}

vec4 transition(vec2 uv) { 
  vec2 p = uv.xy / vec2(1.0).xy; 
  vec4 color1 = getFromColor(p); 
  vec4 color2 = getToColor(p); 
  vec2 disp = displace(color1, p, 0.33, 0.7, 1.0 - ease1(progress)); 
  vec2 disp2 = displace(color2, p, 0.33, 0.5, ease2(progress)); 
  vec4 dColor1 = getToColor(disp); 
  vec4 dColor2 = getFromColor(disp2); 
  float val = ease1(progress); 
  vec3 gray = vec3(dot(min(dColor2, dColor1).rgb, vec3(0.299, 0.587, 0.114))); 
  dColor2 = vec4(gray, 1.0); 
  dColor2 *= 2.0; 
  color1 = mix(color1, dColor2, smoothstep(0.0, 0.5, progress)); 
  color2 = mix(color2, dColor1, smoothstep(1.0, 0.5, progress)); 
  return mix(color1, color2, val); 
}
`;

/**
 * CrossZoom transition configuration
 * Custom fragment shader and uniforms for CrossZoom transition
 */

export const CROSSZOOM_FRAGMENT = `
uniform float strength; // = 0.4

const float PI = 3.141592653589793;

float Linear_ease(float begin, float change, float duration, float time) { 
  return change * time / duration + begin;
}

float Exponential_easeInOut(float begin, float change, float duration, float time) { 
  if (time == 0.0) 
    return begin; 
  else if (time == duration) 
    return begin + change; 
  time = time / (duration / 2.0); 
  if (time < 1.0) 
    return change / 2.0 * pow(2.0, 10.0 * (time - 1.0)) + begin; 
  return change / 2.0 * (-pow(2.0, -10.0 * (time - 1.0)) + 2.0) + begin;
}

float Sine_easeInOut(float begin, float change, float duration, float time) { 
  return -change / 2.0 * (cos(PI * time / duration) - 1.0) + begin;
}

float rand(vec2 co) { 
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 crossFade(vec2 uv, float dissolve) { 
  return mix(getFromColor(uv).rgb, getToColor(uv).rgb, dissolve);
}

vec4 transition(vec2 uv) { 
  vec2 texCoord = uv.xy / vec2(1.0).xy; 

  // Linear interpolate center across center half of the image 
  vec2 center = vec2(Linear_ease(0.25, 0.5, 1.0, progress), 0.5); 
  float dissolve = Exponential_easeInOut(0.0, 1.0, 1.0, progress); 

  // Mirrored sine loop. 0->strength then strength->0 
  float strengthValue = Sine_easeInOut(0.0, strength, 0.5, progress); 

  vec3 color = vec3(0.0); 
  float total = 0.0; 
  vec2 toCenter = center - texCoord; 

  /* randomize the lookup values to hide the fixed number of samples */ 
  float offset = rand(uv); 

  for (float t = 0.0; t <= 40.0; t++) { 
    float percent = (t + offset) / 40.0; 
    float weight = 4.0 * (percent - percent * percent); 
    color += crossFade(texCoord + toCenter * percent * strengthValue, dissolve) * weight; 
    total += weight; 
  } 
  return vec4(color / total, 1.0);
}
`;

export const CROSSZOOM_UNIFORMS: Record<string, { value: any; type: string }> =
  {
    strength: { value: 0.4, type: 'f32' },
  };

/**
 * CrazyParametricFun transition configuration
 * Custom fragment shader and uniforms for CrazyParametricFun transition
 */

export const CRAZY_PARAMETRIC_FUN_FRAGMENT = `
uniform float a; // = 4
uniform float b; // = 1
uniform float amplitude; // = 120
uniform float smoothness; // = 0.1

vec4 transition(vec2 uv) { 
  vec2 p = uv.xy / vec2(1.0).xy; 
  vec2 dir = p - vec2(.5); 
  float dist = length(dir); 
  float x = (a - b) * cos(progress) + b * cos(progress * ((a / b) - 1.)); 
  float y = (a - b) * sin(progress) - b * sin(progress * ((a / b) - 1.)); 
  vec2 offset = dir * vec2(sin(progress * dist * amplitude * x), sin(progress * dist * amplitude * y)) / smoothness; 
  return mix(getFromColor(p + offset), getToColor(p), smoothstep(0.2, 1.0, progress));
}
`;

export const CRAZY_PARAMETRIC_FUN_UNIFORMS: Record<
  string,
  { value: any; type: string }
> = {
  a: { value: 4.0, type: 'f32' },
  b: { value: 1.0, type: 'f32' },
  amplitude: { value: 120.0, type: 'f32' },
  smoothness: { value: 0.1, type: 'f32' },
};

/**
 * ColourDistance transition configuration
 * Custom fragment shader and uniforms for ColourDistance transition
 */

export const COLOUR_DISTANCE_FRAGMENT = `
uniform float power; // = 5.0

vec4 transition(vec2 p) { 
  vec4 fTex = getFromColor(p); 
  vec4 tTex = getToColor(p); 
  float m = step(distance(fTex, tTex), progress); 
  return mix( 
    mix(fTex, tTex, m), 
    tTex, 
    pow(progress, power) 
  );
}
`;

export const COLOUR_DISTANCE_UNIFORMS: Record<
  string,
  { value: any; type: string }
> = {
  power: { value: 5.0, type: 'f32' },
};

export const BOW_TIE_HORIZONTAL_FRAGMENT = `
// License: MIT

vec2 bottom_left = vec2(0.0, 1.0);
vec2 bottom_right = vec2(1.0, 1.0);
vec2 top_left = vec2(0.0, 0.0);
vec2 top_right = vec2(1.0, 0.0);

float check(vec2 p1, vec2 p2, vec2 p3)
{
  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
}

bool PointInTriangle (vec2 pt, vec2 p1, vec2 p2, vec2 p3)
{
    bool b1, b2, b3;
    b1 = check(pt, p1, p2) < 0.0;
    b2 = check(pt, p2, p3) < 0.0;
    b3 = check(pt, p3, p1) < 0.0;
    return ((b1 == b2) && (b2 == b3));
}

bool in_left_triangle(vec2 p){
  vec2 vertex1, vertex2, vertex3;
  vertex1 = vec2(progress, 0.5);
  vertex2 = vec2(0.0, 0.5-progress);
  vertex3 = vec2(0.0, 0.5+progress);
  if (PointInTriangle(p, vertex1, vertex2, vertex3))
  {
    return true;
  }
  return false;
}

bool in_right_triangle(vec2 p){
  vec2 vertex1, vertex2, vertex3;
  vertex1 = vec2(1.0-progress, 0.5);
  vertex2 = vec2(1.0, 0.5-progress);
  vertex3 = vec2(1.0, 0.5+progress);
  if (PointInTriangle(p, vertex1, vertex2, vertex3))
  {
    return true;
  }
  return false;
}

float blur_edge(vec2 bot1, vec2 bot2, vec2 top, vec2 testPt)
{
  vec2 lineDir = bot1 - top;
  vec2 perpDir = vec2(lineDir.y, -lineDir.x);
  vec2 dirToPt1 = bot1 - testPt;
  float dist1 = abs(dot(normalize(perpDir), dirToPt1));
  
  lineDir = bot2 - top;
  perpDir = vec2(lineDir.y, -lineDir.x);
  dirToPt1 = bot2 - testPt;
  float min_dist = min(abs(dot(normalize(perpDir), dirToPt1)), dist1);
  
  if (min_dist < 0.005) {
    return min_dist / 0.005;
  }
  else  {
    return 1.0;
  };
}


vec4 transition (vec2 uv) {
  if (in_left_triangle(uv))
  {
    if (progress < 0.1)
    {
      return getFromColor(uv);
    }
    if (uv.x < 0.5)
    {
      vec2 vertex1 = vec2(progress, 0.5);
      vec2 vertex2 = vec2(0.0, 0.5-progress);
      vec2 vertex3 = vec2(0.0, 0.5+progress);
      return mix(
        getFromColor(uv),
        getToColor(uv),
        blur_edge(vertex2, vertex3, vertex1, uv)
      );
    }
    else
    {
      if (progress > 0.0)
      {
        return getToColor(uv);
      }
      else
      {
        return getFromColor(uv);
      }
    }    
  }
  else if (in_right_triangle(uv))
  {
    if (uv.x >= 0.5)
    {
      vec2 vertex1 = vec2(1.0-progress, 0.5);
      vec2 vertex2 = vec2(1.0, 0.5-progress);
      vec2 vertex3 = vec2(1.0, 0.5+progress);
      return mix(
        getFromColor(uv),
        getToColor(uv),
        blur_edge(vertex2, vertex3, vertex1, uv)
      );  
    }
    else
    {
      return getFromColor(uv);
    }
  }
  else {
    return getFromColor(uv);
  }
}
`;

export const POLKA_DOTS_CURTAIN_FRAGMENT = `

const float SQRT_2 = 1.414213562373;
uniform float dots;// = 20.0;

vec4 transition(vec2 uv) {
  bool nextImage = distance(fract(uv * dots), vec2(0.5, 0.5)) < ( progress / distance(uv, center));
  return nextImage ? getToColor(uv) : getFromColor(uv);
}
`;
