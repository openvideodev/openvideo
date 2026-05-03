import { Injectable, Logger } from '@nestjs/common';
import { IMediaMetadata, IMediaMetadataProvider } from '@openvideo/core';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class NodeMetadataProvider implements IMediaMetadataProvider {
  private readonly logger = new Logger(NodeMetadataProvider.name);

  async getImageMetadata(src: string): Promise<IMediaMetadata | null> {
    try {
      this.logger.log(`Fetching image metadata for: ${src}`);
      // Use ImageMagick 'identify' CLI to get dimensions
      const { stdout } = await execAsync(`identify -format "%w %h" "${src}"`);
      this.logger.log(`identify stdout: ${stdout}`);
      const [widthStr, heightStr] = stdout.trim().split(' ');
      const width = parseInt(widthStr, 10);
      const height = parseInt(heightStr, 10);
      
      if (!isNaN(width) && !isNaN(height)) {
        return { width, height };
      }
      return null;
    } catch (error) {
      this.logger.error(`Failed to get image metadata via ImageMagick for ${src}: ${error.message}`);
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
          `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${src}"`
        );
        const [wStr, hStr] = dimOutput.trim().split('x');
        width = parseInt(wStr, 10);
        height = parseInt(hStr, 10);
      } catch (dimError) {
        this.logger.warn(`Could not extract video dimensions for ${src}: ${dimError.message}`);
      }

      // Get duration using ffprobe
      let duration: number | undefined;
      try {
        const { stdout: durOutput } = await execAsync(
          `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${src}"`
        );
        const durationSecs = parseFloat(durOutput.trim());
        if (!isNaN(durationSecs)) {
          duration = Math.floor(durationSecs * 1_000_000); // Convert to microseconds
        }
      } catch (durError) {
        this.logger.warn(`Could not extract video duration for ${src}: ${durError.message}`);
      }

      if (width !== undefined || height !== undefined || duration !== undefined) {
        return { width: isNaN(width!) ? undefined : width, height: isNaN(height!) ? undefined : height, duration };
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
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${src}"`
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
}
