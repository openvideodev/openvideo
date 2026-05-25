import { IMediaMetadata, IMediaMetadataProvider } from "../config";

export class BrowserMetadataProvider implements IMediaMetadataProvider {
  getImageMetadata(src: string): Promise<IMediaMetadata | null> {
    if (typeof window === "undefined" || typeof Image === "undefined") {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  getVideoMetadata(src: string): Promise<IMediaMetadata | null> {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        resolve({
          width: video.videoWidth,
          height: video.videoHeight,
          duration: Math.floor(video.duration * 1_000_000),
        });
      };
      video.onerror = () => resolve(null);
      video.src = src;
    });
  }

  getAudioMetadata(src: string): Promise<IMediaMetadata | null> {
    if (typeof window === "undefined" || typeof Audio === "undefined") {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      const audio = new Audio();
      audio.onloadedmetadata = () => {
        resolve({
          duration: Math.floor(audio.duration * 1_000_000),
        });
      };
      audio.onerror = () => resolve(null);
      audio.src = src;
    });
  }

  async getTextMetadata(clip: any): Promise<IMediaMetadata | null> {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return null;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const style = clip.style || {};
    const hasFontFamily = !!style.fontFamily;
    const fontSize = style.fontSize || (hasFontFamily ? 80 : 120);
    // Use postScriptName as fontFamily for uniqueness as requested
    const fontFamily = hasFontFamily ? style.fontFamily : "Roboto-Bold";
    const fontUrl =
      style.fontUrl || "https://fonts.gstatic.com/s/roboto/v29/KFOlCnqEu92Fr1MmWUlvAx05IsDqlA.ttf";
    const text = clip.text || "Add Text";
    const wordWrapWidth = style.wordWrapWidth || 600;

    // Dynamically load the font in the browser if URL is provided
    if (fontUrl && typeof FontFace !== "undefined") {
      try {
        // Check if already loaded to avoid redundant network requests
        const isLoaded = document.fonts.check(`${fontSize}px "${fontFamily}"`);
        if (!isLoaded) {
          const font = new FontFace(fontFamily, `url(${fontUrl})`);
          await font.load();
          (document.fonts as any).add(font);
        }
      } catch (err) {
        console.warn(`Failed to load font ${fontFamily} for measurement`, err);
      }
    }

    ctx.font = `${fontSize}px "${fontFamily}"`;

    // Simple multi-line measurement
    const words = text.split(" ");
    let line = "";
    let lineCount = 1;
    let maxWidth = 0;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > wordWrapWidth && n > 0) {
        line = words[n] + " ";
        lineCount++;
      } else {
        line = testLine;
        maxWidth = Math.max(maxWidth, testWidth);
      }
    }

    const height = lineCount * fontSize * 1.2;
    const width = style.wordWrap ? wordWrapWidth : maxWidth;

    return { width, height, fontSize, fontFamily, fontUrl };
  }
}
