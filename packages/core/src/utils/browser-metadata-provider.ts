import { IMediaMetadata, IMediaMetadataProvider } from '../config';

export class BrowserMetadataProvider implements IMediaMetadataProvider {
  getImageMetadata(src: string): Promise<IMediaMetadata | null> {
    if (typeof window === 'undefined' || typeof Image === 'undefined') {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () =>
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  getVideoMetadata(src: string): Promise<IMediaMetadata | null> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
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
    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
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
}
