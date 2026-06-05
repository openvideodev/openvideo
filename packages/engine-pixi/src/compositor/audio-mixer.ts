import { DEFAULT_AUDIO_CONF } from "../clips";

/**
 * Buffer input data and convert to AudioData with fixed frame count.
 * Matches the WebCodecs audio configuration.
 *
 * @param framesPerChunk Number of audio frames per AudioData instance
 * @param fps The video fps (used for calculating buffer limits)
 */
export function createAudioTrackBuf(framesPerChunk: number, fps: number = 30) {
  const dataSize = framesPerChunk * DEFAULT_AUDIO_CONF.channelCount;
  // Buffer must hold at least one full video frame worth of audio samples
  // (sampleRate / fps * channelCount) plus extra headroom for two audio chunks.
  const samplesPerVideoFrame =
    Math.ceil(DEFAULT_AUDIO_CONF.sampleRate / fps) * DEFAULT_AUDIO_CONF.channelCount;
  const minBufSize = samplesPerVideoFrame + dataSize * 2;

  // PCM data buffer
  const channelBuf = new Float32Array(Math.max(dataSize * 3, minBufSize));
  let writePos = 0;

  let audioTimestamp = 0;
  const chunkDuration = (framesPerChunk / DEFAULT_AUDIO_CONF.sampleRate) * 1e6;

  // Placeholder when audio data is missing
  const placeholderData = new Float32Array(dataSize);

  const getAudioData = (timestamp: number): AudioData[] => {
    let readPos = 0;
    const chunkCount = Math.floor(writePos / dataSize);
    const results: AudioData[] = [];

    // Get data from buffer by specified frame count and construct AudioData
    for (let i = 0; i < chunkCount; i++) {
      results.push(
        new AudioData({
          timestamp: audioTimestamp,
          numberOfChannels: DEFAULT_AUDIO_CONF.channelCount,
          numberOfFrames: framesPerChunk,
          sampleRate: DEFAULT_AUDIO_CONF.sampleRate,
          format: "f32",
          data: channelBuf.subarray(readPos, readPos + dataSize),
        }),
      );
      readPos += dataSize;
      audioTimestamp += chunkDuration;
    }
    channelBuf.set(channelBuf.subarray(readPos, writePos), 0);
    writePos -= readPos;

    // When existing audio data is insufficient, fill with placeholder
    while (timestamp - audioTimestamp > chunkDuration) {
      results.push(
        new AudioData({
          timestamp: audioTimestamp,
          numberOfChannels: DEFAULT_AUDIO_CONF.channelCount,
          numberOfFrames: framesPerChunk,
          sampleRate: DEFAULT_AUDIO_CONF.sampleRate,
          format: "f32",
          data: placeholderData,
        }),
      );
      audioTimestamp += chunkDuration;
    }
    return results;
  };

  return (timestamp: number, trackAudios: Float32Array[][]): AudioData[] => {
    const maxLen =
      trackAudios.length === 0 ? 0 : Math.max(...trackAudios.map((a) => a[0]?.length ?? 0));
    for (let bufIdx = 0; bufIdx < maxLen; bufIdx++) {
      let ch0 = 0;
      let ch1 = 0;
      for (let trackIdx = 0; trackIdx < trackAudios.length; trackIdx++) {
        const c0 = trackAudios[trackIdx][0]?.[bufIdx] ?? 0;
        // If mono PCM, duplicate first channel to second channel
        const c1 = trackAudios[trackIdx][1]?.[bufIdx] ?? c0;
        ch0 += c0;
        ch1 += c1;
      }
      // Mix multiple track audio data and write to buffer
      channelBuf[writePos] = ch0;
      channelBuf[writePos + 1] = ch1;
      writePos += 2;
    }
    // Consume buffer data and generate AudioData
    return getAudioData(timestamp);
  };
}
