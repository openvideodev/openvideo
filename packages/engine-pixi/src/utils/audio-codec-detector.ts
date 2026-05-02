/**
 * Audio codec detection utility
 * Detects the best supported audio codec based on browser capabilities
 */

export interface AudioCodecConfig {
  codec: string;
  codecType: 'aac' | 'opus'; // Simplified type for recodemux
  sampleRate: number;
  channelCount: number;
}

/**
 * Preferred codec configurations in order of preference
 */
const CODEC_PREFERENCES = [
  {
    codec: 'mp4a.40.2', // AAC-LC
    codecType: 'aac' as const,
    sampleRate: 48000,
    channelCount: 2,
  },
  {
    codec: 'opus',
    codecType: 'opus' as const,
    sampleRate: 48000,
    channelCount: 2,
  },
] as const;

let cachedCodec: AudioCodecConfig | null = null;

/**
 * Detect operating system
 */
function detectOS(): 'linux' | 'macos' | 'windows' | 'unknown' {
  if (typeof navigator === 'undefined') return 'unknown';

  const userAgent = navigator.userAgent.toLowerCase();

  if (userAgent.includes('linux')) return 'linux';
  if (userAgent.includes('mac')) return 'macos';
  if (userAgent.includes('win')) return 'windows';

  return 'unknown';
}

/**
 * Test if a specific audio codec configuration is supported
 */
async function isCodecSupported(config: AudioCodecConfig): Promise<boolean> {
  if (typeof AudioEncoder === 'undefined') {
    return false;
  }

  try {
    const result = await AudioEncoder.isConfigSupported({
      codec: config.codec,
      sampleRate: config.sampleRate,
      numberOfChannels: config.channelCount,
    });
    return result.supported ?? false;
  } catch (error) {
    return false;
  }
}

/**
 * Get the default audio codec configuration based on browser support
 * Prefers AAC (mp4a.40.2) but falls back to Opus if not supported
 *
 * @returns Promise resolving to the best supported audio codec configuration
 */
export async function getDefaultAudioCodec(): Promise<AudioCodecConfig> {
  // Return cached result if available
  if (cachedCodec !== null) {
    return cachedCodec;
  }

  const os = detectOS();

  // Test codecs in order of preference
  for (const config of CODEC_PREFERENCES) {
    const supported = await isCodecSupported(config);

    if (supported) {
      cachedCodec = { ...config };
      console.log(`[AudioCodec] Selected ${config.codec} for ${os}`);
      return cachedCodec;
    }
  }

  // Fallback to Opus if nothing else works (should never happen)
  const fallback = {
    codec: 'opus',
    codecType: 'opus' as const,
    sampleRate: 48000,
    channelCount: 2,
  };

  console.warn('[AudioCodec] No supported codec found, falling back to Opus');
  cachedCodec = fallback;
  return fallback;
}

/**
 * Synchronously get the cached codec configuration
 * Returns null if detection hasn't been performed yet
 *
 * @returns The cached audio codec configuration or null
 */
export function getCachedAudioCodec(): AudioCodecConfig | null {
  return cachedCodec;
}

/**
 * Reset the cached codec (useful for testing)
 */
export function resetCodecCache(): void {
  cachedCodec = null;
}
