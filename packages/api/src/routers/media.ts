import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";
import { eq } from "drizzle-orm";
import { getDB, schema } from "@openvideo/db";
import { ModalClient } from "modal";

export const mediaRouter = router({
  // Generate image using Modal
  generateImage: protectedProcedure
    .input(
      z.object({
        spaceId: z.string(),
        stepId: z.string(),
        prompt: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }: any) => {
      const { spaceId, stepId, prompt } = input;
      const db = getDB();

      // Verify user has access to the space
      const space = await db.query.space.findFirst({
        where: eq(schema.space.id, spaceId),
      });

      if (!space || space.userId !== ctx.user.id) {
        throw new Error("Space not found or access denied");
      }

      console.log(`[DEBUG] Triggering Modal image generation for space ${spaceId}, step ${stepId}`);

      try {
        // Call Modal function using JS SDK
        console.log(
          `[DEBUG] Calling Modal function for image generation: space ${spaceId}, step ${stepId}`,
        );

        const modal = new ModalClient();
        const generateImage = await modal.functions.fromName(
          "openvideo-media-generator",
          "generate_image",
        );

        const result = await generateImage.remote([spaceId, stepId, prompt]);
        console.log(`[DEBUG] Modal image generation triggered:`, result);
        return result;
      } catch (error: any) {
        console.error(`[DEBUG] Failed to trigger Modal image generation:`, error);
        console.error(`[DEBUG] Error stack:`, error.stack);
        throw new Error("Failed to generate image");
      }
    }),

  // Generate video using Modal
  generateVideo: protectedProcedure
    .input(
      z.object({
        spaceId: z.string(),
        stepId: z.string(),
        imageUrl: z.string().url(),
        prompt: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }: any) => {
      const { spaceId, stepId, imageUrl, prompt } = input;
      const db = getDB();

      // Verify user has access to the space
      const space = await db.query.space.findFirst({
        where: eq(schema.space.id, spaceId),
      });

      if (!space || space.userId !== ctx.user.id) {
        throw new Error("Space not found or access denied");
      }

      console.log(`[DEBUG] Triggering Modal video generation for space ${spaceId}, step ${stepId}`);

      try {
        // Call Modal function using HTTP API
        const response = await fetch(
          "https://api.modal.com/v1/functions/openvideo-media-generator/generate_video/calls",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.MODAL_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              args: [spaceId, stepId, imageUrl, prompt],
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`Modal function call failed: ${response.statusText}`);
        }

        const result = await response.json();
        console.log(`[DEBUG] Modal video generation triggered:`, result);
        return result;
      } catch (error) {
        console.error(`[DEBUG] Failed to trigger Modal video generation:`, error);
        throw new Error("Failed to generate video");
      }
    }),

  // Generate audio using ElevenLabs via Modal
  generateAudio: protectedProcedure
    .input(
      z.object({
        spaceId: z.string(),
        stepId: z.string(),
        prompt: z.string().min(1),
        durationSeconds: z.number().min(1).max(22),
        audioType: z.enum(["background-music", "sound-effect"]),
      }),
    )
    .mutation(async ({ ctx, input }: any) => {
      const { spaceId, stepId, prompt, durationSeconds, audioType } = input;
      const db = getDB();

      // Verify user has access to the space
      const space = await db.query.space.findFirst({
        where: eq(schema.space.id, spaceId),
      });

      if (!space || space.userId !== ctx.user.id) {
        throw new Error("Space not found or access denied");
      }

      console.log(`[DEBUG] Triggering Modal audio generation for space ${spaceId}, step ${stepId}`);

      try {
        // Call Modal function using HTTP API
        const response = await fetch(
          "https://api.modal.com/v1/functions/openvideo-media-generator/generate_elevenlabs_audio/calls",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.MODAL_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              args: [spaceId, stepId, prompt, durationSeconds, audioType],
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`Modal function call failed: ${response.statusText}`);
        }

        const result = await response.json();
        console.log(`[DEBUG] Modal audio generation triggered:`, result);
        return result;
      } catch (error) {
        console.error(`[DEBUG] Failed to trigger Modal audio generation:`, error);
        throw new Error("Failed to generate audio");
      }
    }),

  // Health check for media generation services
  healthCheck: protectedProcedure.query(async () => {
    try {
      // Call Modal health check using HTTP API
      const response = await fetch(
        "https://api.modal.com/v1/functions/openvideo-media-generator/health_check/calls",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.MODAL_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            args: [],
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Modal function call failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error(`[DEBUG] Media generator health check failed:`, error);
      return {
        status: "error",
        error: "Failed to connect to media generation service",
      };
    }
  }),
});
