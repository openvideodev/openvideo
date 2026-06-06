import { describe, it, expect, vi } from "vitest";
import { Compositor, Text, Image } from "./index";
import { applyAudioFade } from "./utils";

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

describe("applyAudioFade", () => {
  it("should apply fade-in multiplier based on sample clip time", () => {
    const sampleRate = 48000;
    const durationSec = 1.0;
    const length = sampleRate * durationSec;
    // Dual channel audio data filled with 1.0
    const audio = [new Float32Array(length).fill(1.0), new Float32Array(length).fill(1.0)];

    // We want a fade-in of 500ms (0.5s), curve "linear"
    const fadeIn = { duration: 500, curve: "linear" as const };

    // Chunk spans from 0 to 1s relative to clip start
    const endTimeMicro = 1e6; // 1s
    const clipDurationMicro = 1e6; // 1s

    applyAudioFade(audio, endTimeMicro, clipDurationMicro, sampleRate, fadeIn);

    // First sample (time = 0) should be 0
    expect(audio[0][0]).toBe(0);
    // Midpoint of fade-in (time = 0.25s) should be ~0.5
    const midIndex = Math.floor(sampleRate * 0.25);
    expect(audio[0][midIndex]).toBeCloseTo(0.5, 2);
    // After fade-in (time = 0.6s) should be 1.0
    const postFadeIndex = Math.floor(sampleRate * 0.6);
    expect(audio[0][postFadeIndex]).toBe(1.0);
  });

  it("should apply fade-out multiplier based on sample clip time", () => {
    const sampleRate = 48000;
    const durationSec = 1.0;
    const length = sampleRate * durationSec;
    const audio = [new Float32Array(length).fill(1.0), new Float32Array(length).fill(1.0)];

    // We want a fade-out of 500ms (0.5s), curve "linear"
    const fadeOut = { duration: 500, curve: "linear" as const };

    // Chunk spans from 0 to 1s relative to clip start
    const endTimeMicro = 1e6; // 1s
    const clipDurationMicro = 1e6; // 1s

    applyAudioFade(audio, endTimeMicro, clipDurationMicro, sampleRate, undefined, fadeOut);

    // Before fade-out starts (time = 0.4s) should be 1.0
    const preFadeIndex = Math.floor(sampleRate * 0.4);
    expect(audio[0][preFadeIndex]).toBe(1.0);
    // Midpoint of fade-out (time = 0.75s) should be ~0.5
    const midIndex = Math.floor(sampleRate * 0.75);
    expect(audio[0][midIndex]).toBeCloseTo(0.5, 2);
    // Last sample (time = 1.0s) should be 0
    expect(audio[0][length - 1]).toBeCloseTo(0, 2);
  });
});
