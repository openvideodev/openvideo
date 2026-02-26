import { mp4box, MP4File, MP4Sample, SampleOpts, TrakBoxParser } from 'wrapbox';
import { tmpfile, write } from 'opfs-tools';
import { DEFAULT_AUDIO_CONF } from '../clips';
import { autoReadStream } from '../utils/stream-utils';
import { Log } from '../utils/log';
import {
  concatPCMFragments,
  extractPCM4AudioBuffer,
  extractPCM4AudioData,
  mixinPCM,
  ringSliceFloat32Array,
} from '../utils';
import { extractFileConfig } from './mp4box-utils';
import { SampleTransform } from './sample-transform';

function fixMP4BoxFileDuration(
  inMP4File: MP4File
): () => Promise<ReadableStream<Uint8Array> | null> {
  let sentBoxIdx = 0;
  const boxes = inMP4File.boxes;
  const tracks: Array<{ track: TrakBoxParser; id: number }> = [];
  let totalDuration = 0;

  async function write2TmpFile() {
    const buf = box2Buf(boxes, sentBoxIdx);
    sentBoxIdx = boxes.length;
    // Release references to avoid memory leaks
    // todo: use unsafeReleaseMP4BoxFile
    tracks.forEach(({ track, id }) => {
      const s = track.samples.at(-1);
      if (s != null)
        totalDuration = Math.max(totalDuration, s.cts + s.duration);

      inMP4File.releaseUsedSamples(id, track.samples.length);
      track.samples = [];
    });
    inMP4File.mdats = [];
    inMP4File.moofs = [];
    if (buf != null) await tmpFileWriter?.write(buf);
  }

  let moovPrevBoxes: typeof boxes = [];
  function moovBoxReady() {
    if (moovPrevBoxes.length > 0) return true;

    const moovIdx = boxes.findIndex((box: any) => box.type === 'moov');
    if (moovIdx === -1) return false;

    moovPrevBoxes = boxes.slice(0, moovIdx + 1);
    sentBoxIdx = moovIdx + 1;

    if (tracks.length === 0) {
      for (let i = 1; true; i += 1) {
        const track = inMP4File.getTrackById(i);
        if (track == null) break;
        tracks.push({ track, id: i });
      }
    }

    return true;
  }

  let timerId = 0;
  // Write boxes other than moov to temp file first, then concatenate temp file after updating duration
  const postFile = tmpfile();
  let tmpFileWriter: Awaited<
    ReturnType<ReturnType<typeof tmpfile>['createWriter']>
  > | null = null;

  const initPromise = (async () => {
    tmpFileWriter = await postFile.createWriter();

    timerId = self.setInterval(() => {
      if (!moovBoxReady()) return;
      write2TmpFile();
    }, 100);
  })();

  let stopped = false;
  return async () => {
    if (stopped) throw Error('File exported');
    stopped = true;

    await initPromise;
    clearInterval(timerId);

    if (!moovBoxReady() || tmpFileWriter == null) return null;
    inMP4File.flush();
    await write2TmpFile();
    await tmpFileWriter?.close();

    const moov = moovPrevBoxes.find((box: any) => box.type === 'moov') as any;
    if (moov == null) return null;

    moov.mvhd.duration = totalDuration;

    const resultFile = tmpfile();
    const buf = box2Buf(moovPrevBoxes, 0)!;
    await write(resultFile, buf.slice());
    await write(resultFile, postFile, { overwrite: false });

    return await resultFile.stream();
  };

  function box2Buf(
    source: typeof boxes,
    startIdx: number
  ): Uint8Array<ArrayBuffer> | null {
    if (startIdx >= source.length) return null;

    const ds = new mp4box.DataStream();

    for (let i = startIdx; i < source.length; i++) {
      if (source[i] === null) continue;
      source[i].write(ds);
      delete source[i];
    }
    return new Uint8Array(ds.buffer).slice() as Uint8Array<ArrayBuffer>;
  }
}

/**
 * Convert EncodedAudioChunk | EncodedVideoChunk to parameters required by MP4 addSample
 */
