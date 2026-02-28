export const ROTATION_MOVEMENT_FRAGMENT = `
in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;
uniform float uTime;
uniform float rotationCount; 

void main(void)
{
    vec2 center = vec2(0.35, 0.35);
    vec2 uvs = vTextureCoord.xy - center;
    
    // Rotación en función de la cantidad de vueltas
    float angle = uTime * rotationCount * 6.28318530718;
    
    float cosAngle = cos(angle);
    float sinAngle = sin(angle);
    mat2 rotation = mat2(cosAngle, -sinAngle, sinAngle, cosAngle);
    
    uvs = rotation * uvs;
    uvs += center;
    
    if (uvs.x < 0.0 || uvs.x > 1.0 || uvs.y < 0.0 || uvs.y > 1.0) {
        discard;
    }
    
    vec4 fg = texture2D(uTexture, uvs);
    gl_FragColor = fg;
}
`;

export const ROTATION_MOVEMENT_UNIFORMS: Record<
  string,
  { value: any; type: string }
> = {
  uTime: { value: 0, type: 'f32' },
  rotationCount: { value: 4.0, type: 'f32' },
};

export const RED_GRADIENT_FRAGMENT = `
in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;
uniform float uTime;

void main(void)
{
    vec2 uvs = vTextureCoord.xy;

    vec4 fg = texture2D(uTexture, vTextureCoord);

    fg.r = uvs.y + sin(uTime);

    gl_FragColor = fg;

}
`;

export const RED_GRADIENT_UNIFORMS: Record<
  string,
  { value: any; type: string }
> = {
  uTime: { value: 0.0, type: 'f32' },
};

export const BUBBLE_SPARKLES_FRAGMENT = `
in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;
uniform float uTime;
uniform vec3 bubbleColor;
uniform float bubbleCount;

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

float softCircle(vec2 uv, vec2 c, float r, float g) {
    float d = distance(uv, c);
    float base = 1.0 - smoothstep(r * 0.9, r, d);
    float halo = (1.0 - smoothstep(r, r * (1.0 + g), d));
    return base + halo * 0.5;
}

vec2 bubblePos(float id) {
    float fx = rand(vec2(id, 1.234));
    float fy = rand(vec2(id, 9.345));
    return vec2(fx, fy);
}

float bubbleRadius(float id) {
    return mix(0.015, 0.025, rand(vec2(id, 44.123)));
}

void main(void)
{
    vec2 uvs = vTextureCoord.xy;
    vec4 fg = texture2D(uTexture, uvs);

    float bubbles = 0.0;

    for(float i = 0.0; i < 200.0; i++) {

        if(i >= bubbleCount) break;
        float spawnSpeed = 8.0; 
        float spawnTime = (i / bubbleCount) / spawnSpeed;
        float t = uTime - spawnTime;

        if(t < 0.0) continue;

        float grow = pow(clamp(t, 0.0, 1.0), 0.35);

        vec2 pos = bubblePos(i);
        vec2 bubbleCenter = pos;

        float baseR = bubbleRadius(i);

        float r = baseR * grow;

        float phase = rand(vec2(i, 999.0)) * 6.28318;
        float pulse = sin(t * 1.6 + phase) * 0.5 + 0.5;
        float opacity = mix(0.2, 1.0, pulse);

        bubbles += softCircle(uvs, bubbleCenter, r, 0.8) * opacity;
    }

    fg.rgb += bubbleColor * bubbles;
    gl_FragColor = fg;
}
`;

export const BUBBLE_SPARKLES_UNIFORMS: Record<
  string,
  { value: any; type: string }
> = {
  uTime: { value: 0.0, type: 'f32' },
  bubbleColor: { value: [1.0, 0.85, 0.4], type: 'vec3<f32>' },
  bubbleCount: { value: 150.0, type: 'f32' },
};

export const SEPIA_FRAGMENT = `
in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;
uniform float uTime;      
uniform float maxIntensity; 

void main(void)
{
    vec2 uvs = vTextureCoord.xy;
    vec4 color = texture2D(uTexture, uvs);

    float intensity = (sin(uTime) * 0.5 + 0.5) * maxIntensity;

    vec3 sepiaColor;
    sepiaColor.r = dot(color.rgb, vec3(0.393, 0.769, 0.189));
    sepiaColor.g = dot(color.rgb, vec3(0.349, 0.686, 0.168));
    sepiaColor.b = dot(color.rgb, vec3(0.272, 0.534, 0.131));

    color.rgb = mix(color.rgb, sepiaColor, intensity);

    gl_FragColor = color;
}
`;

export const SEPIA_UNIFORMS: Record<string, { value: any; type: string }> = {
  uTime: { value: 0.0, type: 'f32' },
  maxIntensity: { value: 1.0, type: 'f32' },
};

export const UV_GRADIENT_FRAGMENT = `
in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;
uniform vec3 colorStart;  
uniform vec3 colorEnd;    
uniform int direction;  

void main(void)
{
    vec2 uvs = vTextureCoord.xy;
    vec4 fg = texture2D(uTexture, uvs);

    float t = 0.0;
    if(direction == 0) {
        t = uvs.x; 
    } else if(direction == 1) {
        t = uvs.y;
    } else {
        t = (uvs.x + uvs.y) * 0.5;
    }

    vec3 gradientColor = mix(colorStart, colorEnd, t);

    fg.rgb = fg.rgb * gradientColor; 

    gl_FragColor = fg;
}
`;

export const UV_GRADIENT_UNIFORMS: Record<
  string,
  { value: any; type: string }
> = {
  colorStart: { value: [1.0, 0.0, 0.0], type: 'vec3<f32>' },
  colorEnd: { value: [0.0, 0.0, 1.0], type: 'vec3<f32>' },
  direction: { value: 0, type: 'i32' },
};

export const RAINBOW_FRAGMENT = `
in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;
uniform float intensity;
uniform int direction;   

vec3 rainbow(float t) {
    float r = 0.5 + 0.5 * sin(6.28318 * (t + 0.0));
    float g = 0.5 + 0.5 * sin(6.28318 * (t + 0.33));
    float b = 0.5 + 0.5 * sin(6.28318 * (t + 0.66));
    return vec3(r, g, b);
}

void main(void)
{
    vec2 uvs = vTextureCoord.xy;
    vec4 fg = texture2D(uTexture, uvs);

    float t = 0.0;
    if(direction == 0) {
        t = uvs.x; 
    } else if(direction == 1) {
        t = uvs.y; 
    } else {
        t = (uvs.x + uvs.y) * 0.5; 
    }

    vec3 rainbowColor = rainbow(t);

    fg.rgb = fg.rgb * rainbowColor*intensity;

    gl_FragColor = fg;
}
`;

export const RAINBOW_UNIFORMS: Record<string, { value: any; type: string }> = {
  intensity: { value: 1.0, type: 'f32' },
  direction: { value: 0, type: 'i32' },
};

export const GLITCH_FRAGMENT = `
in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;
uniform float uTime;     
uniform float intensity;  
uniform float sliceCount;   
uniform float rgbShift;     

float rand(float n) { return fract(sin(n) * 43758.5453123); }
float rand2(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main(void)
{
    vec2 uv = vTextureCoord.xy;

    float sliceId = floor(uv.y * sliceCount);
    float sliceShift = (rand(sliceId + uTime * 10.0) - 0.5) * 0.2 * intensity;

    uv.x += sliceShift;

    float rShift = rgbShift * intensity;
    float gShift = -rgbShift * 0.5 * intensity;
    float bShift = rgbShift * 0.75 * intensity;

    vec3 col;
    col.r = texture2D(uTexture, uv + vec2(rShift, 0.0)).r;
    col.g = texture2D(uTexture, uv + vec2(gShift, 0.0)).g;
    col.b = texture2D(uTexture, uv + vec2(bShift, 0.0)).b;

    float noise = rand2(vec2(uTime * 50.0, uv.y * 100.0));
    float noiseIntensity = noise * 0.15 * intensity;

    col += noiseIntensity;

    gl_FragColor = vec4(col, 1.0);
}
`;

export const GLITCH_UNIFORMS: Record<string, { value: any; type: string }> = {
  uTime: { value: 0.0, type: 'f32' },
  intensity: { value: 0.5, type: 'f32' },
  sliceCount: { value: 12.0, type: 'f32' },
  rgbShift: { value: 0.01, type: 'f32' },
};

export const PIXELATE_FRAGMENT = `
in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;
uniform float pixelSize;
uniform float uTime;
uniform float jitterStrength;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main(void)
{
    vec2 uv = vTextureCoord.xy;

    vec2 pixelUV = floor(uv / pixelSize) * pixelSize;

    float n1 = hash(pixelUV + uTime * 1.5);
    float n2 = hash(pixelUV * 2.3 + uTime * 1.7);

    vec2 jitter = (vec2(n1, n2) - 0.5) * jitterStrength * pixelSize;

    vec2 finalUV = pixelUV + jitter;

    finalUV = clamp(finalUV, 0.0, 1.0);
    vec4 color = texture2D(uTexture, finalUV);

    gl_FragColor = color;
}
`;

export const PIXELATE_UNIFORMS = {
  pixelSize: { value: 0.02, type: 'f32' },
  uTime: { value: 0, type: 'f32' },
  jitterStrength: { value: 0.8, type: 'f32' },
};
export const RGB_GLITCH_FRAGMENT = `
precision highp float;

varying vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uTime;
uniform float glitchStrength;
uniform float glitchSpeed;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float rand2(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main(void)
{
    vec2 uv = vTextureCoord;

    vec4 base = texture2D(uTexture, uv);
    if (base.a < 0.01) {
        gl_FragColor = base;
        return;
    }

    float lineNoise =
        hash(vec2(floor(uv.y * 300.0), uTime * glitchSpeed));

    float rOffset =
        (hash(vec2(uTime, 1.0)) - 0.5) * glitchStrength;

    float gOffset =
        (hash(vec2(uTime, 2.0)) - 0.5) * glitchStrength * 0.5;

    float bOffset =
        (hash(vec2(uTime, 3.0)) - 0.5) * glitchStrength;

    float rShift = rOffset * lineNoise;
    float gShift = gOffset * lineNoise;
    float bShift = bOffset * lineNoise;

    vec2 uvR = clamp(uv + vec2(rShift, 0.0), 0.0, 1.0);
    vec2 uvG = clamp(uv + vec2(gShift, 0.0), 0.0, 1.0);
    vec2 uvB = clamp(uv + vec2(bShift, 0.0), 0.0, 1.0);

    vec3 col;
    col.r = texture2D(uTexture, uvR).r;
    col.g = texture2D(uTexture, uvG).g;
    col.b = texture2D(uTexture, uvB).b;

    float noise =
        (rand2(vec2(uTime * 50.0, uv.y * 100.0)) - 0.5) * 0.15;

    col += noise;

    gl_FragColor = vec4(col, base.a);
}
`;

export const RGB_GLITCH_UNIFORMS = {
  uTime: { value: 0, type: 'f32' },
  glitchStrength: { value: 0.02, type: 'f32' },
  glitchSpeed: { value: 2.0, type: 'f32' },
};
export const RGB_SHIFT_FRAGMENT = `
precision highp float;

varying vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float shiftAmount;
uniform float angle;
uniform float uTime;
uniform float wobbleAmount;
uniform float wobbleSpeed;

void main(void)
{
    vec2 uv = vTextureCoord;

    vec4 base = texture2D(uTexture, uv);

    if (base.a < 0.01) {
        gl_FragColor = base;
        return;
    }

    vec2 dir = vec2(cos(angle), sin(angle));
    float wobble = sin(uTime * wobbleSpeed) * wobbleAmount;

    vec2 rUV = uv + dir * shiftAmount + vec2(wobble, 0.0);
    vec2 gUV = uv;
    vec2 bUV = uv - dir * shiftAmount - vec2(wobble, 0.0);

    rUV = clamp(rUV, 0.0, 1.0);
    gUV = clamp(gUV, 0.0, 1.0);
    bUV = clamp(bUV, 0.0, 1.0);

    float r = texture2D(uTexture, rUV).r;
    float g = texture2D(uTexture, gUV).g;
    float b = texture2D(uTexture, bUV).b;

    gl_FragColor = vec4(r, g, b, base.a);
}
`;

