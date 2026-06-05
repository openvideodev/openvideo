import { describe, it, expect, vi } from "vitest";
import { Compositor, Text, Image } from "./index";

describe("compositor-timing", () => {
  it("should calculate correct output duration based on display.to", async () => {
    const compositor = new Compositor({ width: 100, height: 100 });

    const textClip = new Text("Hello");
    textClip.display = { from: 1e6, to: 3e6 }; // 1s to 3s
    textClip.duration = 5e6; // default 5s

    await compositor.addSprite(textClip);

    const initMuxerSpy = vi.spyOn(compositor as any, "initMuxer").mockImplementation(() => {
      return {
        getEncodeQueueSize: () => 0,
        flush: async () => {},
        close: () => {},
        stream: new ReadableStream(),
      };
    });

    const runEncodingSpy = vi.spyOn(compositor as any, "runEncoding").mockImplementation(() => {
      return () => {};
    });

    compositor.output();

    expect(initMuxerSpy).toHaveBeenCalledWith(3e6); // Should use display.to (3 seconds)

    initMuxerSpy.mockRestore();
    runEncodingSpy.mockRestore();
  });

  it("should fallback to display.from + duration if display.to is not set or 0", async () => {
    const compositor = new Compositor({ width: 100, height: 100 });

    const textClip = new Text("Hello");
    textClip.display = { from: 1e6, to: 0 };
    textClip.duration = 5e6; // default 5s

    await compositor.addSprite(textClip);

    const initMuxerSpy = vi.spyOn(compositor as any, "initMuxer").mockImplementation(() => {
      return {
        getEncodeQueueSize: () => 0,
        flush: async () => {},
        close: () => {},
        stream: new ReadableStream(),
      };
    });

    const runEncodingSpy = vi.spyOn(compositor as any, "runEncoding").mockImplementation(() => {
      return () => {};
    });

    compositor.output();

    expect(initMuxerSpy).toHaveBeenCalledWith(6e6); // Should fallback to display.from + duration (1s + 5s = 6s)

    initMuxerSpy.mockRestore();
    runEncodingSpy.mockRestore();
  });

  it("should not call getFrame on clips that have exceeded their display.to time", async () => {
    const compositor = new Compositor({ width: 100, height: 100 });
    await compositor.initPixiApp();

    const canvas = new OffscreenCanvas(10, 10);
    canvas.getContext("2d")?.fillRect(0, 0, 10, 10);
    const imageClip = new Image(canvas.transferToImageBitmap());
    imageClip.display = { from: 1e6, to: 3e6 }; // 1s to 3s
    imageClip.duration = 5e6;

    await compositor.addSprite(imageClip);

    const clonedClip = (compositor as any).sprites[0];
    const getFrameSpy = vi.spyOn(clonedClip, "getFrame");

    // Render at 2 seconds (within display window)
    await compositor.renderFrame(2000);
    expect(getFrameSpy).toHaveBeenCalledTimes(1);

    // Reset spy history
    getFrameSpy.mockClear();

    // Render at 4 seconds (outside display window)
    await compositor.renderFrame(4000);
    expect(getFrameSpy).not.toHaveBeenCalled();

    getFrameSpy.mockRestore();
  });
});