function chunk2MP4SampleOpts(
  chunk: EncodedAudioChunk | EncodedVideoChunk
): SampleOpts & {
  data: ArrayBuffer;
} {
  const buf = new ArrayBuffer(chunk.byteLength);
  chunk.copyTo(buf);
  const dts = chunk.timestamp;
  return {
    duration: chunk.duration ?? 0,
    dts,
    cts: dts,
    is_sync: chunk.type === 'key',
    data: buf,
  };
}

/**
 * Quick concatenate multiple MP4 file streams, requires all MP4s to have consistent properties,
 * properties include (but not limited to): audio/video codec format, resolution, sample rate
 *
 * @param streams An array of readable streams containing Uint8Array.
 * @returns Returns a Promise that resolves to a readable stream containing merged MP4 data.
 * @throws Will throw error if unable to generate file from streams.
 *
 * @example
 * const streams = [stream1, stream2, stream3];
 * const resultStream = await fastConcatMP4(streams);
 */
export async function fastConcatMP4(
  streams: ReadableStream<Uint8Array>[]
): Promise<ReadableStream<Uint8Array>> {
  const outfile = mp4box.createFile() as unknown as MP4File;

  const dumpFile = fixMP4BoxFileDuration(outfile);
  await concatStreamsToMP4BoxFile(streams, outfile);
  const outStream = await dumpFile();
  if (outStream == null) throw Error('Can not generate file from streams');
  return outStream;
}

async function concatStreamsToMP4BoxFile(
  streams: ReadableStream<Uint8Array>[],
  outfile: MP4File
) {
  let vTrackId = 0;
  let vDTS = 0;
  let vCTS = 0;
  let aTrackId = 0;
  let aDTS = 0;
  let aCTS = 0;
  // ts bug, cannot correctly identify type
  let lastVSamp: any = null;
  let lastASamp: any = null;
  for (const stream of streams) {
    // Reset first sample timestamps for each stream to enable normalization
    let firstVDTS: number | null = null;
    let firstVCTS: number | null = null;
    let firstADTS: number | null = null;
    let firstACTS: number | null = null;

    await new Promise<void>(async (resolve) => {
      autoReadStream(stream.pipeThrough(new SampleTransform()), {
        onDone: resolve,
        onChunk: async ({ chunkType, data }) => {
          if (chunkType === 'ready') {
            const { videoTrackConf, audioTrackConf } = extractFileConfig(
              data.file,
              data.info
            );
            if (vTrackId === 0 && videoTrackConf != null) {
              vTrackId = outfile.addTrack(videoTrackConf);
            }
            if (aTrackId === 0 && audioTrackConf != null) {
              aTrackId = outfile.addTrack(audioTrackConf);
            }
          } else if (chunkType === 'samples') {
            const { type, samples } = data;
            const trackId = type === 'video' ? vTrackId : aTrackId;
            const offsetDTS = type === 'video' ? vDTS : aDTS;
            const offsetCTS = type === 'video' ? vCTS : aCTS;

            samples.forEach((s) => {
              let normalizedDTS: number;
              let normalizedCTS: number;

              if (type === 'video') {
                // Capture first sample timestamps for normalization
                if (firstVDTS === null) {
                  firstVDTS = s.dts;
                  firstVCTS = s.cts;
                }
                // Normalize to start from 0, then add offset
                normalizedDTS = s.dts - firstVDTS!;
                normalizedCTS = s.cts - (firstVCTS ?? 0);
              } else {
                // Same for audio
                if (firstADTS === null) {
                  firstADTS = s.dts;
                  firstACTS = s.cts;
                }
                normalizedDTS = s.dts - firstADTS!;
                normalizedCTS = s.cts - (firstACTS ?? 0);
              }

              outfile.addSample(trackId, new Uint8Array(s.data), {
                duration: s.duration,
                dts: normalizedDTS + offsetDTS,
                cts: normalizedCTS + offsetCTS,
                is_sync: s.is_sync,
              });
            });

            const lastSamp = samples.at(-1);
            if (lastSamp == null) return;
            if (type === 'video') {
              lastVSamp = lastSamp;
            } else if (type === 'audio') {
              lastASamp = lastSamp;
            }
          }
        },
      });
    });
    // Calculate offsets based on normalized timestamps
    if (lastVSamp != null && firstVDTS !== null && firstVCTS !== null) {
      // Duration of this normalized stream
      const normalizedVDTS = lastVSamp.dts - firstVDTS + lastVSamp.duration;
      const normalizedVCTS = lastVSamp.cts - firstVCTS + lastVSamp.duration;
      vDTS += normalizedVDTS;
      vCTS += normalizedVCTS;
    }
    // Coerce audio timing to match video timing by converting video timescale to audio timescale
    if (lastASamp != null && lastVSamp != null) {
      const videoToAudioRatio = lastASamp.timescale / lastVSamp.timescale;
      aDTS = Math.round(vDTS * videoToAudioRatio);
      aCTS = Math.round(vCTS * videoToAudioRatio);
    }
  }
}