export const RGB_SHIFT_UNIFORMS = {
  shiftAmount: { value: 0.01, type: 'f32' },
  angle: { value: 0.0, type: 'f32' },
  uTime: { value: 0.0, type: 'f32' },
  wobbleAmount: { value: 0.003, type: 'f32' },
  wobbleSpeed: { value: 20.0, type: 'f32' },
};

export const HALFTONE_FRAGMENT = `
in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;
uniform float dotSize;       
uniform float intensity;     
uniform float angle;         
uniform float uTime;        
uniform float vibrateStrength;

float luminance(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

void main(void)
{
    vec2 uv = vTextureCoord.xy;

    float ca = cos(angle);
    float sa = sin(angle);
    mat2 rot = mat2(ca, -sa, sa, ca);
    vec2 rotatedUV = rot * (uv - 0.5) + 0.5;
    vec2 grid = rotatedUV / dotSize;
    vec2 cell = floor(grid) + 0.5;

    vec2 cellCenter = cell * dotSize;

    float jitter = sin(uTime * 10.0 + cell.x * 12.989 + cell.y * 78.233) * 0.5;
    float dist = distance(rotatedUV, cellCenter + jitter * vibrateStrength * dotSize);
    vec4 texColor = texture2D(uTexture, uv);
    float lum = luminance(texColor.rgb);
    float radius = (1.0 - lum) * dotSize * 0.5;
    float mask = smoothstep(radius, radius * 0.8, dist);

    vec3 halftone = texColor.rgb * mask;
    texColor.rgb = mix(texColor.rgb, halftone, intensity);

    gl_FragColor = texColor;
}
`;

export const HALFTONE_UNIFORMS = {
  dotSize: { value: 0.03, type: 'f32' },
  intensity: { value: 1.0, type: 'f32' },
  angle: { value: 0.0, type: 'f32' },
  uTime: { value: 0.0, type: 'f32' },
  vibrateStrength: { value: 0.2, type: 'f32' },
};

export const SINEWAVE_FRAGMENT = `
in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;
uniform float uTime;     
uniform float amplitude; 
uniform float frequency;  
uniform float speed;    
uniform int direction;    

void main(void)
{
    vec2 uv = vTextureCoord.xy;

    vec2 offset = vec2(0.0);

    if(direction == 0) {
        offset.y = sin((uv.x + uTime * speed) * frequency * 6.2831853) * amplitude;
    } else {
        offset.x = sin((uv.y + uTime * speed) * frequency * 6.2831853) * amplitude;
    }

    vec4 color = texture2D(uTexture, uv + offset);
    gl_FragColor = color;
}
`;

export const SINEWAVE_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  amplitude: { value: 0.02, type: 'f32' },
  frequency: { value: 3.0, type: 'f32' },
  speed: { value: 0.5, type: 'f32' },
  direction: { value: 0, type: 'i32' },
};

export const SHINE_FRAGMENT = `
in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;
uniform float uTime;          // tiempo para animación
uniform vec3 shineColor;      // color de los rayos
uniform float rayWidth;       // grosor del rayo
uniform float rayCount;       // cantidad de rayos
uniform float rotationSpeed;  // velocidad de rotación

void main(void)
{
    vec2 uv = vTextureCoord.xy;
    vec2 center = vec2(0.3, 0.35);

    vec2 dir = uv - center;

    float angle = atan(dir.y, dir.x);

    angle += uTime * rotationSpeed;

    float normAngle = fract(angle / 6.28318530718); // 2π

    float rays = sin(normAngle * rayCount * 6.28318530718);

    float intensity = smoothstep(0.0, rayWidth, rays) - smoothstep(rayWidth, rayWidth*1.5, rays);

    vec4 color = texture2D(uTexture, uv);

    color.rgb += shineColor * intensity;

    gl_FragColor = color;
}
`;

export const SHINE_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  shineColor: { value: [1.0, 1.0, 1.0], type: 'vec3<f32>' },
  rayWidth: { value: 0.05, type: 'f32' },
  rayCount: { value: 12.0, type: 'f32' },
  rotationSpeed: { value: 0.5, type: 'f32' },
};

export const BLINK_FRAGMENT = `
in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;
uniform float uTime;    
uniform float blinkSpeed;  
uniform float minIntensity; 
uniform float maxIntensity; 

void main(void)
{
    vec2 uv = vTextureCoord.xy;
    vec4 color = texture2D(uTexture, uv);
    float t = sin(uTime * blinkSpeed * 6.2831853) * 0.5 + 0.5;
    float intensity = mix(minIntensity, maxIntensity, t);

    color.rgb *= intensity;

    gl_FragColor = color;
}
`;

export const BLINK_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  blinkSpeed: { value: 2.0, type: 'f32' },
  minIntensity: { value: 0.3, type: 'f32' },
  maxIntensity: { value: 1.0, type: 'f32' },
};

export const SPRING_FRAGMENT = `
in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;
uniform float uTime;         
uniform float frequency;      
uniform float damping;      
uniform float strength;      

void main(void)
{
    vec2 uv = vTextureCoord.xy;

    float spring = exp(-damping * uTime) *
                   sin(uTime * frequency * 6.2831853);

    uv.x += spring * strength;
    uv.y += spring * strength * 0.5; 

    vec4 color = texture2D(uTexture, uv);

    gl_FragColor = color;
}
`;

export const SPRING_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  frequency: { value: 2.0, type: 'f32' },
  damping: { value: 0.8, type: 'f32' },
  strength: { value: 0.04, type: 'f32' },
};

export const DUOTONE_FRAGMENT = `
in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;
uniform vec3 colorA;     
uniform vec3 colorB;    
uniform float intensity; 

void main(void)
{
    vec2 uv = vTextureCoord.xy;

    vec4 tex = texture2D(uTexture, uv);
    float gray = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
    vec3 duo = mix(colorA, colorB, gray);
    tex.rgb = mix(tex.rgb, duo, intensity);
    gl_FragColor = tex;
}
`;

export const DUOTONE_UNIFORMS = {
  colorA: { value: [0.1, 0.1, 0.5], type: 'vec3<f32>' },
  colorB: { value: [1.0, 0.8, 0.2], type: 'vec3<f32>' },
  intensity: { value: 1.0, type: 'f32' },
};

export const TRITONE_FRAGMENT = `
in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;
uniform vec3 colorShadow;   
uniform vec3 colorMid;       
uniform vec3 colorHighlight;

uniform float intensity;    

void main(void)
{
    vec2 uv = vTextureCoord.xy;
    vec4 tex = texture2D(uTexture, uv);
    float gray = dot(tex.rgb, vec3(0.299, 0.587, 0.114));


    vec3 duoA = mix(colorShadow, colorMid, smoothstep(0.0, 0.5, gray));
    vec3 duoB = mix(colorMid, colorHighlight, smoothstep(0.5, 1.0, gray));
    vec3 tritone = mix(duoA, duoB, smoothstep(0.33, 0.66, gray));
    tex.rgb = mix(tex.rgb, tritone, intensity);

    gl_FragColor = tex;
}
`;

export const TRITONE_UNIFORMS = {
  colorShadow: { value: [0.1, 0.0, 0.3], type: 'vec3<f32>' },
  colorMid: { value: [0.2, 0.8, 0.8], type: 'vec3<f32>' },
  colorHighlight: { value: [1.0, 0.9, 0.4], type: 'vec3<f32>' },
  intensity: { value: 1.0, type: 'f32' },
};

export const HUE_SHIFT_FRAGMENT = `
in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;
uniform float uTime;    
uniform float amount;    

vec3 hueShift(vec3 color, float angle) {
    float cosA = cos(angle);
    float sinA = sin(angle);
    mat3 rot = mat3(
        0.299 + 0.701 * cosA + 0.168 * sinA,
        0.587 - 0.587 * cosA + 0.330 * sinA,
        0.114 - 0.114 * cosA - 0.497 * sinA,

        0.299 - 0.299 * cosA - 0.328 * sinA,
        0.587 + 0.413 * cosA + 0.035 * sinA,
        0.114 - 0.114 * cosA + 0.292 * sinA,

        0.299 - 0.300 * cosA + 1.250 * sinA,
        0.587 - 0.588 * cosA - 1.050 * sinA,
        0.114 + 0.886 * cosA - 0.203 * sinA
    );

    return color * rot;
}

void main(void)
{
    vec2 uv = vTextureCoord.xy;
    vec4 tex = texture2D(uTexture, uv);

    vec3 shifted = hueShift(tex.rgb, uTime*2.5);

    tex.rgb = mix(tex.rgb, shifted, amount);

    gl_FragColor = tex;
}
`;

export const HUE_SHIFT_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  amount: { value: 1.0, type: 'f32' },
};

export const WARP_TRANSITION_FRAGMENT = `
in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;
uniform float uTime;       
uniform float uStrength;  
uniform float swirl;      

void main(void)
{
    vec2 uv = vTextureCoord.xy;
    vec2 center = vec2(0.5, 0.5);
    vec2 dir = uv - center;
    float dist = length(dir);
    float warpAmount = pow(dist, 2.0) * uStrength * uTime;
    float angle = swirl * uTime * 6.283185; 

    float s = sin(angle * dist);
    float c = cos(angle * dist);

    mat2 rot = mat2(c, -s, s, c);
    vec2 warpedUV = center + rot * dir * (1.0 - warpAmount);
    vec4 color = texture2D(uTexture, warpedUV);

    gl_FragColor = color;
}
`;

export const WARP_TRANSITION_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  uStrength: { value: 0.8, type: 'f32' },
  swirl: { value: 0.3, type: 'f32' },
};

export const SLIT_SCAN_FRAGMENT = `
in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;
uniform float uTime;      
uniform float uStrength;  
uniform int direction;     

void main(void)
{
    vec2 uv = vTextureCoord.xy;
    float offset;
    if(direction == 0) {
        offset = (uv.y - 0.5) * uStrength * uTime;
        uv.x += offset;
    } else {
        offset = (uv.x - 0.5) * uStrength * uTime;
        uv.y += offset;
    }

    vec4 color = texture2D(uTexture, uv);

    gl_FragColor = color;
}
`;

export const SLIT_SCAN_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  uStrength: { value: 0.2, type: 'f32' },
  direction: { value: 0, type: 'i32' },
};

export const SLIT_SCAN_GLITCH_FRAGMENT = `
in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;
uniform float uTime;
uniform float uStrength;
uniform float uNoise;
uniform int direction;

float hash(float n) {
    return fract(sin(n) * 43758.5453);
}

float hash(vec2 p) {
    return fract(sin(dot(p ,vec2(12.9898,78.233))) * 43758.5453);
}

void main(void)
{
    vec2 uv = vTextureCoord.xy;

    float offset;
    if(direction == 0) {
        offset = (uv.y - 0.5) * uStrength * uTime;
        uv.x += offset;
    } else {
        offset = (uv.x - 0.5) * uStrength * uTime;
        uv.y += offset;
    }

    float jitter = (hash(floor(uv * 100.0) + uTime) - 0.5) * uNoise;
    if(direction == 0) {
        uv.x += jitter;
    } else {
        uv.y += jitter;
    }

    float rOffset = (hash(uv + 1.0) - 0.5) * uNoise * 0.5;
    float gOffset = (hash(uv + 2.0) - 0.5) * uNoise * 0.5;
    float bOffset = (hash(uv + 3.0) - 0.5) * uNoise * 0.5;

    vec4 texR = texture2D(uTexture, uv + vec2(rOffset, 0.0));
    vec4 texG = texture2D(uTexture, uv + vec2(gOffset, 0.0));
    vec4 texB = texture2D(uTexture, uv + vec2(bOffset, 0.0));

    gl_FragColor = vec4(texR.r, texG.g, texB.b, 1.0);
}
`;

