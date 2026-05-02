import { MP4ArrayBuffer, MP4File, MP4Info, MP4Sample, mp4box } from 'wrapbox';

export type TransformChunk =
  | { chunkType: 'ready'; data: { info: MP4Info; file: MP4File } }
  | {
      chunkType: 'samples';
      data: { id: number; type: 'video' | 'audio'; samples: MP4Sample[] };
    };

/**
 * Transforms a raw byte stream into an MP4Sample stream using mp4box.js.
 */
export class SampleTransform {
  public readonly readable: ReadableStream<TransformChunk>;
  public readonly writable: WritableStream<Uint8Array>;

  private inputBufOffset = 0;
  private isStreamCancelled = false;

  constructor() {
    const file = mp4box.createFile() as unknown as MP4File;

    this.readable = new ReadableStream<TransformChunk>(
      {
        start: (controller) => this.initMP4Box(file, controller),
        cancel: () => {
          this.isStreamCancelled = true;
          file.stop();
        },
      },
      { highWaterMark: 50 } // Each chunk typically contains 100 samples
    );

    this.writable = new WritableStream<Uint8Array>({
      write: async (chunk) => {
        if (this.isStreamCancelled) {
          throw new Error('Stream cancelled');
        }

        const buffer = chunk.buffer as MP4ArrayBuffer;
        buffer.fileStart = this.inputBufOffset;
        this.inputBufOffset += buffer.byteLength;
        file.appendBuffer(buffer);
      },
      close: () => {
        file.flush();
        file.stop();
        // Invoke onFlush if defined to signal completion
        (file as any).onFlush?.();
      },
      abort: (reason) => {
        Log.error('SampleTransform writable aborted:', reason);
        file.stop();
      },
    });
  }

  private initMP4Box(
    file: MP4File,
    controller: ReadableStreamDefaultController<TransformChunk>
  ) {
    file.onReady = (info: MP4Info) => {
      // Set extraction options for video and audio tracks
      [info.videoTracks[0], info.audioTracks[0]].forEach((track) => {
        if (track) {
          file.setExtractionOptions(
            track.id,
            (track as any).video ? 'video' : 'audio',
            { nbSamples: 100 }
          );
        }
      });

      controller.enqueue({ chunkType: 'ready', data: { info, file } });
      file.start();
    };

    const releasedSamplesCount: Record<number, number> = {};

    file.onSamples = (
      id: number,
      type: 'video' | 'audio',
      samples: MP4Sample[]
    ) => {
      // Create independent copies of samples to ensure safe transfer
      const samplesCopy = samples.map((s) => ({ ...s }));

      controller.enqueue({
        chunkType: 'samples',
        data: { id, type, samples: samplesCopy },
      });

      // Release processed samples to free memory
      releasedSamplesCount[id] =
        (releasedSamplesCount[id] ?? 0) + samples.length;
      file.releaseUsedSamples(id, releasedSamplesCount[id]);
    };

    (file as any).onFlush = () => {
      controller.close();
    };

    file.onError = (err) => {
      controller.error(new Error(`mp4box error: ${err}`));
    };
  }
}

// Internal Log placeholder since it might not be imported
const Log = {
  error: (...args: any[]) => console.error('[SampleTransform]', ...args),
};