/**
 * Set correct duration value for fMP4 files generated
 */
export async function fixFMP4Duration(
  stream: ReadableStream<Uint8Array>
): Promise<ReadableStream<Uint8Array>> {
  return await fastConcatMP4([stream]);
}

/**
 * Create MP4 audio sample decoder.
 * @param decoderConfig - Audio decoder configuration parameter {@link AudioDecoderConfig}.
 * @returns Returns an object containing `decode` and `close` methods.
 * - `decode` method is used to decode MP4 audio samples, returns array of decoded audio data.
 * - `close` method is used to close audio decoder.
 */
function createMP4AudioSampleDecoder(
  decoderConfig: Parameters<AudioDecoder['configure']>[0]
) {
  let cacheAD: AudioData[] = [];
  const adDecoder = new AudioDecoder({
    output: (ad) => {
      cacheAD.push(ad);
    },
    error: Log.error,
  });
  adDecoder.configure(decoderConfig);

  return {
    decode: async (ss: MP4Sample[]) => {
      ss.forEach((s) => {
        adDecoder.decode(
          new EncodedAudioChunk({
            type: s.is_sync ? 'key' : 'delta',
            timestamp: (1e6 * s.cts) / s.timescale,
            duration: (1e6 * s.duration) / s.timescale,
            data: s.data,
          })
        );
      });

      await adDecoder.flush();

      const result = cacheAD;
      cacheAD = [];

      return result;
    },
    close: () => {
      adDecoder.close();
    },
  };
}

// Audio encoding and decoding APIs have significant differences,
// because calling AudioEncoder.flush mid-encoding causes audio stuttering
function createMP4AudioSampleEncoder(
  encoderConfig: Parameters<AudioEncoder['configure']>[0],
  onOutput: (s: ReturnType<typeof chunk2MP4SampleOpts>) => void
) {
  const encoderConf = {
    codec: encoderConfig.codec,
    sampleRate: encoderConfig.sampleRate,
    numberOfChannels: encoderConfig.numberOfChannels,
  } as const;

  const adEncoder = new AudioEncoder({
    output: (chunk) => {
      onOutput(chunk2MP4SampleOpts(chunk));
    },
    error: (err) => {
      Log.error('AudioEncoder error:', err, ', config:', encoderConf);
    },
  });

  adEncoder.configure(encoderConf);

  // Keep one audio data for final audio fade out
  let lastData: { data: Float32Array; ts: number } | null = null;

  function createAudioData(data: Float32Array, timestamp: number) {
    return new AudioData({
      timestamp: timestamp,
      numberOfChannels: encoderConfig.numberOfChannels,
      numberOfFrames: data.length / encoderConfig.numberOfChannels,
      sampleRate: encoderConfig.sampleRate,
      format: 'f32-planar',
      data: new Float32Array(data),
    });
  }
  return {
    encode: async (data: Float32Array, timestamp: number) => {
      if (lastData != null) {
        adEncoder.encode(createAudioData(lastData.data, lastData.ts));
      }
      lastData = { data, ts: timestamp };
    },
    stop: async () => {
      if (lastData != null) {
        // Side effect modifies data
        audioFade(
          lastData.data,
          encoderConfig.numberOfChannels,
          encoderConfig.sampleRate
        );
        adEncoder.encode(createAudioData(lastData.data, lastData.ts));
        lastData = null;
      }
      await adEncoder.flush();
      adEncoder.close();
    },
  };
}

