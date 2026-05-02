// Video utility functions that can run in both worker and main threads

/**
 * Decode image stream, return an array of video frames.
 *
 * @param stream - Readable stream containing image data.
 * @param type - MIME type of the image, e.g. 'image/jpeg'.
 *
 * @returns Returns a Promise that resolves to an array of {@link VideoFrame} after decoding completes.
 *
 * @example
 *
 * const frames = await decodeImg(
 *   (await fetch('<gif url>')).body!,
 *   `image/gif`,
 * );
 */
export async function decodeImg(
  stream: ReadableStream<Uint8Array>,
  type: string
): Promise<VideoFrame[]> {
  const init = {
    type,
    data: stream,
  };
  const imageDecoder = new ImageDecoder(init);

  await Promise.all([imageDecoder.completed, imageDecoder.tracks.ready]);

  const frameCount = imageDecoder.tracks.selectedTrack?.frameCount ?? 1;

  const result: VideoFrame[] = [];
  for (let i = 0; i < frameCount; i += 1) {
    result.push((await imageDecoder.decode({ frameIndex: i })).image);
  }
  return result;
}
