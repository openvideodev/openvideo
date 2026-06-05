import { Color, Filter, GlProgram, GpuProgram, UniformGroup } from "pixi.js";

// Inline shader code to avoid build issues with unknown module types
const fragment = `precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uThickness;
uniform vec3 uBorderColor;

uniform vec4 uInputClamp;
uniform vec4 uInputSize;

const float PI = 3.14159265359;

float getOutlineAlpha(vec2 pos) {
    vec2 thickness = vec2(uThickness) / uInputSize.xy;
    float maxAlpha = 0.0;

    // Sample 16 directions for smoother outline
    for (int i = 0; i < 16; i++) {
        float angle = float(i) * (PI * 0.125);
        vec2 offset = thickness * vec2(cos(angle), sin(angle));
        vec4 sample = texture(uTexture, clamp(pos + offset, uInputClamp.xy, uInputClamp.zw));
        maxAlpha = max(maxAlpha, sample.a);
    }

    return maxAlpha;
}

void main(void) {
    vec4 content = texture(uTexture, vTextureCoord);
    float outlineAlpha = getOutlineAlpha(vTextureCoord) * (1.0 - content.a);
    vec4 outline = vec4(uBorderColor * outlineAlpha, outlineAlpha);
    finalColor = content + outline;
}
`;

const vertex = `in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;
vec4 filterVertexPosition( void ) {
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
    return vec4(position, 0.0, 1.0);
}
vec2 filterTextureCoord( void ) {
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}
void main(void) {
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`;

const source = `struct GlobalFilterUniforms {
  uInputSize:vec4<f32>,
  uInputPixel:vec4<f32>,
  uInputClamp:vec4<f32>,
  uOutputFrame:vec4<f32>,
  uGlobalFrame:vec4<f32>,
  uOutputTexture:vec4<f32>,
};

struct OutlineUniforms {
  uThickness:f32,
  uBorderColor:vec3<f32>,
};

@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler : sampler;

@group(1) @binding(0) var<uniform> outlineUniforms : OutlineUniforms;

struct VSOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv : vec2<f32>,
};

fn filterVertexPosition(aPosition:vec2<f32>) -> vec4<f32>
{
    var position = aPosition * gfu.uOutputFrame.zw + gfu.uOutputFrame.xy;
    position.x = position.x * (2.0 / gfu.uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*gfu.uOutputTexture.z / gfu.uOutputTexture.y) - gfu.uOutputTexture.z;
    return vec4(position, 0.0, 1.0);
}

fn filterTextureCoord(aPosition:vec2<f32>) -> vec2<f32>
{
  return aPosition * (gfu.uOutputFrame.zw * gfu.uInputSize.zw);
}

@vertex
fn mainVertex(@location(0) aPosition: vec2<f32>) -> VSOutput {
  return VSOutput(filterVertexPosition(aPosition), filterTextureCoord(aPosition));
}

const PI: f32 = 3.14159265359;

fn getOutlineAlpha(pos: vec2<f32>) -> f32 {
    let thickness = vec2<f32>(outlineUniforms.uThickness) / gfu.uInputSize.xy;
    var maxAlpha: f32 = 0.0;

    // Sample 16 directions for smoother outline
    for (var i: i32 = 0; i < 16; i++) {
        let angle = f32(i) * (PI * 0.125);
        let offset = thickness * vec2<f32>(cos(angle), sin(angle));
        let sample = textureSample(uTexture, uSampler, clamp(pos + offset, gfu.uInputClamp.xy, gfu.uInputClamp.zw));
        maxAlpha = max(maxAlpha, sample.a);
    }

    return maxAlpha;
}

@fragment
fn mainFragment(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
    let content = textureSample(uTexture, uSampler, uv);
    let outlineAlpha = getOutlineAlpha(uv) * (1.0 - content.a);
    let outline = vec4<f32>(outlineUniforms.uBorderColor * outlineAlpha, outlineAlpha);
    return content + outline;
}
`;

const defaultOptions = {
  thickness: 1,
  borderColor: 0x000000,
};

/**
 * OutlineFilter creates outline/stroke effects for text.
 * Replaces default PixiJS stroke option with a custom shader implementation.
 *
 * @example
 * ```js
 * import { OutlineFilter } from './outline-filter';
 *
 * const outlineFilter = new OutlineFilter({
 *   thickness: 2.0,
 *   borderColor: 0x000000
 * });
 * text.filters = [outlineFilter];
 * ```
 */
export class OutlineFilter extends Filter {
  constructor(options: { thickness?: number; borderColor?: number }) {
    const { thickness, borderColor } = {
      ...defaultOptions,
      ...options,
    };

    const gpuProgram = GpuProgram.from({
      vertex: {
        source,
        entryPoint: "mainVertex",
      },
      fragment: {
        source,
        entryPoint: "mainFragment",
      },
    });

    const glProgram = GlProgram.from({
      vertex,
      fragment,
      name: "outline-filter",
    });

    super({
      gpuProgram,
      glProgram,
      padding: thickness * 2.1,
      resources: {
        outlineUniforms: new UniformGroup({
          uThickness: { value: thickness, type: "f32" },
          uBorderColor: { value: new Color(borderColor), type: "vec3<f32>" },
        }),
      },
    });
  }

  /**
   * The thickness of the outline effect.
   * @default 2.0
   */
  get thickness() {
    const uniforms = this.resources.outlineUniforms.uniforms;

    return uniforms.uThickness;
  }

  set thickness(value) {
    const uniforms = this.resources.outlineUniforms.uniforms;

    uniforms.uThickness = value;
  }
}