/**
 * Audio linear fade out to avoid POP sound
 * Side effect adjusts volume value
 */
function audioFade(pcmData: Float32Array, chanCnt: number, sampleRate: number) {
  const dataLen = pcmData.length - 1;
  // Avoid exceeding boundaries, maximum 500ms fade out time
  const fadeLen = Math.min(sampleRate / 2, dataLen);
  for (let i = 0; i < fadeLen; i++) {
    for (let j = 1; j <= chanCnt; j++) {
      // From tail, adjust each channel volume value
      pcmData[Math.floor(dataLen / j) - i] *= i / fadeLen;
    }
  }
}

/**
 * Video dubbing; mix MP4 with audio file, only re-encode audio, video track unchanged
 * @param mp4Stream - MP4 stream
 * @param audio - Audio information
 * @param audio.stream - Audio data stream
 * @param audio.volume - Audio volume
 * @param audio.loop - When audio duration is less than video, whether to loop audio stream
 * @returns Output mixed audio stream
 */
export function mixinMP4AndAudio(
  mp4Stream: ReadableStream<Uint8Array>,
  audio: {
    stream: ReadableStream<Uint8Array>;
    volume: number;
    loop: boolean;
  }
) {
  Log.info('mixinMP4AndAudio, opts:', {
    volume: audio.volume,
    loop: audio.loop,
  });

  const outfile = mp4box.createFile() as unknown as MP4File;

  let outStream: ReadableStream<Uint8Array>;
  let timerId = 0;
  let sendedBoxIdx = 0;
  const boxes = outfile.boxes;
  let firstMoofReady = false;

  const deltaBuf = (): Uint8Array | null => {
    if (!firstMoofReady) {
      if (boxes.find((box: any) => box.type === 'moof') != null) {
        firstMoofReady = true;
      } else {
        return null;
      }
    }
    if (sendedBoxIdx >= boxes.length) return null;

    const ds = new mp4box.DataStream();

    let i = sendedBoxIdx;
    try {
      for (; i < boxes.length; ) {
        boxes[i].write(ds);
        delete boxes[i];
        i += 1;
      }
    } catch (err) {
      throw err;
    }

    if (outfile.moov != null) {
      for (var j = 0; j < outfile.moov.traks.length; j++) {
        outfile.moov.traks[j].samples = [];
      }
      outfile.mdats = [];
      outfile.moofs = [];
    }

    sendedBoxIdx = boxes.length;
    return new Uint8Array(ds.buffer);
  };

  let stoped = false;
  let canceled = false;
  let exit: ((err?: Error) => void) | null = null;
  outStream = new ReadableStream({
    start(ctrl) {
      timerId = self.setInterval(() => {
        const d = deltaBuf();
        if (d != null && !canceled) ctrl.enqueue(d);
      }, 500);

      exit = (err) => {
        clearInterval(timerId);
        outfile.flush();
        if (err != null) {
          ctrl.error(err);
          return;
        }

        const d = deltaBuf();
        if (d != null && !canceled) ctrl.enqueue(d);

        if (!canceled) ctrl.close();
      };
    },
    cancel() {
      canceled = true;
      clearInterval(timerId);
    },
  });

  const stopOut = (err?: Error) => {
    if (stoped) return;
    stoped = true;
    exit?.(err);
  };

  let audioSampleDecoder: ReturnType<
    typeof createMP4AudioSampleDecoder
  > | null = null;

  let audioSampleEncoder: ReturnType<
    typeof createMP4AudioSampleEncoder
  > | null = null;

  let inputAudioPCM: Float32Array[] = [];

  let vTrackId = 0;
  let aTrackId = 0;
  let audioOffset = 0;
  let mp4HasAudio = true;
  let sampleRate = DEFAULT_AUDIO_CONF.sampleRate as number;
  autoReadStream(mp4Stream.pipeThrough(new SampleTransform()), {
    onDone: async () => {
      await audioSampleEncoder?.stop();
      audioSampleDecoder?.close();
      stopOut();
    },
    onChunk: async ({ chunkType, data }) => {
      if (chunkType === 'ready') {
        const { videoTrackConf, audioTrackConf, audioDecoderConf } =
          extractFileConfig(data.file, data.info);
        if (vTrackId === 0 && videoTrackConf != null) {
          vTrackId = outfile.addTrack(videoTrackConf as any);
        }

        const safeAudioTrackConf = audioTrackConf ?? {
          timescale: 1e6,
          samplerate: sampleRate,
          channel_count: DEFAULT_AUDIO_CONF.channelCount,
          hdlr: 'soun',
          name: 'SoundHandler',
          type: 'mp4a',
        };
        if (aTrackId === 0) {
          aTrackId = outfile.addTrack(safeAudioTrackConf as any);
          sampleRate = audioTrackConf?.samplerate ?? sampleRate;
          mp4HasAudio = audioTrackConf == null ? false : true;
        }
        const audioCtx = new AudioContext({ sampleRate });
        inputAudioPCM = extractPCM4AudioBuffer(
          await audioCtx.decodeAudioData(
            await new Response(audio.stream).arrayBuffer()
          )
        );

        if (audioDecoderConf != null) {
          audioSampleDecoder = createMP4AudioSampleDecoder(audioDecoderConf);
        }
        audioSampleEncoder = createMP4AudioSampleEncoder(
          audioDecoderConf ?? {
            codec:
              safeAudioTrackConf.type === 'mp4a'
                ? DEFAULT_AUDIO_CONF.codec
                : safeAudioTrackConf.type,
            numberOfChannels: safeAudioTrackConf.channel_count,
            sampleRate: safeAudioTrackConf.samplerate,
          },
          (s) => outfile.addSample(aTrackId, new Uint8Array(s.data), s)
        );
      } else if (chunkType === 'samples') {
        const { id, type, samples } = data;
        if (type === 'video') {
          samples.forEach((s) =>
            outfile.addSample(id, new Uint8Array(s.data), s)
          );

          if (!mp4HasAudio) await addInputAudio2Track(samples);
          return;
        }

        if (type === 'audio') await mixinAudioSampleAndInputPCM(samples);
      }
    },
  });

  function getInputAudioSlice(len: number) {
    const result = inputAudioPCM.map((chanBuf) =>
      audio.loop
        ? ringSliceFloat32Array(chanBuf, audioOffset, audioOffset + len)
        : chanBuf.slice(audioOffset, audioOffset + len)
    );
    audioOffset += len;

    if (audio.volume !== 1) {
      for (const buf of result)
        for (let i = 0; i < buf.length; i++) buf[i] *= audio.volume;
    }

    return result;
  }

  async function addInputAudio2Track(videoSamples: MP4Sample[]) {
    const firstSamp = videoSamples[0];
    const lastSamp = videoSamples[videoSamples.length - 1];
    const pcmLength = Math.floor(
      ((lastSamp.cts + lastSamp.duration - firstSamp.cts) /
        firstSamp.timescale) *
        sampleRate
    );
    const audioDataBuf = mixinPCM([getInputAudioSlice(pcmLength)]);
    if (audioDataBuf.length === 0) return;
    audioSampleEncoder?.encode(
      audioDataBuf,
      (firstSamp.cts / firstSamp.timescale) * 1e6
    );
  }

  async function mixinAudioSampleAndInputPCM(samples: MP4Sample[]) {
    if (audioSampleDecoder == null) return;

    // 1. First decode MP4 audio
    // [[chan0, chan1], [chan0, chan1]...]
    const pcmFragments = (await audioSampleDecoder.decode(samples)).map(
      extractPCM4AudioData
    );
    // [chan0, chan1]
    const mp4AudioPCM = concatPCMFragments(pcmFragments);
    const inputAudioPCM = getInputAudioSlice(mp4AudioPCM[0].length);
    const firstSamp = samples[0];

    // 3. Re-encode audio
    audioSampleEncoder?.encode(
      // 2. Mix input audio
      mixinPCM([mp4AudioPCM, inputAudioPCM]),
      (firstSamp.cts / firstSamp.timescale) * 1e6
    );
  }

  return outStream;
}
