// Adapted from https://jameshfisher.com/2020/08/11/production-ready-green-screen-in-the-browser/
const vertexShader = `#version 300 es
  layout (location = 0) in vec4 a_position;
  layout (location = 1) in vec2 a_texCoord;
  out vec2 v_texCoord;
  void main () {
    gl_Position = a_position;
    v_texCoord = a_texCoord;
  }
`;

const fragmentShader = `#version 300 es
precision mediump float;
out vec4 FragColor;
in vec2 v_texCoord;

uniform sampler2D frameTexture;
uniform vec3 keyColor;

// Chroma similarity calculation
uniform float similarity;
// Smoothness calculation for transparency
uniform float smoothness;
// Reduce green screen saturation to improve keying accuracy
uniform float spill;

vec2 RGBtoUV(vec3 rgb) {
  return vec2(
    rgb.r * -0.169 + rgb.g * -0.331 + rgb.b *  0.5    + 0.5,
    rgb.r *  0.5   + rgb.g * -0.419 + rgb.b * -0.081  + 0.5
  );
}

void main() {
  // Get current pixel RGBA value
  vec4 rgba = texture(frameTexture, v_texCoord);
  // Calculate chroma difference between current pixel and key color
  vec2 chromaVec = RGBtoUV(rgba.rgb) - RGBtoUV(keyColor);
  // Calculate chroma distance (vector length) between current pixel and key color, smaller distance means more similar
  float chromaDist = sqrt(dot(chromaVec, chromaVec));
  // Set similarity threshold, negative baseMask indicates green screen, positive indicates not green screen
  float baseMask = chromaDist - similarity;
  // If baseMask is negative, fullMask equals 0; if baseMask is positive, larger value means lower transparency
  float fullMask = pow(clamp(baseMask / smoothness, 0., 1.), 1.5);
  rgba.a = fullMask; // Set transparency
  // If baseMask is negative, spillVal equals 0; if baseMask is positive, smaller value means lower saturation
  float spillVal = pow(clamp(baseMask / spill, 0., 1.), 1.5);
  float desat = clamp(rgba.r * 0.2126 + rgba.g * 0.7152 + rgba.b * 0.0722, 0., 1.); // Calculate current pixel grayscale
  rgba.rgb = mix(vec3(desat, desat, desat), rgba.rgb, spillVal);
  FragColor = rgba;
}
`;

const POINT_POS = [-1, 1, -1, -1, 1, -1, 1, -1, 1, 1, -1, 1];
const TEX_COORD_POS = [0, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1];

// Initialize shader program to tell WebGL how to render our data
function initShaderProgram(
  gl: WebGLRenderingContext,
  vsSource: string,
  fsSource: string
) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource)!;
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource)!;

  // Create shader program
  const shaderProgram = gl.createProgram()!;
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    throw Error(
      gl.getProgramInfoLog(shaderProgram) ??
        'Unable to initialize the shader program'
    );
  }

  return shaderProgram;
}

// Create shader of specified type, upload source code and compile
function loadShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;

  // Send the source to the shader object
  gl.shaderSource(shader, source);

  // Compile the shader program
  gl.compileShader(shader);

  // See if it compiled successfully
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const errMsg = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw Error(errMsg ?? 'An error occurred compiling the shaders');
  }

  return shader;
}

function updateTexture(
  gl: WebGLRenderingContext,
  img: ImgSource,
  texture: WebGLTexture
) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function initTexture(gl: WebGLRenderingContext) {
  const texture = gl.createTexture();
  if (texture == null) throw Error('Create WebGL texture error');
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // put a single pixel in the texture so we can use it immediately.
  const level = 0;
  const internalFormat = gl.RGBA;
  const width = 1;
  const height = 1;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  const pixel = new Uint8Array([0, 0, 255, 255]); // opaque blue
  gl.texImage2D(
    gl.TEXTURE_2D,
    level,
    internalFormat,
    width,
    height,
    border,
    srcFormat,
    srcType,
    pixel
  );

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  return texture;
}

interface IChromakeyOpts {
  keyColor: [number, number, number];
  similarity: number;
  smoothness: number;
  spill: number;
}

