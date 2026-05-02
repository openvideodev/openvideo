import {
  mp4box,
  AudioTrackOpts,
  ESDSBoxParser,
  MP4ArrayBuffer,
  MP4File,
  MP4Info,
  MP4Sample,
  TrakBoxParser,
  VideoTrackOpts,
} from 'wrapbox';
import { file } from 'opfs-tools';
import { DEFAULT_AUDIO_CONF } from '../clips';

interface ExtractedConfig {
  videoTrackConf?: VideoTrackOpts;
  videoDecoderConf?: VideoDecoderConfig;
  audioTrackConf?: AudioTrackOpts;
  audioDecoderConf?: AudioDecoderConfig;
}

/**
 * Extracts video and audio configurations from an MP4 file.
 */
export function extractFileConfig(
  file: MP4File,
  info: MP4Info
): ExtractedConfig {
  const result: ExtractedConfig = {};

  const vTrack = info.videoTracks[0];
  if (vTrack != null) {
    const videoDesc = parseVideoCodecDesc(file.getTrackById(vTrack.id))?.buffer;
    const codecInfo = getCodecInfo(vTrack.codec);

    if (codecInfo) {
      result.videoTrackConf = {
        timescale: vTrack.timescale,
        duration: vTrack.duration,
        width: vTrack.video.width,
        height: vTrack.video.height,
        brands: info.brands,
        type: codecInfo.type,
        [codecInfo.descKey]: videoDesc,
      } as VideoTrackOpts;
    }

    result.videoDecoderConf = {
      codec: vTrack.codec,
      codedHeight: vTrack.video.height,
      codedWidth: vTrack.video.width,
      description: videoDesc as ArrayBuffer,
    };
  }

  const aTrack = info.audioTracks[0];
  if (aTrack != null) {
    const esdsBox = getESDSBoxFromMP4File(file);
    const audioInfo = esdsBox ? parseAudioInfoFromESDSBox(esdsBox) : {};

    result.audioTrackConf = {
      timescale: aTrack.timescale,
      samplerate: audioInfo.sampleRate ?? aTrack.audio.sample_rate,
      channel_count: audioInfo.numberOfChannels ?? aTrack.audio.channel_count,
      hdlr: 'soun',
      type: aTrack.codec.startsWith('mp4a') ? 'mp4a' : aTrack.codec,
      description: esdsBox,
    };

    result.audioDecoderConf = {
      codec: audioInfo.codec ?? DEFAULT_AUDIO_CONF.codec,
      numberOfChannels:
        audioInfo.numberOfChannels ?? aTrack.audio.channel_count,
      sampleRate: audioInfo.sampleRate ?? aTrack.audio.sample_rate,
    };
  }

  return result;
}

function getCodecInfo(codec: string): { descKey: string; type: string } | null {
  if (codec.startsWith('avc1'))
    return { descKey: 'avcDecoderConfigRecord', type: 'avc1' };
  if (codec.startsWith('hvc1'))
    return { descKey: 'hevcDecoderConfigRecord', type: 'hvc1' };
  return null;
}

/**
 * Parses video codec description (avcC, hvcC, etc.) from a track.
 */
function parseVideoCodecDesc(track: TrakBoxParser): Uint8Array | undefined {
  for (const entry of track.mdia.minf.stbl.stsd.entries) {
    const box = entry.avcC ?? entry.hvcC ?? entry.av1C ?? entry.vpcC;
    if (box != null) {
      const stream = new mp4box.DataStream(undefined, 0, undefined);
      box.write(stream);
      return new Uint8Array(stream.buffer.slice(8)); // Skip box header
    }
  }
  return undefined;
}

function getESDSBoxFromMP4File(
  file: MP4File,
  codec = 'mp4a'
): ESDSBoxParser | undefined {
  return file.moov?.traks
    .flatMap((t: any) => t.mdia.minf.stbl.stsd.entries)
    .find((entry: any) => entry.type === codec) as ESDSBoxParser | undefined;
}

/**
 * Parses audio configuration from ESDS Box.
 * ref: https://wiki.multimedia.cx/index.php/MPEG-4_Audio#Audio_Specific_Config
 */