export const SLIT_SCAN_GLITCH_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  uStrength: { value: 0.2, type: 'f32' },
  uNoise: { value: 0.05, type: 'f32' },
  direction: { value: 0, type: 'i32' },
};

export const PIXELATE_TRANSITION_FRAGMENT = `
in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;
uniform float uTime;       
uniform float maxPixelSize; 

void main(void)
{
    vec2 uv = vTextureCoord.xy;
    float pixelSize = maxPixelSize * uTime;
    pixelSize = max(pixelSize, 0.001);
    vec2 pixelUV = floor(uv / pixelSize) * pixelSize;

    vec4 color = texture2D(uTexture, pixelUV);

    gl_FragColor = color;
}
`;

export const PIXELATE_TRANSITION_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  maxPixelSize: { value: 0.05, type: 'f32' },
};

export const FOCUS_TRANSITION_FRAGMENT = `
in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;
uniform float uTime;       
uniform float maxBlur;    

void main(void)
{
    vec2 uv = vTextureCoord.xy;
    vec4 color = vec4(0.0);
    float blur = maxBlur * (1.0 - uTime);

    if(blur < 0.001) {
        color = texture2D(uTexture, uv);
    } else {
        vec2 offsets[9];
        offsets[0] = vec2(-blur, -blur);
        offsets[1] = vec2(0.0, -blur);
        offsets[2] = vec2(blur, -blur);
        offsets[3] = vec2(-blur, 0.0);
        offsets[4] = vec2(0.0, 0.0);
        offsets[5] = vec2(blur, 0.0);
        offsets[6] = vec2(-blur, blur);
        offsets[7] = vec2(0.0, blur);
        offsets[8] = vec2(blur, blur);

        for(int i = 0; i < 9; i++) {
            color += texture2D(uTexture, uv + offsets[i]);
        }

        color /= 9.0;
    }

    gl_FragColor = color;
}
`;

export const FOCUS_TRANSITION_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  maxBlur: { value: 0.01, type: 'f32' },
};
export const INVERT_FRAGMENT = `
precision highp float;

varying vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float amount;

void main(void)
{
    vec2 uv = vTextureCoord;
    vec4 tex = texture2D(uTexture, uv);

    vec3 inverted = vec3(1.0) - tex.rgb;

    float strength = amount * tex.a;

    tex.rgb = mix(tex.rgb, inverted, strength);

    gl_FragColor = tex;
}
`;

export const INVERT_UNIFORMS = {
  amount: { value: 1.0, type: 'f32' },
};

export const GRAYSCALE_FRAGMENT = `
in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;
uniform float amount; 

void main(void)
{
    vec2 uv = vTextureCoord.xy;
    vec4 tex = texture2D(uTexture, uv);
    float gray = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
    vec3 grayscale = vec3(gray);

    tex.rgb = mix(tex.rgb, grayscale, amount);

    gl_FragColor = tex;
}
`;

export const GRAYSCALE_UNIFORMS = {
  amount: { value: 1.0, type: 'f32' },
};

export const VIGNETTE_FRAGMENT = `
in vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uIntensity;  
uniform float uSoftness;  

void main(void)
{
    vec2 uv = vTextureCoord.xy;

    vec2 centered = uv - vec2(0.5);
    float dist = length(centered);
    float vignette = smoothstep(0.5, 0.5 - uSoftness, dist);
    vec4 color = texture(uTexture, uv);
    color.rgb *= 1.0 - (vignette * uIntensity);

    gl_FragColor = color;
}
`;

export const VIGNETTE_UNIFORMS = {
  uIntensity: { value: 0.5, type: 'f32' },
  uSoftness: { value: 0.2, type: 'f32' },
};

export const CHROMATIC_FRAGMENT = `
in vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uIntensity; 
uniform vec2 uDirection;  

void main(void)
{
    vec2 uv = vTextureCoord;
    vec2 offset = uDirection * uIntensity;
    float r = texture(uTexture, uv + offset).r;
    float g = texture(uTexture, uv).g;
    float b = texture(uTexture, uv - offset).b;
    vec4 color = vec4(r, g, b, 1.0);

    gl_FragColor = color;
}
`;

export const CHROMATIC_UNIFORMS = {
  uIntensity: { value: 0.005, type: 'f32' },
  uDirection: { value: [1.0, 0.0], type: 'vec2<f32>' },
};

export const SWIRL_MOVEMENT_FRAGMENT = `
in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;
uniform float uTime;
uniform float rotationCount;

uniform float swirlStrength; 
uniform float swirlRadius;   
uniform float rainbowIntensity;

vec3 hsv2rgb(vec3 c)
{
    vec3 rgb = clamp( abs(mod(c.x*6.0 + vec3(0.0,4.0,2.0), 6.0) - 3.0) - 1.0,
                      0.0,
                      1.0 );
    return c.z * mix(vec3(1.0), rgb, c.y);
}

float flamePattern(float dist, float angle, float time) {
    return pow(sin(dist * 10.0 - time * 5.0 + angle * 5.0) * 0.5 + 0.5, 2.0);
}

void main(void)
{
    vec2 center = vec2(0.3, 0.45);
    vec2 uvs = vTextureCoord - center;

    // fade del rainbow (0 cuando uTime >= 0.75)
    float fadeRainbow = clamp(1.0 - smoothstep(0.7, 0.75, uTime), 0.0, 1.0);

    // fade de swirl, wave y blur (disminuye entre 0.8 y 1.0)
    float fadeMotion = clamp(1.0 - smoothstep(0.8, 1.0, uTime), 0.0, 1.0);

    // ángulo total acumulado para mantener la dirección del giro
    float angleTotal = uTime * rotationCount * 6.2831853; 

    float cosA = cos(angleTotal);
    float sinA = sin(angleTotal);
    mat2 rotation = mat2(cosA, -sinA, sinA, cosA);
    vec2 rotatedUV = rotation * uvs + center;

    float dist = distance(rotatedUV, center);
    float d = clamp(dist / swirlRadius, 0.0, 1.0);

    // swirl disminuye suavemente sin invertir la dirección
    float swirlAngle = swirlStrength * d * d * 6.2831853 * fadeMotion;
    float cosS = cos(swirlAngle);
    float sinS = sin(swirlAngle);

    vec2 dir = rotatedUV - center;
    rotatedUV = vec2(
        dir.x * cosS - dir.y * sinS,
        dir.x * sinS + dir.y * cosS
    ) + center;

    float wave = sin(dist * 12.0 - uTime * 4.0) * 0.015 * fadeMotion; 
    rotatedUV += wave * normalize(dir);

    // blur de la textura
    vec4 color = vec4(0.0);
    float blurAmount = (0.004 + rotationCount * 0.001) * fadeMotion; 

    for (int i = -3; i <= 3; i++) {
        float offset = float(i) * blurAmount;
        vec2 blurUV = rotatedUV + vec2(offset * cosA, offset * sinA);
        color += texture2D(uTexture, blurUV);
    }
    color /= 7.0;

    // rainbow
    float rainbowScale = 0.05;
    float ang = atan(dir.y, dir.x);
    float hue = (ang / 6.2831853) + 0.5 + dist * rainbowScale;
    hue += uTime * 0.2 + rotationCount * 0.05;

    vec3 rainbow = hsv2rgb(vec3(hue, 0.35, 1.0));
    color.rgb = mix(color.rgb, rainbow, rainbowIntensity * fadeRainbow);

    // Flame disminuye con fadeMotion
    float flame = flamePattern(dist, ang, uTime) * fadeMotion;
    vec3 flameColor = vec3(1.0, 0.5, 0.0) * flame;
    flameColor = mix(flameColor, vec3(1.0,1.0,0.2), flame * 0.5);
    color.rgb += flameColor * 0.3;

    if (rotatedUV.x < 0.0 || rotatedUV.x > 1.0 || rotatedUV.y < 0.0 || rotatedUV.y > 1.0) {
        discard;
    }

    gl_FragColor = color;
}

`;

export const SWIRL_MOVEMENT_UNIFORMS = {
  uTime: { value: 0, type: 'f32' },
  rotationCount: { value: 4.0, type: 'f32' },

  swirlStrength: { value: 0.9, type: 'f32' },
  swirlRadius: { value: 1.0, type: 'f32' },

  rainbowIntensity: { value: 0.25, type: 'f32' },
};

export const HEART_SPARKLES_FRAGMENT = `
in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;
uniform float uTime;
uniform vec3 heartColor;
uniform float heartCount;

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

float heartShape(vec2 p) {
    p = (p - 0.5) * 2.0;   
    p.y = -p.y;           
    p.y += 0.25;          
    float x = p.x;
    float y = p.y;
    float val = pow(x*x + y*y - 1.0, 3.0) - x*x * y*y*y;
    return smoothstep(0.0, 0.02, -val);
}

vec2 heartPos(float id) {
    float fx = rand(vec2(id, 1.234)) * 0.85 - 0.025; 
    float fy = rand(vec2(id, 1.345)) * 0.85 + 0.025;
    return vec2(fx, fy);
}

float heartSize(float id) {
    return mix(0.02, 0.05, rand(vec2(id, 44.123))); 
}

void main() {
    vec2 uv = vTextureCoord.xy;
    vec4 base = texture2D(uTexture, uv);

    float hearts = 0.0;

    for(float i = 0.0; i < 200.0; i++) {
        if(i >= heartCount) break;

        vec2 pos = heartPos(i);
        float size = heartSize(i);

        float vibX = (rand(vec2(i, uTime)) - 0.5) * 0.02;
        float vibY = (rand(vec2(i+1.0, uTime)) - 0.5) * 0.02;

        vec2 heartUV = (uv - (pos + vec2(vibX, vibY))) / size + 0.5;

        float h = heartShape(heartUV);

        float pulse = sin(uTime * 4.0 + i) * 0.2 + 1.0;
        h *= pulse;

        hearts += h;
    }

    base.rgb += heartColor * hearts;
    gl_FragColor = base;
}
`;

export const HEART_SPARKLES_UNIFORMS: Record<
  string,
  { value: any; type: string }
> = {
  uTime: { value: 0.0, type: 'f32' },
  heartColor: { value: [1.0, 0.2, 0.5], type: 'vec3<f32>' },
  heartCount: { value: 150.0, type: 'f32' },
};

export const BUTTERFLY_SPARKLES_FRAGMENT = `
in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;
uniform float uTime;
uniform vec3 butterflyColor;
uniform float butterflyCount;

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

float wing(vec2 p) {
    float d = pow(p.x, 2.0) + pow(p.y * 1.2, 2.0);
    return smoothstep(0.3, 0.0, d);
}

float butterflyShape(vec2 uv) {
    vec2 p = (uv - 0.5) * 2.0;

    float body = smoothstep(0.12, 0.05, abs(p.x)) 
               * smoothstep(0.4, 0.0, abs(p.y));

    float wL = wing(vec2(p.x * 1.2 + 0.6, p.y));
    float wR = wing(vec2(p.x * 1.2 - 0.6, p.y));

    return clamp(wL + wR + body, 0.0, 1.0);
}
vec2 butterflyPos(float id) {
    float fx = rand(vec2(id, 1.234)) * 0.85 - 0.025;
    float fy = rand(vec2(id, 1.345)) * 0.85 + 0.025;
    return vec2(fx, fy);
}

float butterflySize(float id) {
    return mix(0.03, 0.08, rand(vec2(id, 44.123)));
}

void main() {
    vec2 uv = vTextureCoord.xy;
    vec4 base = texture2D(uTexture, uv);

    float butterflies = 0.0;

    for(float i = 0.0; i < 200.0; i++) {
        if(i >= butterflyCount) break;

        vec2 pos = butterflyPos(i);
        float size = butterflySize(i);

        float vibX = (rand(vec2(i, uTime)) - 0.5) * 0.02;
        float vibY = (rand(vec2(i+1.0, uTime)) - 0.5) * 0.02;

        vec2 bUV = (uv - (pos + vec2(vibX, vibY))) / size + 0.5;

        float b = butterflyShape(bUV);

        float pulse = sin(uTime * 3.0 + i) * 0.25 + 1.0;
        b *= pulse;

        butterflies += b;
    }

    base.rgb += butterflyColor * butterflies;
    gl_FragColor = base;
}
`;

