import "reflect-metadata";
import { ConfigService } from "@nestjs/config";
import { AutoCaptionSkill } from "./auto-caption.skill";
import { ProjectContext } from "../base-skill";
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("AutoCaptionSkill", () => {
  let skill: AutoCaptionSkill;
  let configService: ConfigService;

  const mockConfigService = {
    get: vi.fn().mockReturnValue("mock-deepgram-key"),
  };

  const mockProjectContext: ProjectContext = {
    project: {
      settings: {
        width: 1920,
        height: 1080,
        fps: 30,
        duration: 50000000,
      },
      tracks: [
        {
          id: "track_video_1",
          name: "Video Track",
          type: "video" as any,
          clipIds: ["clip_video_1"],
        },
      ],
      clips: {
        clip_video_1: {
          id: "clip_video_1",
          type: "Video" as any,
          src: "https://example.com/video.mp4",
          timing: {
            display: {
              from: 5000000, // 5s on timeline
              to: 15000000, // 15s on timeline (duration 10s)
            },
            trim: {
              from: 2000000, // Trimmed to start 2s into source
              to: 12000000, // Trimmed to end 12s into source
            },
            duration: 10000000,
            playbackRate: 1,
          },
        } as any,
      },
    },
    videoClipIds: ["clip_video_1"],
    audioClipIds: [],
    allClipIds: ["clip_video_1"],
    trackIds: ["track_video_1"],
    firstVideoClipId: "clip_video_1",
  };

  beforeEach(() => {
    skill = new AutoCaptionSkill(mockConfigService as any);
    vi.clearAllMocks();
  });

  it("should be defined", () => {
    expect(skill).toBeDefined();
  });

  it("should transcribe and generate caption commands", async () => {
    // Mock transcription response from Deepgram
    const mockTranscribeResponse = {
      results: {
        channels: [
          {
            alternatives: [
              {
                paragraphs: {
                  paragraphs: [
                    {
                      sentences: [{ text: "Hello world this is a test" }],
                      start: 1.0,
                      end: 4.5,
                    },
                  ],
                },
                words: [
                  { word: "Hello", start: 1.0, end: 1.8 },
                  { word: "world", start: 1.8, end: 2.5 },
                  { word: "this", start: 3.0, end: 3.8 },
                  { word: "is", start: 3.8, end: 4.2 },
                  { word: "a", start: 4.2, end: 4.4 },
                  { word: "test", start: 4.4, end: 4.5 },
                ],
              },
            ],
          },
        ],
      },
    };

    const globalFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTranscribeResponse,
    });
    vi.stubGlobal("fetch", globalFetch);

    const commands = await skill.resolve(mockProjectContext);

    // Should create a captions track and add caption clips
    expect(commands).toBeDefined();
    expect(commands.length).toBeGreaterThan(1);

    // Verify track creation command
    const trackAddCmd = commands.find((c) => c.type === "track.add");
    expect(trackAddCmd).toBeDefined();
    expect(trackAddCmd?.payload.type).toBe("caption");

    // Verify clip addition commands
    const clipAddCmds = commands.filter((c) => c.type === "clip.add");
    expect(clipAddCmds.length).toBeGreaterThan(0);

    const firstCaptionClip = clipAddCmds[0].payload.clip;
    expect(firstCaptionClip.type).toBe("Caption");
    expect(firstCaptionClip.style.fontFamily).toBe("Bangers-Regular");
    expect(firstCaptionClip.style.color).toBe("#ffffff");

    vi.unstubAllGlobals();
  });
});
