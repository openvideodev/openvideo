// Utility functions executed in the main thread

/**
 * Create a new HTML element
 * @param tagName - Tag name of the element to create
 * @returns Newly created HTML element
 */
export function createEl(tagName: string): HTMLElement {
  return document.createElement(tagName);
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  var binary = '';
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Render text as an image
 * @param text - Text to render
 * @param cssText - CSS styles to apply to the text
 * @returns Rendered image element
 */
export async function renderTxt2Img(
  text: string,
  cssText: string,
  opts: {
    font?: { name: string; url: string };
    onCreated?: (el: HTMLElement) => void;
  } = {}
): Promise<HTMLImageElement> {
  const div = createEl('pre');
  div.style.cssText = `margin: 0; ${cssText}; position: fixed;`;
  div.textContent = text;
  document.body.appendChild(div);
  opts.onCreated?.(div);

  const { width, height } = div.getBoundingClientRect();
  // Calculate rect, immediately remove from DOM
  div.remove();

  const img = new Image();
  img.width = width;
  img.height = height;
  const fontFaceStr =
    opts.font == null
      ? ''
      : `
    @font-face {
      font-family: '${opts.font.name}';
      src: url('data:font/woff2;base64,${arrayBufferToBase64(await (await fetch(opts.font.url)).arrayBuffer())}') format('woff2');
    }
  `;
  const svgStr = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <style>
        ${fontFaceStr}
      </style>
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">${div.outerHTML}</div>
      </foreignObject>
    </svg>
  `
    .replace(/\t/g, '')
    .replace(/#/g, '%23');

  img.src = `data:image/svg+xml;charset=utf-8,${svgStr}`;

  await new Promise((resolve) => {
    img.onload = resolve;
  });
  return img;
}

/**
 * Render text as {@link ImageBitmap} for creating {@link Image}
 * @param text - Text to render
 * @param cssText - CSS styles to apply to the text
 * @param opts - Options
 * @param opts.font - Custom font
 * @param opts.onCreated - Callback after creation
 *
 * // Example:
 * new Image(
 *   await renderTxt2ImgBitmap(
 *     'Watermark',
 *    `font-size:40px; color: white; text-shadow: 2px 2px 6px red; font-family: CustomFont;`,
 *    {
 *      font: {
 *        name: 'CustomFont',
 *        url: '/CustomFont.ttf',
 *      },
 *    },
 *   )
 * )
 */
export async function renderTxt2ImgBitmap(
  text: string,
  cssText: string,
  opts: {
    font?: { name: string; url: string };
    onCreated?: (el: HTMLElement) => void;
  } = {}
): Promise<ImageBitmap> {
  const imgEl = await renderTxt2Img(text, cssText, opts);
  const canvas = new OffscreenCanvas(imgEl.width, imgEl.height);
  const ctx = canvas.getContext('2d');
  ctx?.drawImage(imgEl, 0, 0, imgEl.width, imgEl.height);
  return await createImageBitmap(canvas);
}