export const BUTTERFLY_SPARKLES_UNIFORMS: Record<
  string,
  { value: any; type: string }
> = {
  uTime: { value: 0.0, type: 'f32' },
  butterflyColor: { value: [0.5, 0.6, 1.0], type: 'vec3<f32>' },
  butterflyCount: { value: 120.0, type: 'f32' },
};

export const DISTORT_EFFECT_FRAGMENT = `
in vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float amplitude; 
uniform float speed;     
uniform float uTime;  

void main() {
    vec2 p = vTextureCoord;
    vec2 center = vec2(0.28, 0.45);

    vec2 dir = p - center;
    float dist = length(dir);

    vec2 offset = vec2(0.0);

    if (dist <= uTime) {
        offset = dir * sin(dist * amplitude - uTime * speed);
    }

    gl_FragColor = texture2D(uTexture, p + offset);
}
`;

export const DISTORT_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  amplitude: { value: 30.0, type: 'f32' },
  speed: { value: 30.0, type: 'f32' },
};

export const PERSPECTIVE_SINGLE_FRAGMENT = `
precision mediump float;

uniform sampler2D uTexture;
uniform float persp;      
uniform float unzoom;     
uniform float reflection; 
uniform float floating;   
uniform float uTime;

varying vec2 vTextureCoord;

bool inBounds(vec2 p) {
    return all(greaterThanEqual(p, vec2(0.0))) &&
           all(lessThanEqual(p, vec2(1.0)));
}

vec2 project(vec2 p) {
    return p * vec2(1.0, -1.2) + vec2(0.0, -floating / 100.0);
}

vec2 xskew(vec2 p, float persp, float center) {
    float x = mix(p.x, 1.0 - p.x, center);

    return (
        (
            vec2(
                x,
                (p.y - 0.5*(1.0-persp) * x) /
                (1.0+(persp-1.0)*x)
            )
            - vec2(0.5 - abs(center - 0.5), 0.0)
        )
        * vec2(
            0.5 / abs(center - 0.5) * (center < 0.5 ? 1.0 : -1.0),
            1.0
        )
        + vec2(center < 0.5 ? 0.0 : 1.0, 0.0)
    );
}

void main() {
    vec2 p = vTextureCoord;

    float uz = unzoom * sin(uTime * 0.5);
    p = -uz * 0.5 + (1.0 + uz) * p;

    vec2 warped = xskew(p, persp, 0.0);

    vec4 baseColor = vec4(0.0);

    if (inBounds(warped)) {
        baseColor = texture2D(uTexture, warped);
    }

    vec2 proj = project(warped);
    if (inBounds(proj)) {
        vec4 refl = texture2D(uTexture, proj);
        refl.rgb *= reflection * (1.0 - proj.y);
        baseColor += refl;
    }

    gl_FragColor = baseColor;
}

`;

export const PERSPECTIVE_SINGLE_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  persp: { value: 0.7, type: 'f32' },
  unzoom: { value: 0.3, type: 'f32' },
  reflection: { value: 0.0, type: 'f32' },
  floating: { value: 3.0, type: 'f32' },
};

export const DISTORT_SPIN_FRAGMENT = `
in vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uTime;        
uniform float radius;       
uniform float spinPower;    
uniform float speed;       

void main() {
    vec2 uv = vTextureCoord;
    vec2 center = vec2(0.28, 0.45);

    vec2 pos = uv - center;

    float dist = length(pos);

    if (dist < radius) {
        float percent = (radius - dist) / radius;

        float theta = percent * percent * spinPower * sin(uTime * speed);

        float s = sin(theta);
        float c = cos(theta);

        pos = vec2(
            pos.x * c - pos.y * s,
            pos.x * s + pos.y * c
        );
    }

    uv = pos + center;

    gl_FragColor = texture2D(uTexture, uv);
}
`;

export const DISTORT_SPIN_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  radius: { value: 1.0, type: 'f32' },
  spinPower: { value: 18.0, type: 'f32' },
  speed: { value: 4.0, type: 'f32' },
};

export const DISTORT_GRID_FRAGMENT = `
in vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uTime;

uniform float speed;        
uniform float intensity;    
uniform int endx;
uniform int endy;

#define PI 3.14159265358979323

float rand(vec2 v) {
    return fract(sin(dot(v.xy , vec2(12.9898,78.233))) * 43758.5453);
}

vec2 rotate2d(vec2 v, float a) {
    mat2 rm = mat2(cos(a), -sin(a),
                   sin(a),  cos(a));
    return rm * v;
}

void main() {
    vec2 uv = vTextureCoord;

    vec2 p = uv - 0.5;

    float t = sin(uTime * speed) * 0.5 + 0.5;

    float warp = 1.0 + intensity * abs(t - 0.5);

    vec2 rp = p * warp;
    float tx = float(endx) + 0.5;
    float ty = float(endy) + 0.5;

    vec2 shifted = mix(vec2(0.5, 0.5), vec2(tx, ty), t*t);

    vec2 tiled = fract(rp + shifted);

    vec2 cell = floor(rp + shifted);

    bool isEnd = int(cell.x) == endx && int(cell.y) == endy;

    if (!isEnd) {
        float rnd = rand(cell);
        float angle = float(int(rnd * 4.0)) * 0.5 * PI;
        tiled = vec2(0.5) + rotate2d(tiled - vec2(0.5), angle);
    }
    gl_FragColor = texture2D(uTexture, tiled);
}
`;

export const DISTORT_GRID_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  speed: { value: 2.0, type: 'f32' },
  intensity: { value: 1.5, type: 'f32' },
  endx: { value: 2, type: 'i32' },
  endy: { value: -1, type: 'i32' },
};

export const DISTORT_RIP_FRAGMENT = `
precision highp float;

in vec2 vTextureCoord;
uniform sampler2D uTexture;
uniform float uTime;

uniform float intensity;    
uniform float speed;        
uniform int slices;         
uniform float randomness;   

#define PI 3.141592653589793
float rand(float x) {
    return fract(sin(x * 12.9898) * 43758.5453);
}

void main() {
    vec2 uv = vTextureCoord;

    float sliceHeight = 1.0 / float(slices);
    float sliceIndex = floor(uv.y / sliceHeight);

    float offsetX = (rand(sliceIndex + uTime * speed) - 0.5) * intensity;

    float offsetY = sin(uTime * speed + sliceIndex * 1.5) * 0.01 * randomness;

    uv.x += offsetX;
    uv.y += offsetY;
    vec4 color = texture(uTexture, uv);

    gl_FragColor = color;
}

`;

export const DISTORT_RIP_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  intensity: { value: 0.05, type: 'f32' },
  speed: { value: 2.0, type: 'f32' },
  slices: { value: 10, type: 'i32' },
  randomness: { value: 1.0, type: 'f32' },
};

export const TWO_CURTAIN_FRAGMENT = `
precision highp float;

in vec2 vTextureCoord;
uniform sampler2D uTexture;
uniform float uTime;      
uniform float softness;   

void main() {
    vec2 uv = vTextureCoord;

    float t_raw = clamp(uTime, 0.0, 1.0);
    float t = pow(t_raw, 0.55);

    float mid = 0.5;

    float leftEdge = mid - t * mid;
    float rightEdge = mid + t * mid;

    float mask = smoothstep(leftEdge, leftEdge + softness, uv.x) *
                 (1.0 - smoothstep(rightEdge - softness, rightEdge, uv.x));

    vec4 color = texture(uTexture, uv);

    gl_FragColor = vec4(color.rgb * mask, color.a * mask);
}
`;
export const TWO_CURTAIN_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  softness: { value: 0.2, type: 'f32' },
};

export const TRIANGLE_PATTERN_EFFECT_FRAGMENT = `
precision highp float;

in vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uTime;
uniform float softness;
uniform float zoom;

#define PI 3.141592653589793

vec2 rotate2D(vec2 st, float angle) {
    st -= 0.5;
    st = mat2(cos(angle), -sin(angle),
              sin(angle),  cos(angle)) * st;
    st += 0.5;
    return st;
}

vec2 tile(vec2 st, float zoom) {
    st *= zoom;
    return fract(st);
}

vec2 rotateTile(vec2 st) {
    st *= 2.0;

    float index = 0.0;
    if (fract(st.x * 0.5) > 0.5) index += 1.0;
    if (fract(st.y * 0.5) > 0.5) index += 2.0;

    st = fract(st);

    if (index == 1.0)      st = rotate2D(st, PI * 0.5);
    else if (index == 2.0) st = rotate2D(st, PI * -0.5);
    else if (index == 3.0) st = rotate2D(st, PI);

    return st;
}

float triangleShape(vec2 st, float smoothness) {
    vec2 p0 = vec2(0.3, -0.5);
    vec2 p1 = vec2(0.7, -0.5);
    vec2 p2 = vec2(0.5, 1.0);

    vec3 e0, e1, e2;

    e0.xy = normalize(p1 - p0).yx * vec2(+1.0, -1.0);
    e1.xy = normalize(p2 - p1).yx * vec2(+1.0, -1.0);
    e2.xy = normalize(p0 - p2).yx * vec2(+1.0, -1.0);

    e0.z = dot(e0.xy, p0) - smoothness;
    e1.z = dot(e1.xy, p1) - smoothness;
    e2.z = dot(e2.xy, p2) - smoothness;

    float a = max(0.0, dot(e0.xy, st) - e0.z);
    float b = max(0.0, dot(e1.xy, st) - e1.z);
    float c = max(0.0, dot(e2.xy, st) - e2.z);

    return smoothstep(smoothness * 2.0, 1e-7, length(vec3(a, b, c)));
}

void main() {
    vec2 uv = vTextureCoord;
    vec2 st = uv;
    st = tile(st, zoom);
    st = rotateTile(st);
    st = rotate2D(st, -PI * 0.25 * uTime);

    float mask = triangleShape(st, softness);

    vec4 tex = texture(uTexture, uv);
    gl_FragColor = vec4(tex.rgb * mask, tex.a * mask);
}
`;

export const TRIANGLE_PATTERN_EFFECT_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  softness: { value: 0.2, type: 'f32' },
  zoom: { value: 8.0, type: 'f32' },
};

export const MIRROR_TILE_FRAGMENT = `
precision highp float;

in vec2 vTextureCoord;
uniform sampler2D uTexture;
uniform float uTime;

vec2 mirrorTile(vec2 st, float zoom) {
    st *= zoom;

    if (fract(st.y * 0.5) > 0.5) {
        st.x = st.x + 0.5;
        st.y = 1.0 - st.y;
    }

    return fract(st);
}

float zigzag(vec2 st) {
    float x = st.x * 2.0;
    float a = floor(1.0 + sin(x * 3.14159));
    float b = floor(1.0 + sin((x + 1.0) * 3.14159));
    float f = fract(x);
    return mix(a, b, f);
}

void main() {
    vec2 st = vTextureCoord;

    st = mirrorTile(st * vec2(1.0, 2.0), 5.0);

    float zz = zigzag(st);

    st.y += zz * 0.03;

    vec4 tex = texture(uTexture, st);

    gl_FragColor = tex;
}
`;

export const MIRROR_TILE_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
};

export const FLASH_LOOP_FRAGMENT = `
precision highp float;

in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;
uniform float uTime;
uniform float speed;      
uniform float intensity;  

void main(void)
{
    vec4 tex = texture2D(uTexture, vTextureCoord);
    float t = fract(uTime * speed);
    float wave = sin(t * 3.141592);
    float base = 0.6;
    float brightness = mix(base, 1.0, wave);
    float flash = 1.0 + brightness * intensity;

    vec3 color = tex.rgb * flash;

    gl_FragColor = vec4(color, tex.a);
}
`;

