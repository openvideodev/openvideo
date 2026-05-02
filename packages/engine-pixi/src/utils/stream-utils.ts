export function autoReadStream<ST extends ReadableStream>(
  stream: ST,
  cbs: {
    onChunk: ST extends ReadableStream<infer DT>
      ? (chunk: DT) => Promise<void>
      : never;
    onDone: () => void;
  }
) {
  let stoped = false;
  async function run() {
    const reader = stream.getReader();

    while (!stoped) {
      const { value, done } = await reader.read();
      if (done) {
        cbs.onDone();
        return;
      }
      await cbs.onChunk(value);
    }

    reader.releaseLock();
    await stream.cancel();
  }

  run().catch(console.error);

  return () => {
    stoped = true;
  };
}