function initCanvas(
  opts: {
    width: number;
    height: number;
  } & IChromakeyOpts
) {
  const canvas =
    'document' in globalThis
      ? globalThis.document.createElement('canvas')
      : new OffscreenCanvas(opts.width, opts.height);
  canvas.width = opts.width;
  canvas.height = opts.height;

  const gl = canvas.getContext('webgl2', {
    premultipliedAlpha: false,
    alpha: true,
  }) as WebGL2RenderingContext | null;

  if (gl == null) throw Error('Cant create gl context');

  const shaderProgram = initShaderProgram(gl, vertexShader, fragmentShader);
  gl.useProgram(shaderProgram);

  gl.uniform3fv(
    gl.getUniformLocation(shaderProgram, 'keyColor'),
    opts.keyColor.map((v) => v / 255)
  );
  gl.uniform1f(
    gl.getUniformLocation(shaderProgram, 'similarity'),
    opts.similarity
  );
  gl.uniform1f(
    gl.getUniformLocation(shaderProgram, 'smoothness'),
    opts.smoothness
  );
  gl.uniform1f(gl.getUniformLocation(shaderProgram, 'spill'), opts.spill);

  const posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(POINT_POS), gl.STATIC_DRAW);
  const a_position = gl.getAttribLocation(shaderProgram, 'a_position');
  gl.vertexAttribPointer(
    a_position,
    2,
    gl.FLOAT,
    false,
    Float32Array.BYTES_PER_ELEMENT * 2,
    0
  );
  gl.enableVertexAttribArray(a_position);

  const texCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(TEX_COORD_POS),
    gl.STATIC_DRAW
  );
  const a_texCoord = gl.getAttribLocation(shaderProgram, 'a_texCoord');
  gl.vertexAttribPointer(
    a_texCoord,
    2,
    gl.FLOAT,
    false,
    Float32Array.BYTES_PER_ELEMENT * 2,
    0
  );
  gl.enableVertexAttribArray(a_texCoord);

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

  return { canvas, gl };
}

type ImgSource =
  | HTMLVideoElement
  | HTMLCanvasElement
  | HTMLImageElement
  | ImageBitmap
  | OffscreenCanvas
  | VideoFrame;

function getSourceWH(imgSource: ImgSource) {
  return imgSource instanceof VideoFrame
    ? { width: imgSource.codedWidth, height: imgSource.codedHeight }
    : { width: imgSource.width, height: imgSource.height };
}

function getKeyColor(imgSource: ImgSource) {
  const canvas = new OffscreenCanvas(1, 1);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(imgSource, 0, 0);
  const {
    data: [r, g, b],
  } = ctx.getImageData(0, 0, 1, 1);
  return [r, g, b] as [number, number, number];
}

/**
 * Green screen keying
 * keyColor Background color to remove, if not provided will use first pixel
 * similarity Background color similarity threshold, too small may retain background, too large may remove more non-background pixels
 * smoothness Smoothness; too small may cause jagged edges, too large causes overall transparency
 * spill Saturation; too small may retain green spill, too large causes image to become grayscale
 * @param opts: {
 *   keyColor?: [r, g, b]
 *   similarity: number
 *   smoothness: number
 *   spill: number
 * }
 */
export const createChromakey = (
  opts: Omit<IChromakeyOpts, 'keyColor'> & {
    keyColor?: [number, number, number];
  }
) => {
  let canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
  let gl: WebGLRenderingContext | null = null;
  let keyColor = opts.keyColor;
  let texture: WebGLTexture | null = null;

  return async (imgSource: ImgSource) => {
    if (canvas == null || gl == null || texture == null) {
      if (keyColor == null) keyColor = getKeyColor(imgSource);
      ({ canvas, gl } = initCanvas({
        ...getSourceWH(imgSource),
        keyColor: keyColor,
        ...opts,
      }));
      texture = initTexture(gl);
    }

    updateTexture(gl, imgSource, texture);

    if (
      globalThis.VideoFrame != null &&
      imgSource instanceof globalThis.VideoFrame
    ) {
      const frame = new VideoFrame(canvas, {
        alpha: 'keep',
        timestamp: imgSource.timestamp,
        duration: imgSource.duration ?? undefined,
      });
      imgSource.close();
      return frame;
    }

    return createImageBitmap(canvas, {
      imageOrientation: imgSource instanceof ImageBitmap ? 'flipY' : 'none',
    });
  };
};