export const FLASH_LOOP_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  speed: { value: 10.2, type: 'f32' },
  intensity: { value: 1.5, type: 'f32' },
};

export const FILM_STRIP_PRO_FRAGMENT = `
precision highp float;

in vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uTime;

uniform float framesPerScreen;
uniform float scrollSpeed;
uniform float gateWeave;

void main() {
    vec2 uv = vTextureCoord;

    vec3 color = vec3(0.0);

    uv.y += uTime * scrollSpeed;
    uv.y += sin(uTime * 2.0) * 0.003 * gateWeave;

    float stripLeft  = 0.025;
    float stripRight = 0.5;

    if (uv.x < stripLeft || uv.x > stripRight) {
        gl_FragColor = vec4(color, 1.0);
        return;
    }

    vec2 stripUV;
    stripUV.x = (uv.x - stripLeft) / (stripRight - stripLeft);
    stripUV.y = fract(uv.y);

    float holeZone = 0.06; 
    float frameZone = 1.0 - holeZone * 2.0;

    float frameH = 1.0 / framesPerScreen;
    float localY = fract(stripUV.y / frameH);

    bool inFrameX =
        stripUV.x > holeZone &&
        stripUV.x < holeZone + frameZone;

    float marginX = 0.08;
    float marginY = 0.10;


    bool insideFrame =
        inFrameX &&
        stripUV.x > holeZone + marginX &&
        stripUV.x < holeZone + frameZone - marginX &&
        localY > marginY &&
        localY < 1.0 - marginY;

    float frameZoneX = frameZone - marginX * 4.0;
    float centerOffset = (1.0 - frameZoneX - holeZone * 2.0) * 0.5;

    vec2 frameUV;
    frameUV.x = (stripUV.x - (holeZone + marginX * 2.0) - centerOffset) / frameZoneX;
    frameUV.y = (localY - marginY) / (1.0 - marginY * 2.0);

    float holeH = 0.01;
    float holeSpacing = frameH * 0.1;

    float holeRow = step(mod(stripUV.y, holeSpacing), holeH);

    bool leftHole  = stripUV.x < holeZone * 0.8;
    bool rightHole = stripUV.x > 1.0 - holeZone * 0.8;

    bool isHole = holeRow > 0.5 && (leftHole || rightHole);
    if (isHole) {
        color = vec3(1.0);
    }
    else if (insideFrame) {
        color = texture2D(uTexture, frameUV).rgb;
    }
    else {
        color = vec3(0.0);
    }

    gl_FragColor = vec4(color, 1.0);
}
`;

export const FILM_STRIP_PRO_UNIFORMS = {
  uTime: { value: 0, type: 'f32' },
  framesPerScreen: { value: 2.0, type: 'f32' },
  scrollSpeed: { value: 0.35, type: 'f32' },
  gateWeave: { value: 0.6, type: 'f32' },
};

export const BAD_SIGNAL_FRAGMENT = `
precision highp float;

in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;
uniform float uTime;
float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453);
}

float noise(float y) {
    return rand(vec2(y, uTime));
}

void main(void)
{
    vec2 uv = vTextureCoord;
    float flicker = 0.9 + 0.1 * sin(uTime * 30.0);
    float lineNoise = noise(floor(uv.y * 200.0));
    uv.x += (lineNoise - 0.5) * 0.03;
    uv.x += sin(uv.y * 40.0 + uTime * 10.0) * 0.005;
    float rgbShift = 0.004 * sin(uTime * 5.0);

    vec4 colR = texture2D(uTexture, uv + vec2(rgbShift, 0.0));
    vec4 colG = texture2D(uTexture, uv);
    vec4 colB = texture2D(uTexture, uv - vec2(rgbShift, 0.0));

    vec4 color;
    color.r = colR.r;
    color.g = colG.g;
    color.b = colB.b;
    color.a = colG.a;
    float staticNoise = rand(uv * uTime) * 0.08;
    color.rgb += staticNoise;
    float scanline = sin(uv.y * 800.0) * 0.04;
    color.rgb -= scanline;
    color.rgb *= flicker;

    gl_FragColor = color;
}

`;

export const BAD_SIGNAL_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
};

export const OMNIFLEXION_FRAGMENT = `
precision highp float;

in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;
uniform float uTime;

/* Configuración */
uniform float strength;   // fuerza de la omniflexión
uniform float frequency;  // frecuencia de ondas
uniform float speed;      // velocidad animación

void main(void)
{
    vec2 uv = vTextureCoord;
    vec2 center = vec2(0.5);

    vec2 dir = uv - center;
    float dist = length(dir);
    float wave =
        sin(dist * frequency - uTime * speed) *
        strength;

    float lens = dist * dist;

    vec2 flexUV = uv + normalize(dir) * wave * lens;
    vec4 color = texture2D(uTexture, flexUV);

    gl_FragColor = color;
}

`;

export const OMNIFLEXION_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },

  strength: { value: 0.08, type: 'f32' },
  frequency: { value: 18.0, type: 'f32' },
  speed: { value: 3.5, type: 'f32' },
};

export const INVERSE_APERTURE_FRAGMENT = `
precision highp float;

in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;
uniform float uTime;

uniform float feather;

void main(void)
{
    vec2 uv = vTextureCoord;

    vec2 center = vec2(0.28, 0.48);

    float dist = distance(uv, center);

    float maxRadius = 0.8;

    float radius = mix(maxRadius, 0.0, uTime);

    float mask = smoothstep(
        radius - feather,
        radius + feather,
        dist
    );

    vec4 color = texture2D(uTexture, uv);

    gl_FragColor = vec4(color.rgb * mask, color.a);
}

`;

export const INVERSE_APERTURE_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  feather: { value: 0.03, type: 'f32' },
};

export const CURTAIN_OPEN_FRAGMENT = `
precision highp float;

in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;
uniform float uTime;

void main(void)
{
    vec2 uv = vTextureCoord;

    float openPhase = smoothstep(0.0, 0.6, uTime);
    float zoomPhase = smoothstep(0.6, 1.0, uTime);

    float zoom =
        1.0 +
        sin(zoomPhase * 3.141592) * 0.2;

    vec2 center = vec2(0.28, 0.35);
    vec2 zoomUV = (uv - center) / zoom + center;

    vec4 tex = texture2D(uTexture, zoomUV);

    float centerY = 0.48;
    float halfOpen = openPhase * 0.5;

    float mask = step(abs(zoomUV.y - centerY), halfOpen);

    gl_FragColor = vec4(tex.rgb * mask, tex.a);
}

`;

export const CURTAIN_OPEN_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
};

export const CURTAIN_BLUR_FRAGMENT = `
precision highp float;

in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;
uniform float uTime;

vec4 blur9(sampler2D tex, vec2 uv, vec2 resolution, float radius)
{
    vec4 color = vec4(0.0);
    vec2 off = radius / resolution;

    color += texture2D(tex, uv + off * vec2(-1.0, -1.0)) * 0.0625;
    color += texture2D(tex, uv + off * vec2( 0.0, -1.0)) * 0.125;
    color += texture2D(tex, uv + off * vec2( 1.0, -1.0)) * 0.0625;

    color += texture2D(tex, uv + off * vec2(-1.0,  0.0)) * 0.125;
    color += texture2D(tex, uv)                             * 0.25;
    color += texture2D(tex, uv + off * vec2( 1.0,  0.0)) * 0.125;

    color += texture2D(tex, uv + off * vec2(-1.0,  1.0)) * 0.0625;
    color += texture2D(tex, uv + off * vec2( 0.0,  1.0)) * 0.125;
    color += texture2D(tex, uv + off * vec2( 1.0,  1.0)) * 0.0625;

    return color;
}

void main(void)
{
    vec2 uv = vTextureCoord;

    float openPhase = smoothstep(0.0, 0.3, uTime);
    float zoomPhase = smoothstep(0.3, 1.0, uTime);

    float zoom =
        1.0 +
        sin(zoomPhase * 3.141592) * 0.2;

    vec2 center = vec2(0.28, 0.35);
    vec2 zoomUV = (uv - center) / zoom + center;

    float blurAmount = mix(10.0, 0.0, openPhase);

    vec4 blurred =
        blur9(uTexture, zoomUV, vec2(1024.0, 1024.0), blurAmount);

    float pulse =
    (sin(uTime * 2.0) * 0.5 + 0.5) * 0.8;
    blurred.rgb *= (1.0 + pulse);
    float centerY = 0.48;
    float halfOpen = openPhase * 0.5;

    float mask = step(abs(zoomUV.y - centerY), halfOpen);

    gl_FragColor = vec4(blurred.rgb * mask, blurred.a);
}

`;

export const CURTAIN_BLUR_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
};

export const DISTORT_V2_FRAGMENT = `
precision highp float;

in vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uTime;

uniform float strength;

uniform float frequency;

void main(void)
{
    vec2 uv = vTextureCoord;

    float waveX = sin((uv.y + uTime * 0.6) * frequency) * strength;
    float waveY = cos((uv.x + uTime * 0.4) * frequency) * strength;

    vec2 distortedUV = uv + vec2(waveX, waveY);

    distortedUV = clamp(distortedUV, 0.0, 1.0);

    vec4 color = texture2D(uTexture, distortedUV);

    gl_FragColor = color;
}
`;

export const DISTORT_V2_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },

  strength: { value: 0.015, type: 'f32' },
  frequency: { value: 10.0, type: 'f32' },
};
export const LIGHTNING_FRAGMENT = `
precision mediump float;

varying vec2 vTextureCoord;
varying vec4 vColor;

uniform sampler2D uTexture;
uniform float uTime;

void main(void)
{
    vec2 uv = vTextureCoord;
    vec2 center = vec2(0.28, 0.45);

    float dist = distance(uv, center);

    float speed = 0.7;
    float progress = mod(uTime * speed, 1.0);

    float width = mix(0.01, 0.07, progress);

    float lightning = smoothstep(progress + width, progress, dist);

    float noise = sin((uv.x + uv.y) * 30.0 + uTime * 12.0);
    lightning *= noise * 0.5 + 0.5;

    float explosion = smoothstep(0.85, 1.0, progress);
    float burst = explosion * smoothstep(0.25, 0.0, dist);

    vec3 lightningColor = vec3(1.0, 0.9, 0.6) * lightning * 2.5;
    vec3 explosionColor = vec3(1.0, 0.4, 0.2) * burst * 4.0;

    vec4 base = texture2D(uTexture, uv);

    gl_FragColor = vec4(base.rgb + lightningColor + explosionColor, base.a);
}
`;

export const LIGHTNING_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
};

export const LIGHTNING_VEINS_FRAGMENT = `
precision mediump float;

varying vec2 vTextureCoord;
varying vec4 vColor;

uniform sampler2D uTexture;
uniform float uTime;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) +
           (c - a) * u.y * (1.0 - u.x) +
           (d - b) * u.x * u.y;
}

void main(void)
{
    vec2 uv = vTextureCoord;
    vec2 center = vec2(0.5);

    vec2 dir = uv - center;
    float dist = length(dir);
    float t = uTime * 1.5;

    float veinNoise =
        noise(dir * 6.0 + t) * 0.6 +
        noise(dir * 12.0 - t * 1.3) * 0.3;

    float warpedDist = dist + veinNoise * 0.08;

    float thickness = 0.04 + veinNoise * 0.02;

    float lightning =
        smoothstep(thickness, 0.0, warpedDist);

    float branches =
        smoothstep(0.02, 0.0,
            abs(noise(dir * 20.0 + t) - 0.5));

    lightning += branches * 0.35;

    float pulse = sin(uTime * 10.0) * 0.3 + 0.7;
    lightning *= pulse;

    vec3 veinColor =
        vec3(0.6, 0.85, 1.0) * lightning * 2.5;

    vec4 base = texture2D(uTexture, uv);

    gl_FragColor =
        vec4(base.rgb + veinColor, base.a);
}
`;

