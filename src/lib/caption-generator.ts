import { groupWordsByWidth } from '@/utils/schema-converter';

interface CaptionClipOptions {
  videoWidth: number;
  videoHeight: number;
  words: any[];
  fontSize?: number;
  fontFamily?: string;
  fontUrl?: string;
}

/**
 * Generate caption clips from transcription words
 */
export async function generateCaptionClips(
  options: CaptionClipOptions
): Promise<any[]> {
  const {
    videoWidth,
    videoHeight,
    words,
    fontSize = 80,
    fontFamily = 'Bangers-Regular',
    fontUrl = 'https://fonts.gstatic.com/s/poppins/v15/pxiByp8kv8JHgFVrLCz7V1tvFP-KUEg.ttf',
  } = options;

  const maxCaptionWidth = videoWidth * 0.8;
  const captionChunks = groupWordsByWidth(
    words,
    maxCaptionWidth,
    fontSize,
    fontFamily
  );

  const clips: any[] = [];

  for (const chunk of captionChunks) {
    const chunkFromMs = chunk.from * 1000; // seconds to ms
    const chunkToMs = chunk.to * 1000;
    const chunkDurationMs = chunkToMs - chunkFromMs;

    const fromUs = chunkFromMs * 1000; // ms to μs
    const toUs = chunkToMs * 1000;
    const durationUs = chunkDurationMs * 1000;

    const captionWidth = Math.ceil(chunk.width) + 40; // Add padding
    const captionHeight = Math.ceil(chunk.height) + 20;

    clips.push({
      type: 'Caption',
      src: '',
      display: {
        from: fromUs,
        to: toUs,
      },
      playbackRate: 1,
      duration: durationUs,
      left: (videoWidth - captionWidth) / 2, // Center horizontally
      top: videoHeight - 200, // Position near bottom
      width: captionWidth,
      height: captionHeight,
      angle: 0,
      zIndex: 10,
      opacity: 1,
      flip: null,
      text: chunk.text,
      style: {
        fontSize: fontSize,
        fontFamily: fontFamily,
        fontWeight: '700',
        fontStyle: 'normal',
        color: '#ffffff',
        align: 'center',
        fontUrl: fontUrl,
        stroke: {
          color: '#000000',
          width: 4,
        },
        shadow: {
          color: '#000000',
          alpha: 0.5,
          blur: 4,
          offsetX: 2,
          offsetY: 2,
        },
      },
      caption: {
        words: chunk.words,
        colors: {
          appeared: '#ffffff',
          active: '#ffffff',
          activeFill: '#FF5700',
          background: '',
          keyword: '#ffffff',
        },
        preserveKeywordColor: true,
        positioning: {
          videoWidth: videoWidth,
          videoHeight: videoHeight,
        },
      },
    });
  }

  return clips;
}
