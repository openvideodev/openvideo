// Audio utility functions that can run in both worker and main threads

import * as waveResampler from 'wave-resampler';

/**
 * Concatenate multiple Float32Arrays, commonly used for merging PCM data
 */
export function concatFloat32Array(buffers: Float32Array[]): Float32Array {
  const result = new Float32Array(
    buffers.map((buf) => buf.length).reduce((a, b) => a + b)
  );

  let offset = 0;
  for (const buf of buffers) {
    result.set(buf, offset);
    offset += buf.length;
  }

  return result;
}

/**
 * Merge small PCM fragments into a large fragment
 * @param fragments Small PCM fragments, where each element is raw PCM data from different channels
 */
export function concatPCMFragments(
  fragments: Float32Array[][]
): Float32Array[] {
  // fragments: [[chan0, chan1], [chan0, chan1]...]
  // chanListPCM: [[chan0, chan0...], [chan1, chan1...]]
  const chanListPCM: Float32Array[][] = [];
  for (let i = 0; i < fragments.length; i += 1) {
    for (let j = 0; j < fragments[i].length; j += 1) {
      if (chanListPCM[j] == null) chanListPCM[j] = [];
      chanListPCM[j].push(fragments[i][j]);
    }
  }
  // [bigChan0, bigChan1]
  return chanListPCM.map(concatFloat32Array);
}

/**
 * Utility function to extract PCM data from AudioData
 */
export function extractPCM4AudioData(audioData: AudioData): Float32Array[] {
  if (audioData.format === 'f32-planar') {
    const result = [];
    for (let idx = 0; idx < audioData.numberOfChannels; idx += 1) {
      const chanBufSize = audioData.allocationSize({ planeIndex: idx });
      const chanBuf = new ArrayBuffer(chanBufSize);
      audioData.copyTo(chanBuf, { planeIndex: idx });
      result.push(new Float32Array(chanBuf));
    }
    return result;
  } else if (audioData.format === 'f32') {
    const buf = new ArrayBuffer(audioData.allocationSize({ planeIndex: 0 }));
    audioData.copyTo(buf, { planeIndex: 0 });
    return convertF32ToPlanar(
      new Float32Array(buf),
      audioData.numberOfChannels
    );
  } else if (audioData.format === 's16') {
    const buf = new ArrayBuffer(audioData.allocationSize({ planeIndex: 0 }));
    audioData.copyTo(buf, { planeIndex: 0 });
    return convertS16ToF32Planar(
      new Int16Array(buf),
      audioData.numberOfChannels
    );
  }
  throw Error('Unsupported audio data format');
}

/**
 * Convert s16 PCM to f32-planar
 * @param  pcmS16Data - The s16 PCM data.
 * @param  numChannels - Number of audio channels.
 * @returns An array of Float32Array, each containing the audio data for one channel.
 */
function convertS16ToF32Planar(pcmS16Data: Int16Array, numChannels: number) {
  const numSamples = pcmS16Data.length / numChannels;
  const planarData = Array.from(
    { length: numChannels },
    () => new Float32Array(numSamples)
  );

  for (let i = 0; i < numSamples; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = pcmS16Data[i * numChannels + channel];
      planarData[channel][i] = sample / 32768; // Normalize to range [-1.0, 1.0]
    }
  }

  return planarData;
}

function convertF32ToPlanar(pcmF32Data: Float32Array, numChannels: number) {
  const numSamples = pcmF32Data.length / numChannels;
  const planarData = Array.from(
    { length: numChannels },
    () => new Float32Array(numSamples)
  );

  for (let i = 0; i < numSamples; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      planarData[channel][i] = pcmF32Data[i * numChannels + channel];
    }
  }

  return planarData;
}

/**
 * Extract PCM from AudioBuffer
 */
export function extractPCM4AudioBuffer(
  audioBuffer: AudioBuffer
): Float32Array[] {
  return Array(audioBuffer.numberOfChannels)
    .fill(0)
    .map((_, idx) => {
      return audioBuffer.getChannelData(idx);
    });
}

/**
 * Adjust audio data volume
 * @param audioData - Audio object to adjust
 * @param volume - Volume adjustment coefficient (0.0 - 1.0)
 * @returns New audio data with adjusted volume
 */
export function adjustAudioDataVolume(audioData: AudioData, volume: number) {
  const data = new Float32Array(
    concatFloat32Array(extractPCM4AudioData(audioData))
  ).map((v) => v * volume);
  const newAudioData = new AudioData({
    sampleRate: audioData.sampleRate,
    numberOfChannels: audioData.numberOfChannels,
    timestamp: audioData.timestamp,
    format: audioData.format!,
    numberOfFrames: audioData.numberOfFrames,
    data,
  });
  audioData.close();
  return newAudioData;
}