export const LIGHTNING_VEINS_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
};

export const PIXEL_ERROR_FRAGMENT = `
precision mediump float;

varying vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uTime;

float rand(float x)
{
    return fract(sin(x) * 43758.5453123);
}

void main(void)
{
    vec2 uv = vTextureCoord;

    float pixelRows = 120.0;
    float row = floor(uv.y * pixelRows) / pixelRows;

    float offset =
        sin(row * 40.0 + uTime * 3.0) *
        0.015;

    offset += (rand(row * 10.0) - 0.5) * 0.01;

    vec2 distortedUV = vec2(uv.x + offset, uv.y);

    distortedUV = clamp(distortedUV, 0.0, 1.0);

    vec4 color = texture2D(uTexture, distortedUV);

    gl_FragColor = color;
}
`;

export const PIXEL_ERROR_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
};

export const NEON_FLASH_FRAGMENT = `
precision highp float;

in vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uTime;
uniform float uIntensity;

uniform float neonR;
uniform float neonG;
uniform float neonB;

void main(void)
{
    vec4 base = texture2D(uTexture, vTextureCoord);

    float speed = 4.2;                 
    float t = fract(uTime * speed);    

    float rise = smoothstep(0.0, 0.25, t);
    float fall = smoothstep(0.85, 0.55, t);
    float flash = rise * fall;

    flash = mix(0.25, 1.0, flash);

    flash *= uIntensity;

    base.r += base.r * neonR * flash;
    base.g += base.g * neonG * flash;
    base.b += base.b * neonB * flash;

    gl_FragColor = base;
}
`;

export const NEON_FLASH_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  uIntensity: { value: 1.8, type: 'f32' },

  neonR: { value: 0.1, type: 'f32' },
  neonG: { value: 0.9, type: 'f32' },
  neonB: { value: 1.0, type: 'f32' },
};

export const WAVE_DISTORT_FRAGMENT = `
precision highp float;

in vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uTime;
uniform float uStrength;
uniform float uSpeed;

void main(void)
{
    vec2 uv = vTextureCoord;
    float time = uTime * uSpeed;

    float wave = sin((uv.y * 18.0) - time);

    float offsetX = wave * uStrength;

    vec2 distortedUV = uv + vec2(offsetX, 0.0);

    distortedUV = clamp(distortedUV, 0.0, 1.0);

    vec4 color = texture2D(uTexture, distortedUV);

    gl_FragColor = color;
}
`;

export const WAVE_DISTORT_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  uStrength: { value: 0.02, type: 'f32' },
  uSpeed: { value: 20.0, type: 'f32' },
};

export const BOUNCING_BALLS_FRAGMENT = `
precision highp float;

in vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uTime;

const int BALL_COUNT = 10;
float radius = 0.05;
float border = 0.006;

vec2 bounce(vec2 p)
{
    return abs(fract(p) * 2.0 - 1.0);
}

void main(void)
{
    vec2 uv = vTextureCoord;

    /* Textura base */
    vec4 color = texture2D(uTexture, uv);

    float ballsAlpha = 0.0;

    for (int i = 0; i < BALL_COUNT; i++)
    {
        float id = float(i) + 1.0;

        vec2 speed = vec2(
            0.3 + id * 0.12,
            0.25 + id * 0.15
        );

        vec2 pos = bounce(vec2(
            uTime * speed.x + id * 0.17,
            uTime * speed.y + id * 0.29
        ));

        float d = distance(uv, pos);

        float edge =
            smoothstep(radius, radius - border, d) -
            smoothstep(radius - border, radius - border - 0.01, d);

        ballsAlpha += edge;
    }

    ballsAlpha = clamp(ballsAlpha, 0.0, 1.0);
    color.rgb = mix(color.rgb, vec3(1.0), ballsAlpha);

    gl_FragColor = color;
}
`;

export const BOUNCING_BALLS_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
};

export const WATER_REFLECTION_FRAGMENT = `
precision highp float;

in vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uTime;
uniform float uWaveStrength;
uniform float uWaveSpeed;

void main(void)
{
    vec2 uv = vTextureCoord;

    if (uv.y < 0.5)
    {
        gl_FragColor = texture2D(uTexture, uv);
        return;
    }

    vec2 reflectUV = uv;
    reflectUV.y = 1.0 - uv.y;

    float wave =
        sin(reflectUV.y * 30.0 + uTime * uWaveSpeed) *
        uWaveStrength;

    reflectUV.x += wave;
    reflectUV = clamp(reflectUV, 0.0, 1.0);

    vec4 reflectColor = texture2D(uTexture, reflectUV);

    float fade = smoothstep(0.5, 1.0, uv.y);

    reflectColor.rgb *= (1.0 - fade) * 0.85;
    reflectColor.a *= (1.0 - fade);

    gl_FragColor = reflectColor;
}
`;

export const WATER_REFLECTION_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  uWaveStrength: { value: 0.02, type: 'f32' },
  uWaveSpeed: { value: 2.5, type: 'f32' },
};

export const DARK_ERROR_FRAGMENT = `
precision highp float;

in vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uTime;
uniform float uStrength;

float rand(vec2 co)
{
    return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453);
}

void main(void)
{
    vec2 uv = vTextureCoord;

    float t = floor(uTime * 6.0);

    float blockSize = 0.08;
    float blockY = floor(uv.y / blockSize) * blockSize;

    float noise = rand(vec2(blockY, t));

    float shift =
        step(0.65, noise) *
        (rand(vec2(blockY, t + 1.0)) - 0.5) *
        uStrength;

    vec2 glitchUV = uv + vec2(shift, 0.0);
    glitchUV = clamp(glitchUV, 0.0, 1.0);

    vec4 color = texture2D(uTexture, glitchUV);
    float darkPulse =
        step(0.75, noise) *
        (0.4 + rand(vec2(uv.x, t)) * 0.6);

    color.rgb *= 1.0 - darkPulse;
    float pixelNoise = rand(uv * t);
    color.rgb *= 1.0 - step(0.96, pixelNoise) * 0.8;

    gl_FragColor = color;
}
`;

export const DARK_ERROR_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  uStrength: { value: 0.08, type: 'f32' },
};

export const SCALE_MOVE_BLUR_FRAGMENT = `
precision highp float;

in vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uTime;

vec4 blur5(sampler2D tex, vec2 uv, float strength)
{
    vec4 col = vec4(0.0);
    float s = strength;

    col += texture2D(tex, uv + vec2(-s, -s)) * 0.05;
    col += texture2D(tex, uv + vec2( 0.0, -s)) * 0.10;
    col += texture2D(tex, uv + vec2( s, -s)) * 0.05;

    col += texture2D(tex, uv + vec2(-s,  0.0)) * 0.10;
    col += texture2D(tex, uv)                * 0.40;
    col += texture2D(tex, uv + vec2( s,  0.0)) * 0.10;

    col += texture2D(tex, uv + vec2(-s,  s)) * 0.05;
    col += texture2D(tex, uv + vec2( 0.0,  s)) * 0.10;
    col += texture2D(tex, uv + vec2( s,  s)) * 0.05;

    return col;
}

void main(void)
{
    vec2 uv = vTextureCoord;
    vec2 center = vec2(0.5, 0.5);

    float t = clamp(uTime, 0.0, 1.0);
    float zoomPhase = smoothstep(0.0, 0.5, t) *
                      (1.0 - smoothstep(0.5, 1.0, t));

    float scale = 1.0 + zoomPhase * 0.5;

    vec2 offset = vec2(0.0);

    if (t < 0.33)
    {
        offset = vec2(0.12 * (t / 0.33), 0.0);
    }
    else if (t < 0.66)
    {
        offset = vec2(
            0.12 * (1.0 - (t - 0.33) / 0.33),
            0.0
        );
    }
    else
    {
        offset = vec2(
            0.08 * ((t - 0.66) / 0.34),
           -0.08 * ((t - 0.66) / 0.34)
        );
    }

    offset *= zoomPhase;
    vec2 transformedUV =
        (uv - center) / scale +
        center -
        offset;

    transformedUV = clamp(transformedUV, 0.0, 1.0);
    float blurStrength = zoomPhase * 0.015;

    vec4 color = blur5(uTexture, transformedUV, blurStrength);

    gl_FragColor = color;
}
`;

export const SCALE_MOVE_BLUR_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
};

export const PAPER_BREAK_REVEAL_FRAGMENT = `
precision highp float;

in vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uTime;
uniform float uCutPos;


float noise(float x)
{
    return sin(x * 28.0) * 0.035;
}

vec4 blur5(sampler2D tex, vec2 uv, float s)
{
    vec4 c = vec4(0.0);
    c += texture2D(tex, uv + vec2(-s, -s)) * 0.05;
    c += texture2D(tex, uv + vec2( 0.0, -s)) * 0.10;
    c += texture2D(tex, uv + vec2( s, -s)) * 0.05;
    c += texture2D(tex, uv + vec2(-s,  0.0)) * 0.10;
    c += texture2D(tex, uv)                * 0.40;
    c += texture2D(tex, uv + vec2( s,  0.0)) * 0.10;
    c += texture2D(tex, uv + vec2(-s,  s)) * 0.05;
    c += texture2D(tex, uv + vec2( 0.0,  s)) * 0.10;
    c += texture2D(tex, uv + vec2( s,  s)) * 0.05;
    return c;
}

void main(void)
{
    vec2 uv = vTextureCoord;
    vec2 center = vec2(0.5);
    float movePhase  = smoothstep(0.0, 0.45, uTime);
    float settle     = smoothstep(0.45, 0.6, uTime);
    float cutPhase   = smoothstep(0.7, 0.9, uTime);
    float cleanPhase = smoothstep(0.9, 1.0, uTime);
    float scale = mix(1.5, 1.0, settle);

    float moveAlive = 1.0 - settle;

    vec2 movement = vec2(
        sin(uTime * 6.0) * 0.18 * moveAlive,
        0.0
    );

    vec2 uvScaled =
        (uv - center) / scale +
        center -
        movement;

    uvScaled = clamp(uvScaled, 0.0, 1.0);

    float blurStrength = (1.0 - cleanPhase) * 0.025;
    vec4 blurred = blur5(uTexture, uvScaled, blurStrength);
    vec4 clean = texture2D(uTexture, uv);

    float tearLine =
        mix(
            uCutPos,
            uCutPos + noise(uv.y + uTime * 3.0),
            cutPhase
        );

    tearLine = clamp(tearLine, uCutPos - 0.05, uCutPos + 0.05);

    float split = cutPhase * 0.35;

    vec2 leftUV  = uv;
    vec2 rightUV = uv;

    leftUV.x  -= split * step(uv.x, tearLine);
    rightUV.x += split * step(tearLine, uv.x);

    leftUV  = clamp(leftUV,  0.0, 1.0);
    rightUV = clamp(rightUV, 0.0, 1.0);

    vec4 left  = texture2D(uTexture, leftUV);
    vec4 right = texture2D(uTexture, rightUV);

    float cutMask =
        smoothstep(tearLine - 0.02, tearLine + 0.02, uv.x);

    vec4 broken = mix(left, right, cutMask);

    float edge =
        smoothstep(0.0, 0.02, abs(uv.x - tearLine)) *
        (1.0 - smoothstep(0.02, 0.05, abs(uv.x - tearLine)));

    vec3 edgeColor = vec3(1.0) * edge * cutPhase;

    broken.rgb += edgeColor;

    vec4 result = mix(blurred, broken, cutPhase);
    result = mix(result, clean, cleanPhase);

    gl_FragColor = result;
}
`;

export const PAPER_BREAK_REVEAL_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  uCutPos: { value: 0.28, type: 'f32' },
};