function parseAudioInfoFromESDSBox(esds: ESDSBoxParser): {
  codec?: string;
  sampleRate?: number;
  numberOfChannels?: number;
} {
  const decConfDesc = esds.esd?.descs?.[0];
  if (!decConfDesc) return {};

  let codec = `mp4a.${decConfDesc.oti.toString(16)}`;
  const decSpecInfo = decConfDesc.descs?.[0];

  if (!decSpecInfo) {
    if (codec.endsWith('.40')) codec += '.2';
    return { codec };
  }

  const data = decSpecInfo.data;
  if (!data) return { codec };
  const audioObjectType = (data[0] & 0xf8) >> 3;
  codec += `.${audioObjectType}`;

  // Bit parsing for sample rate and channels
  const sampleRateIdx = ((data[0] & 0x07) << 1) | (data[1] >> 7);
  const numberOfChannels = (data[1] & 0x78) >> 3;

  const SAMPLE_RATES = [
    96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025,
    8000, 7350,
  ] as const;

  return {
    codec,
    sampleRate: SAMPLE_RATES[sampleRateIdx],
    numberOfChannels,
  };
}

/**
 * Quick parse mp4 file, prioritizing header parsing to save memory.
 */
export async function quickParseMP4File(
  reader: Awaited<ReturnType<ReturnType<typeof file>['createReader']>>,
  onReady: (data: { mp4boxFile: MP4File; info: MP4Info }) => void,
  onSamples: (
    id: number,
    sampleType: 'video' | 'audio',
    samples: MP4Sample[]
  ) => void
) {
  const mp4boxFile = mp4box.createFile(false) as unknown as MP4File;

  mp4boxFile.onReady = (info: MP4Info) => {
    onReady({ mp4boxFile, info });

    [info.videoTracks[0], info.audioTracks[0]].forEach((track) => {
      if (track) {
        const type = (track as any).video ? 'video' : 'audio';
        mp4boxFile.setExtractionOptions(track.id, type, { nbSamples: 100 });
      }
    });

    mp4boxFile.start();
  };

  mp4boxFile.onSamples = onSamples;

  let cursor = 0;
  const CHUNK_SIZE = 30 * 1024 * 1024; // 30MB

  while (true) {
    const data = (await reader.read(CHUNK_SIZE, {
      at: cursor,
    })) as MP4ArrayBuffer;
    if (data.byteLength === 0) break;

    data.fileStart = cursor;
    const nextPos = mp4boxFile.appendBuffer(data);
    if (nextPos == null) break;
    cursor = nextPos;
  }

  mp4boxFile.stop();
}

/**
 * Parses transformation matrix to extract scale, rotation, and translation.
 */
export function parseMatrix(matrix?: Int32Array) {
  if (matrix?.length !== 9) return {};

  const m = new Int32Array(matrix.buffer);
  const fixed = (val: number) => val / 65536.0;

  const a = fixed(m[0]);
  const b = fixed(m[1]);
  const c = fixed(m[3]);
  const d = fixed(m[4]);
  const tx = fixed(m[6]);
  const ty = fixed(m[7]);
  const w = m[8] / (1 << 30);

  return {
    scaleX: Math.sqrt(a * a + c * c),
    scaleY: Math.sqrt(b * b + d * d),
    rotationRad: Math.atan2(c, a),
    rotationDeg: (Math.atan2(c, a) * 180) / Math.PI,
    translateX: tx,
    translateY: ty,
    perspective: w,
  };
}

/**
 * Creates a function to rotate VideoFrames using Canvas.
 */
export function createVFRotater(
  width: number,
  height: number,
  rotationDeg: number
) {
  const normRotation = (Math.round(rotationDeg / 90) * 90 + 360) % 360;
  if (normRotation === 0) return (vf: VideoFrame | null) => vf;

  const isPortrait = normRotation === 90 || normRotation === 270;
  const rotatedWidth = isPortrait ? height : width;
  const rotatedHeight = isPortrait ? width : height;

  const canvas = new OffscreenCanvas(rotatedWidth, rotatedHeight);
  const ctx = canvas.getContext('2d')!;

  ctx.translate(rotatedWidth / 2, rotatedHeight / 2);
  ctx.rotate((-normRotation * Math.PI) / 180);
  ctx.translate(-width / 2, -height / 2);

  return (vf: VideoFrame | null) => {
    if (!vf) return null;

    ctx.drawImage(vf, 0, 0);
    const newVF = new VideoFrame(canvas, {
      timestamp: vf.timestamp,
      duration: vf.duration ?? undefined,
    });
    vf.close();
    return newVF;
  };
}
