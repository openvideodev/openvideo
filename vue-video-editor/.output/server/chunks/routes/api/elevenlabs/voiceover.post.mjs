import { d as defineEventHandler, r as readBody, c as createError } from '../../../nitro/nitro.mjs';
import { R as R2StorageService } from '../../../_/r2.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';
import '@aws-sdk/client-s3';
import '@aws-sdk/s3-request-presigner';
import 'mime/lite';

const r2 = new R2StorageService({
  bucketName: process.env.R2_BUCKET_NAME || "",
  accountId: process.env.R2_ACCOUNT_ID || "",
  accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  cdn: process.env.R2_PUBLIC_DOMAIN || ""
});
const voiceover_post = defineEventHandler(async (event) => {
  try {
    const { text, voiceId = "21m00Tcm4TlvDq8ikWAM" } = await readBody(event);
    if (!text) {
      throw createError({
        statusCode: 400,
        message: "Text is required"
      });
    }
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const model = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";
    const url = `${process.env.ELEVENLABS_URL}/v1/text-to-speech/${voiceId}`;
    const headers = {
      Accept: "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": apiKey || ""
    };
    const data = {
      text,
      model_id: model,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5
      }
    };
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API Error:", errorText);
      throw createError({
        statusCode: response.status,
        message: "Failed to generate voiceover",
        data: { details: errorText }
      });
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = `voiceovers/${Date.now()}.mp3`;
    const publicUrl = await r2.uploadData(fileName, buffer, "audio/mpeg");
    return { url: publicUrl };
  } catch (error) {
    console.error("Voiceover generation error:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || "Internal server error"
    });
  }
});

export { voiceover_post as default };
//# sourceMappingURL=voiceover.post.mjs.map