export const GRAFFITI_FRAGMENT = `
#ifdef GL_ES
precision mediump float;
#endif

varying vec2 vTextureCoord;

uniform float uTime;
uniform sampler2D uTexture;

float rand(vec2 st)
{
    return fract(sin(dot(st, vec2(12.9898,78.233))) * 43758.5453123);
}

float noise(vec2 st)
{
    vec2 i = floor(st);
    vec2 f = fract(st);

    float a = rand(i);
    float b = rand(i + vec2(1.0, 0.0));
    float c = rand(i + vec2(0.0, 1.0));
    float d = rand(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) +
           (c - a) * u.y * (1.0 - u.x) +
           (d - b) * u.x * u.y;
}

float spray(vec2 st, float radius)
{
    float dist = length(st - vec2(0.28, 0.5));
    float base = smoothstep(radius, radius - 0.06, dist);

    float speckle =
        noise(st * 45.0 + uTime * 3.0) *
        noise(st * 90.0);

    return clamp(base + speckle * 0.7, 0.0, 1.0);
}

float drips(vec2 st, float mask)
{
    float column = noise(vec2(st.x * 25.0, 0.0));

    float drip =
        smoothstep(0.3, 0.7, column) *
        smoothstep(0.1, 1.0, 1.0 - st.y);

    float flow =
        noise(vec2(st.x * 35.0, st.y * 6.0 + uTime * 2.5));

    return drip * flow * mask;
}

void main(void)
{
    vec2 uv = vTextureCoord;

    vec4 base = texture2D(uTexture, uv);

    vec3 graffitiColor = vec3(1.0, 0.0, 0.5);

    float reveal = smoothstep(0.0, 1.0, uTime);

    float sprayMask =
        spray(uv, 0.35 * reveal);

    float dripMask =
        drips(uv, sprayMask) * reveal;

    float graffitiMask =
        clamp(sprayMask + dripMask * 1.3, 0.0, 1.0);

    vec3 graffiti =
        graffitiColor * graffitiMask;

    vec3 Color =
        base.rgb + graffiti;

    gl_FragColor = vec4(Color, base.a);
}
`;

export const GRAFFITI_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
};

export const LASER_FRAGMENT = `
precision highp float;

varying vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uTime;
uniform vec3 uColor;
uniform float uThickness;
uniform float uIntensity;

float noise(float x) {
    return sin(x * 40.0) * 0.005;
}

void main() {
    vec2 uv = vTextureCoord;

    vec4 baseColor = texture2D(uTexture, uv);

    float beamY = 0.48 + noise(uv.x + uTime * 5.0);

    float dist = abs(uv.y - beamY);

    float core = smoothstep(uThickness, 0.0, dist);

    float glow = smoothstep(uThickness * 4.0, uThickness, dist);

    float pulse = 0.6 + 0.4 * sin(uTime * 10.0);

    float laserMask = (core + glow * uIntensity) * pulse;

    vec3 laserColor = uColor * laserMask;

    vec3 color = baseColor.rgb + laserColor;

    gl_FragColor = vec4(color, baseColor.a);
}
`;

export const LASER_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  uColor: { value: [1.0, 0.0, 0.2], type: 'vec3<f32>' },
  uThickness: { value: 0.02, type: 'f32' },
  uIntensity: { value: 1.5, type: 'f32' },
};

export const WAVE_FRAGMENT = `
precision highp float;

varying vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uTime;
uniform float uStrength;
uniform float uFrequency;
uniform float uSpeed;

void main() {
    vec2 uv = vTextureCoord;

    vec2 center = vec2(0.5, 0.5);

    float dist = distance(uv, center);

    float wave =
        sin(dist * uFrequency - uTime * uSpeed) *
        uStrength *
        smoothstep(1.0, 0.0, dist);

    vec2 dir = normalize(uv - center);

    vec2 distortedUV = uv + dir * wave;

    vec4 color = texture2D(uTexture, distortedUV);

    gl_FragColor = color;
}
`;

export const WAVE_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  uStrength: { value: 0.02, type: 'f32' },
  uFrequency: { value: 20.0, type: 'f32' },
  uSpeed: { value: 4.0, type: 'f32' },
};

export const SPARKS_FRAGMENT = `
precision highp float;

varying vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uTime;
uniform float uDensity;
uniform float uSpeed;
uniform float uSize;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
vec3 randomColor(float h) {
    return vec3(
        0.5 + 0.5 * sin(h * 6.2831),
        0.5 + 0.5 * sin(h * 6.2831 + 2.1),
        0.5 + 0.5 * sin(h * 6.2831 + 4.2)
    );
}

void main() {
    vec2 uv = vTextureCoord;

    vec4 base = texture2D(uTexture, uv);

    vec3 sparkColor = vec3(0.0);
    float sparkAlpha = 0.0;

    vec2 grid = floor(uv * uDensity);
    vec2 id = grid;

    float h = hash(id);

    vec2 sparkPos = fract(vec2(
        h,
        h + uTime * uSpeed
    ));

    float d = distance(fract(uv * uDensity), sparkPos);

    float spark = smoothstep(uSize, 0.0, d);

    vec3 color = randomColor(h) * spark;

    sparkColor += color;
    sparkAlpha += spark;

    vec3 colorValue = base.rgb + sparkColor;

    gl_FragColor = vec4(colorValue, max(base.a, sparkAlpha));
}
`;

export const SPARKS_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  uDensity: { value: 30.0, type: 'f32' },
  uSpeed: { value: 2.5, type: 'f32' },
  uSize: { value: 0.15, type: 'f32' },
};

export const HOLOGRAM_SCAN_FRAGMENT = `
precision highp float;

varying vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uTime;
uniform vec3 uColor;      
uniform float uScanWidth; 
uniform float uIntensity; 

float noise(float x) {
    return sin(x * 120.0) * 0.02;
}

void main() {
    vec2 uv = vTextureCoord;

    vec4 base = texture2D(uTexture, uv);

    float scanPos = fract(uTime * 0.5);
    float scanLine = smoothstep(
        uScanWidth,
        0.0,
        abs(uv.y - scanPos)
    );

    float lines = 0.5 + 0.5 * sin(uv.y * 300.0 + uTime * 10.0);

    float flicker = 0.9 + 0.1 * sin(uTime * 50.0);

    float holo =
        scanLine +
        lines * 0.2 +
        noise(uv.x + uTime) * 0.5;

    holo *= uIntensity * flicker;

    vec3 holoColor = uColor * holo;

    vec3 colorValue = base.rgb + holoColor;

    gl_FragColor = vec4(colorValue, base.a);
}
`;

export const HOLOGRAM_SCAN_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  uColor: { value: [0.0, 1.0, 1.0], type: 'vec3<f32>' },
  uScanWidth: { value: 0.02, type: 'f32' },
  uIntensity: { value: 1.2, type: 'f32' },
};

export const RETRO_70S_FRAGMENT = `
precision highp float;

varying vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uTime;
uniform float uGrain;     
uniform float uFade;      
uniform float uVignette;  

float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898,78.233)) + uTime) * 43758.5453);
}

void main() {
    vec2 uv = vTextureCoord;

    vec4 color = texture2D(uTexture, uv);

    vec3 faded = mix(color.rgb, vec3(
        dot(color.rgb, vec3(0.393, 0.769, 0.189)),
        dot(color.rgb, vec3(0.349, 0.686, 0.168)),
        dot(color.rgb, vec3(0.272, 0.534, 0.131))
    ), uFade);

    float grain = (noise(uv * 500.0) - 0.5) * uGrain;
    faded += grain;

    float flicker = 0.97 + 0.03 * sin(uTime * 60.0);
    faded *= flicker;

    float dist = distance(uv, vec2(0.5));
    float vignette = smoothstep(0.8, uVignette, dist);
    faded *= 1.0 - vignette;

    gl_FragColor = vec4(faded, color.a);
}
`;

export const RETRO_70S_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  uGrain: { value: 0.08, type: 'f32' },
  uFade: { value: 0.6, type: 'f32' },
  uVignette: { value: 1.0, type: 'f32' },
};

export const IG_OUTLINE_FRAGMENT = `
precision highp float;

varying vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uThickness;
uniform vec3 uOutlineColor;

void main() {
    vec2 uv = vTextureCoord;

    vec2 px = vec2(uThickness) / vec2(1024.0, 1024.0);

    vec4 centerTex = texture2D(uTexture, uv);
    vec3 center = centerTex.rgb;

    vec3 up     = texture2D(uTexture, uv + vec2(0.0,  px.y)).rgb;
    vec3 down   = texture2D(uTexture, uv - vec2(0.0,  px.y)).rgb;
    vec3 left   = texture2D(uTexture, uv - vec2(px.x, 0.0)).rgb;
    vec3 right  = texture2D(uTexture, uv + vec2(px.x, 0.0)).rgb;

    float edge =
        length(center - up) +
        length(center - down) +
        length(center - left) +
        length(center - right);

    edge = smoothstep(0.15, 0.4, edge);

    vec3 colorValue = mix(center, uOutlineColor, edge);
    gl_FragColor = vec4(colorValue, centerTex.a);
}

`;

export const IG_OUTLINE_UNIFORMS = {
  uThickness: { value: 1.5, type: 'f32' },
  uOutlineColor: { value: [1.0, 1.0, 1.0], type: 'vec3<f32>' },
};

export const RANDOM_ACCENTS_FRAGMENT = `
precision highp float;

varying vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uTime;
uniform float uDensity;
uniform float uSize;
uniform float uIntensity;
uniform vec3 uColorA;
uniform vec3 uColorB;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec3 accentColor(float h) {
    return mix(uColorA, uColorB, fract(h * 7.0));
}

void main() {
    vec2 uv = vTextureCoord;

    vec4 base = texture2D(uTexture, uv);

    vec2 gridUV = floor(uv * uDensity);
    float h = hash(gridUV);

    vec2 offset = vec2(
        fract(h * 13.3),
        fract(h * 7.7)
    );

    vec2 accentUV = fract(uv * uDensity) - offset;

    float dist = length(accentUV);

    float accent = smoothstep(uSize, 0.0, dist);

    accent *= 0.6 + 0.4 * sin(uTime * 10.0 + h * 6.28);

    vec3 color = accentColor(h) * accent * uIntensity;

    float alpha = accent;

    gl_FragColor = vec4(color + base.rgb, max(base.a, alpha));
}
`;

export const RANDOM_ACCENTS_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  uDensity: { value: 20.0, type: 'f32' },
  uSize: { value: 0.25, type: 'f32' },
  uIntensity: { value: 1.2, type: 'f32' },
  uColorA: { value: [1.0, 0.2, 0.6], type: 'vec3<f32>' },
  uColorB: { value: [0.2, 0.8, 1.0], type: 'vec3<f32>' },
};

export const SOLUTION_EFFECT_FRAGMENT = `
precision highp float;

varying vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uIntensity;

float noise(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

vec2 swirl(vec2 uv, float t) {
    vec2 center = vec2(0.5);
    vec2 diff = uv - center;
    float angle = 0.5 * t * length(diff);
    float s = sin(angle);
    float c = cos(angle);
    return center + vec2(c*diff.x - s*diff.y, s*diff.x + c*diff.y);
}

void main() {
    vec2 uv = vTextureCoord;

    vec2 uvSwirl = swirl(uv, uTime);

    vec4 base = texture2D(uTexture, uvSwirl);

    float n = noise(uv * 20.0 + uTime * 2.0);
    vec3 liquid = mix(uColorA, uColorB, n);

    vec3 colorValue = mix(base.rgb, liquid, uIntensity * n);

    gl_FragColor = vec4(colorValue, base.a);
}
`;

export const SOLUTION_EFFECT_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  uColorA: { value: [0.2, 0.8, 1.0], type: 'vec3<f32>' },
  uColorB: { value: [1.0, 0.2, 0.6], type: 'vec3<f32>' },
  uIntensity: { value: 0.8, type: 'f32' },
};