/**
 * Mix PCM data from dual-channel audio tracks and interleave multiple channels into a single Float32Array output
 * @param audios - A 2D array where each element is a Float32Array array representing PCM data from an audio stream.
 * The first element of each Float32Array array is left channel data, and the second element (if present) is right channel data.
 * If only left channel data exists, the right channel will reuse the left channel data.
 *
 * @returns Returns a Float32Array with left and right channels interleaved.
 *
 * @example
 *
 * const audios = [
 *   [new Float32Array([0.1, 0.2, 0.3]), new Float32Array([0.4, 0.5, 0.6])],
 *   [new Float32Array([0.7, 0.8, 0.9])],
 * ];
 * const mixed = mixinPCM(audios);
 */
export function mixinPCM(audios: Float32Array[][]): Float32Array {
  const maxLen = Math.max(...audios.map((a) => a[0]?.length ?? 0));
  const data = new Float32Array(maxLen * 2);

  for (let bufIdx = 0; bufIdx < maxLen; bufIdx++) {
    let ch0 = 0;
    let ch1 = 0;
    for (let trackIdx = 0; trackIdx < audios.length; trackIdx++) {
      const c0 = audios[trackIdx][0]?.[bufIdx] ?? 0;
      // If mono PCM, duplicate first channel to second channel
      const c1 = audios[trackIdx][1]?.[bufIdx] ?? c0;
      ch0 += c0;
      ch1 += c1;
    }
    data[bufIdx] = ch0;
    data[bufIdx + maxLen] = ch1;
  }

  return data;
}

/**
 * Resample PCM audio data.
 *
 * @param pcmData - A Float32Array array where each element represents PCM data from one channel.
 * @param curRate - Current sample rate.
 * @param target - Target parameters object.
 * @param target.rate - Target sample rate.
 * @param target.chanCount - Target channel count.
 *
 * @returns Returns a Promise that resolves to a Float32Array array where each element represents PCM data from one channel after resampling.
 *
 * @example
 *
 * const pcmData = [new Float32Array([0.1, 0.2, 0.3]), new Float32Array([0.4, 0.5, 0.6])];
 * const curRate = 44100;
 * const target = { rate: 48000, chanCount: 2 };
 * const resampled = await audioResample(pcmData, curRate, target);
 */
export async function audioResample(
  pcmData: Float32Array[],
  curRate: number,
  target: {
    rate: number;
    chanCount: number;
  }
): Promise<Float32Array[]> {
  const chanCount = pcmData.length;
  const emptyPCM = Array(target.chanCount)
    .fill(0)
    .map(() => new Float32Array(0));
  if (chanCount === 0) return emptyPCM;

  const len = Math.max(...pcmData.map((c) => c.length));
  if (len === 0) return emptyPCM;

  // The Worker scope does not have access to OfflineAudioContext
  if (globalThis.OfflineAudioContext == null) {
    return pcmData.map(
      (p) =>
        new Float32Array(
          waveResampler.resample(p, curRate, target.rate, {
            method: 'sinc',
            LPF: false,
          })
        )
    );
  }

  const ctx = new globalThis.OfflineAudioContext(
    target.chanCount,
    (len * target.rate) / curRate,
    target.rate
  );
  const abSource = ctx.createBufferSource();
  const ab = ctx.createBuffer(chanCount, len, curRate);
  // Create new Float32Array to ensure ArrayBuffer (not SharedArrayBuffer) backing
  pcmData.forEach((d, idx) => ab.copyToChannel(new Float32Array(d), idx));

  abSource.buffer = ab;
  abSource.connect(ctx.destination);
  abSource.start();

  return extractPCM4AudioBuffer(await ctx.startRendering());
}

/**
 * Extract a circular slice from the given Float32Array, looping from 0 when exceeding boundaries
 *
 * Mainly used for slicing PCM data to implement looped playback
 *
 * @param data - Input Float32Array.
 * @param start - Start index of the slice.
 * @param end - End index of the slice.
 * @returns Returns a new Float32Array containing data from start to end.
 *
 * @example
 * const data = new Float32Array([0, 1, 2, 3, 4, 5]);
 * ringSliceFloat32Array(data, 4, 6); // => Float32Array [4, 5, 0]
 */
export function ringSliceFloat32Array(
  data: Float32Array,
  start: number,
  end: number
): Float32Array {
  const count = end - start;
  const result = new Float32Array(count);
  let i = 0;
  while (i < count) {
    result[i] = data[(start + i) % data.length];
    i += 1;
  }
  return result;
}

/**
 * Change PCM data playback rate, where 1 means normal playback, 0.5 means half speed, and 2 means double speed
 */
export function changePCMPlaybackRate(
  pcmData: Float32Array,
  playbackRate: number
) {
  // Calculate new length
  const newLength = Math.floor(pcmData.length / playbackRate);
  const newPcmData = new Float32Array(newLength);

  // Linear interpolation
  for (let i = 0; i < newLength; i++) {
    // Position in original data
    const originalIndex = i * playbackRate;
    const intIndex = Math.floor(originalIndex);
    const frac = originalIndex - intIndex;

    // Boundary check
    if (intIndex + 1 < pcmData.length) {
      newPcmData[i] =
        pcmData[intIndex] * (1 - frac) + pcmData[intIndex + 1] * frac;
    } else {
      newPcmData[i] = pcmData[intIndex]; // Last sample
    }
  }

  return newPcmData;
}
