import { Injectable, Logger } from "@nestjs/common";
import type { IMediaMetadata, IMediaMetadataProvider } from "@openvideo/core";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

@Injectable()
export class NodeMetadataProvider implements IMediaMetadataProvider {
  private readonly logger = new Logger(NodeMetadataProvider.name);
  private static registeredFonts = new Set<string>();

  async getImageMetadata(src: string): Promise<IMediaMetadata | null> {
    try {
      this.logger.log(`Fetching image metadata for: ${src}`);
      // Use ImageMagick 'identify' CLI to get dimensions
      const { stdout } = await execAsync(`identify -format "%w %h" "${src}"`);
      this.logger.log(`identify stdout: ${stdout}`);
      const [widthStr, heightStr] = stdout.trim().split(" ");
      const width = parseInt(widthStr, 10);
      const height = parseInt(heightStr, 10);

      if (!isNaN(width) && !isNaN(height)) {
        return { width, height };
      }
      return null;
    } catch (error) {
      this.logger.error(
        `Failed to get image metadata via ImageMagick for ${src}: ${error.message}`,
      );
      return null;
    }
  }

  async getVideoMetadata(src: string): Promise<IMediaMetadata | null> {
    try {
      // Get dimensions using ffprobe
      let width: number | undefined;
      let height: number | undefined;
      try {
        const { stdout: dimOutput } = await execAsync(
          `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${src}"`,
        );
        const [wStr, hStr] = dimOutput.trim().split("x");
        width = parseInt(wStr, 10);
        height = parseInt(hStr, 10);
      } catch (dimError) {
        this.logger.warn(`Could not extract video dimensions for ${src}: ${dimError.message}`);
      }

      // Get duration using ffprobe
      let duration: number | undefined;
      try {
        const { stdout: durOutput } = await execAsync(
          `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${src}"`,
        );
        const durationSecs = parseFloat(durOutput.trim());
        if (!isNaN(durationSecs)) {
          duration = Math.floor(durationSecs * 1_000_000); // Convert to microseconds
        }
      } catch (durError) {
        this.logger.warn(`Could not extract video duration for ${src}: ${durError.message}`);
      }

      if (width !== undefined || height !== undefined || duration !== undefined) {
        return {
          width: isNaN(width!) ? undefined : width,
          height: isNaN(height!) ? undefined : height,
          duration,
        };
      }
      return null;
    } catch (error) {
      this.logger.error(`Failed to get video metadata via ffprobe for ${src}: ${error.message}`);
      return null;
    }
  }

  async getAudioMetadata(src: string): Promise<IMediaMetadata | null> {
    try {
      // Get duration using ffprobe
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${src}"`,
      );
      const durationSecs = parseFloat(stdout.trim());

      if (!isNaN(durationSecs)) {
        return { duration: Math.floor(durationSecs * 1_000_000) }; // Convert to microseconds
      }
      return null;
    } catch (error) {
      this.logger.error(`Failed to get audio metadata via ffprobe for ${src}: ${error.message}`);
      return null;
    }
  }

  async getTextMetadata(clip: any): Promise<IMediaMetadata | null> {
    try {
      const { createCanvas, registerFont } = require("canvas");
      const fs = require("fs");
      const path = require("path");
      const os = require("os");
      const https = require("https");

      const style = clip.style || {};
      const hasFontFamily = !!style.fontFamily;
      const fontSize = style.fontSize || (hasFontFamily ? 80 : 120);
      // Use postScriptName as fontFamily for uniqueness as requested
      const fontFamily = hasFontFamily ? style.fontFamily : "Roboto-Bold";
      const fontUrl =
        style.fontUrl ||
        "https://fonts.gstatic.com/s/roboto/v29/KFOlCnqEu92Fr1MmWUlvAx05IsDqlA.ttf";
      const text = clip.text || "Add Text";
      const wordWrapWidth = style.wordWrapWidth || 600;

      // Use the static property for caching
      if (fontUrl && !NodeMetadataProvider.registeredFonts.has(fontFamily)) {
        try {
          this.logger.log(`Downloading font ${fontFamily} from ${fontUrl}`);
          const tempPath = path.join(
            os.tmpdir(),
            `${fontFamily.replace(/[^a-zA-Z0-9]/g, "_")}.ttf`,
          );

          if (!fs.existsSync(tempPath)) {
            await new Promise((resolve, reject) => {
              const file = fs.createWriteStream(tempPath);
              https
                .get(fontUrl, (response: any) => {
                  if (response.statusCode !== 200) {
                    return reject(
                      new Error(`Failed to download font: HTTP ${response.statusCode}`),
                    );
                  }
                  response.pipe(file);
                  file.on("finish", () => {
                    file.close(resolve);
                  });
                })
                .on("error", (err: any) => {
                  fs.unlink(tempPath, () => {});
                  reject(err);
                });
            });
          }

          registerFont(tempPath, { family: fontFamily });
          NodeMetadataProvider.registeredFonts.add(fontFamily);
          this.logger.log(`Successfully registered font ${fontFamily}`);
        } catch (fontError) {
          this.logger.error(`Failed to download/register font ${fontFamily}: ${fontError.message}`);
        }
      }

      const canvas = createCanvas(1, 1);
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

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

      const width = style.wordWrap ? wordWrapWidth : maxWidth;
      const height = lineCount * fontSize * 1.2;
      console.log({
        width,
        height,
        fontSize,
        fontFamily,
        fontUrl,
      });
      return { width, height, fontSize, fontFamily, fontUrl };
    } catch (error) {
      this.logger.error(`Failed to get text metadata via node-canvas: ${error.message}`);
      return null;
    }
  }
}