export const TV_SCANLINES_FRAGMENT = `
precision highp float;

varying vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uTime;
uniform float uLineThickness;
uniform float uLineIntensity;
uniform float uNoiseIntensity;
uniform vec3 uLineColor;

float rand(vec2 p){
    return fract(sin(dot(p ,vec2(12.9898,78.233))) * 43758.5453);
}

void main() {
    vec2 uv = vTextureCoord;

    vec4 tex = texture2D(uTexture, uv);
    vec3 base = tex.rgb;

    float line = sin(uv.y * 800.0 * uLineThickness) * 0.5 + 0.5;
    line = mix(1.0, line, uLineIntensity);

    float noise =
        (rand(vec2(uTime, uv.y * 1000.0)) - 0.5) * uNoiseIntensity;

    vec3 colorValue = base * line + noise;

    gl_FragColor = vec4(colorValue, tex.a);
}
`;

export const TV_SCANLINES_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  uLineThickness: { value: 2.0, type: 'f32' },
  uLineIntensity: { value: 0.6, type: 'f32' },
  uNoiseIntensity: { value: 0.05, type: 'f32' },
  uLineColor: { value: [0.8, 1.0, 0.8], type: 'vec3<f32>' },
};

export const HDR_FRAGMENT = `
precision highp float;

varying vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uExposure;
uniform float uSaturation;
uniform float uContrast;

vec3 adjustSaturation(vec3 color, float sat) {
    float grey = dot(color, vec3(0.299, 0.587, 0.114));
    return mix(vec3(grey), color, sat);
}

vec3 adjustContrast(vec3 color, float contrast) {
    return (color - 0.5) * contrast + 0.5;
}

void main() {
    vec2 uv = vTextureCoord;

    vec4 tex = texture2D(uTexture, uv);
    vec3 color = tex.rgb;
    color *= uExposure;

    color = adjustSaturation(color, uSaturation);

    color = adjustContrast(color, uContrast);

    color = color / (color + vec3(1.0));

    gl_FragColor = vec4(color, tex.a);
}
`;

export const HDR_UNIFORMS = {
  uExposure: { value: 1.2, type: 'f32' },
  uSaturation: { value: 4.3, type: 'f32' },
  uContrast: { value: 2.2, type: 'f32' },
};

export const BLACK_FLASH_FRAGMENT = `
precision highp float;

varying vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uTime;
uniform float uIntensity;
uniform float uDuration;

void main() {
    vec2 uv = vTextureCoord;
    vec4 base = texture2D(uTexture, uv);

    float flash = smoothstep(0.0, uDuration * 0.5, mod(uTime, uDuration)) *
                  (1.0 - smoothstep(uDuration * 0.5, uDuration, mod(uTime, uDuration)));

    flash *= uIntensity;

    vec3 color = mix(base.rgb, vec3(0.0), flash);

    gl_FragColor = vec4(color, base.a);
}
`;

export const BLACK_FLASH_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  uIntensity: { value: 0.7, type: 'f32' },
  uDuration: { value: 0.2, type: 'f32' },
};

export const BRIGHT_PULSE_FRAGMENT = `
precision highp float;

varying vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uTime;
uniform float uPulseScale;  
uniform float uBlurStrength; 
uniform float uGlowBoost; 

vec4 blur3(sampler2D tex, vec2 uv, float s) {
    vec4 c = vec4(0.0);
    c += texture2D(tex, uv + vec2(-s, -s)) * 0.0625;
    c += texture2D(tex, uv + vec2( 0.0, -s)) * 0.125;
    c += texture2D(tex, uv + vec2( s, -s)) * 0.0625;
    c += texture2D(tex, uv + vec2(-s,  0.0)) * 0.125;
    c += texture2D(tex, uv) * 0.25;
    c += texture2D(tex, uv + vec2( s,  0.0)) * 0.125;
    c += texture2D(tex, uv + vec2(-s,  s)) * 0.0625;
    c += texture2D(tex, uv + vec2( 0.0,  s)) * 0.125;
    c += texture2D(tex, uv + vec2( s,  s)) * 0.0625;
    return c * uGlowBoost;
}

void main() {
    vec2 uv = vTextureCoord;

    float scale = 1.0 + uPulseScale * (0.5 + 0.5 * sin(uTime * 3.0));
    vec2 center = vec2(0.28,0.48); 
    vec2 uvScaled = (uv - center) / scale + center;
    uvScaled = clamp(uvScaled, 0.0, 1.0);
    vec4 base = texture2D(uTexture, uvScaled);
    vec4 blurred = blur3(uTexture, uvScaled, uBlurStrength);
    vec4 colorValue = mix(base, blurred, 0.8);

    gl_FragColor = colorValue;
}
`;

export const BRIGHT_PULSE_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  uPulseScale: { value: 0.2, type: 'f32' },
  uBlurStrength: { value: 0.02, type: 'f32' },
  uGlowBoost: { value: 2.0, type: 'f32' },
};
export const NEGATIVE_DIVISION_FRAGMENT = `
precision highp float;

varying vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uIntensity; // 0 → original, 1 → negativo completo
uniform float uContrast;  // fuerza de contraste

void main() {
    vec2 uv = vTextureCoord;
    vec4 color = texture2D(uTexture, uv);
    vec3 negative = 1.0 - color.rgb;

    vec3 contrasted = (negative - 0.5) * uContrast + 0.5;

    float maskedIntensity = uIntensity * color.a;

    vec3 colorValue =
        mix(color.rgb, contrasted, maskedIntensity);

    gl_FragColor = vec4(colorValue, color.a);
}
`;

export const NEGATIVE_DIVISION_UNIFORMS = {
  uIntensity: { value: 1.0, type: 'f32' },
  uContrast: { value: 2.5, type: 'f32' },
};

export const CAMERA_MOVE_FRAGMENT = `
precision highp float;

varying vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uTime;
uniform float uIntensity;
uniform float uSpeed;

float rand(float x){
    return fract(sin(x * 12.9898) * 43758.5453);
}

vec2 shakeOffset(float time){
    float x = (rand(time * 0.7) - 0.5) * uIntensity;
    float y = (rand(time * 1.3 + 10.0) - 0.5) * uIntensity;
    return vec2(x, y);
}

void main() {
    vec2 uv = vTextureCoord;

    vec2 offset = shakeOffset(uTime * uSpeed);

    vec2 uvMoved = clamp(uv + offset, 0.0, 1.0);

    vec4 color = texture2D(uTexture, uvMoved);

    gl_FragColor = color;
}

`;

export const CAMERA_MOVE_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  uIntensity: { value: 1.0, type: 'f32' },
  uSpeed: { value: 1.0, type: 'f32' },
};
export const HDR_V2_FRAGMENT = `
precision highp float;

varying vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uExposure;
uniform float uBloom;
uniform float uContrast;

vec3 tonemapReinhard(vec3 color){
    return color / (color + vec3(1.0));
}

void main() {
    vec2 uv = vTextureCoord;
    vec4 tex = texture2D(uTexture, uv);

    if (tex.a < 0.01) {
        gl_FragColor = tex;
        return;
    }

    vec3 color = tex.rgb;

    vec3 bright = max(color - 0.6, 0.0) * uBloom;
    bright = tonemapReinhard(bright);

    vec3 hdrColor = color + bright * 0.6;

    hdrColor *= uExposure;

    hdrColor = (hdrColor - 0.5) * uContrast + 0.5;

    hdrColor = clamp(hdrColor, 0.0, 1.0);

    gl_FragColor = vec4(hdrColor, tex.a);
}
`;

export const HDR_V2_UNIFORMS = {
  uExposure: { value: 1.0, type: 'f32' },
  uBloom: { value: 1.5, type: 'f32' },
  uContrast: { value: 2.0, type: 'f32' },
};

export const FAST_ZOOM_FRAGMENT = `
precision highp float;

varying vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uTime;       
uniform float uZoomSpeed;  
uniform float uMaxZoom;    
uniform float uBlurStrength; 

vec4 blur3(sampler2D tex, vec2 uv, float s) {
    vec4 c = vec4(0.0);
    c += texture2D(tex, uv + vec2(-s, -s)) * 0.0625;
    c += texture2D(tex, uv + vec2( 0.0, -s)) * 0.125;
    c += texture2D(tex, uv + vec2( s, -s)) * 0.0625;
    c += texture2D(tex, uv + vec2(-s,  0.0)) * 0.125;
    c += texture2D(tex, uv) * 0.25;
    c += texture2D(tex, uv + vec2( s,  0.0)) * 0.125;
    c += texture2D(tex, uv + vec2(-s,  s)) * 0.0625;
    c += texture2D(tex, uv + vec2( 0.0,  s)) * 0.125;
    c += texture2D(tex, uv + vec2( s,  s)) * 0.0625;
    return c;
}

void main() {
    vec2 uv = vTextureCoord;
    vec2 center = vec2(0.28,0.48); 

    float zoom = 1.0 + (uMaxZoom - 1.0) * smoothstep(0.0, 1.0, sin(uTime * uZoomSpeed));

    vec2 uvZoomed = (uv - center) / zoom + center;

    uvZoomed = clamp(uvZoomed, 0.0, 1.0);

    vec4 color = texture2D(uTexture, uvZoomed);

    if (uBlurStrength > 0.0) {
        vec4 blurred = blur3(uTexture, uvZoomed, uBlurStrength);
        color = mix(color, blurred, 0.5);
    }

    gl_FragColor = color;
}
`;

export const FAST_ZOOM_UNIFORMS = {
  uTime: { value: 0.0, type: 'f32' },
  uZoomSpeed: { value: 5.0, type: 'f32' },
  uMaxZoom: { value: 2.0, type: 'f32' },
  uBlurStrength: { value: 0.01, type: 'f32' },
};

export const CHROMA_KEY_FRAGMENT = `
precision highp float;

varying vec2 vTextureCoord;
uniform sampler2D uTexture;

uniform vec3 uKeyColor;     
uniform float uSimilarity;  
uniform float uSpill;       

void main() {
    vec4 color = texture2D(uTexture, vTextureCoord);
    
    float maxChannel = max(max(uKeyColor.r, uKeyColor.g), uKeyColor.b);
    
    float diff;
    float spillAmount = 0.0;
    
    if (maxChannel == uKeyColor.g && uKeyColor.g > uKeyColor.r && uKeyColor.g > uKeyColor.b) {
        diff = color.g - max(color.r, color.b);
        spillAmount = max(0.0, color.g - max(color.r, color.b));
        color.g -= spillAmount * uSpill;
        
        float avg = (color.r + color.b) * 0.5;
        color.r = mix(color.r, avg, spillAmount);
        color.b = mix(color.b, avg, spillAmount);
    } 
    else if (maxChannel == uKeyColor.b && uKeyColor.b > uKeyColor.r && uKeyColor.b > uKeyColor.g) {
        diff = color.b - max(color.r, color.g);
        spillAmount = max(0.0, color.b - max(color.r, color.g));
        color.b -= spillAmount * uSpill;
        
        float avg = (color.r + color.g) * 0.5;
        color.r = mix(color.r, avg, spillAmount);
        color.g = mix(color.g, avg, spillAmount);
    } 
    else {
        diff = color.r - max(color.g, color.b);
        spillAmount = max(0.0, color.r - max(color.g, color.b));
        color.r -= spillAmount * uSpill;
        
        float avg = (color.g + color.b) * 0.5;
        color.g = mix(color.g, avg, spillAmount);
        color.b = mix(color.b, avg, spillAmount);
    }
    
    float mask = step(uSimilarity, diff); 
    float alpha = 1.0 - mask;

    if (diff > uSimilarity) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }

    gl_FragColor = vec4(color.rgb, color.a * alpha);
}
`;

export const CHROMA_KEY_UNIFORMS = {
  uKeyColor: { value: [0.176, 0.792, 0.098], type: 'vec3<f32>' },
  uSimilarity: { value: 0.0, type: 'f32' },
  uSpill: { value: 0.0, type: 'f32' },
};
