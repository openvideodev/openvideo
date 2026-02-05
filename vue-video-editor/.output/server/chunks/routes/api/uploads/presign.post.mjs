import { d as defineEventHandler, r as readBody, c as createError } from '../../../nitro/nitro.mjs';
import { randomUUID } from 'crypto';
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

const config = {
  deepgram: {
    url: process.env.DEEPGRAM_URL || "https://api.deepgram.com/v1",
    model: process.env.DEEPGRAM_MODEL || "nova-2",
    key: process.env.DEEPGRAM_API_KEY
  },
  r2: {
    bucket: process.env.R2_BUCKET_NAME,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    accountId: process.env.R2_ACCOUNT_ID,
    cdn: process.env.R2_PUBLIC_DOMAIN
  }
};

const r2 = new R2StorageService({
  bucketName: config.r2.bucket,
  accessKeyId: config.r2.accessKeyId,
  secretAccessKey: config.r2.secretAccessKey,
  accountId: config.r2.accountId,
  cdn: config.r2.cdn
});
const presign_post = defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { userId = "mockuser", fileNames } = body;
    if (!fileNames || !Array.isArray(fileNames) || fileNames.length === 0) {
      throw createError({
        statusCode: 400,
        message: "fileNames array is required and must not be empty"
      });
    }
    const uploads = await Promise.all(
      fileNames.map(async (originalName) => {
        const cleanName = originalName.trim();
        const uniqueName = `${userId}/${randomUUID()}-${cleanName}`;
        const presigned = await r2.createPresignedUpload(uniqueName, {
          contentType: void 0,
          expiresIn: 3600
        });
        return {
          fileName: cleanName,
          filePath: presigned.filePath,
          contentType: presigned.contentType,
          presignedUrl: presigned.presignedUrl,
          url: presigned.url
        };
      })
    );
    return { success: true, uploads };
  } catch (error) {
    console.error("Error in presign route:", error);
    throw createError({
      statusCode: 500,
      message: "Internal server error",
      data: { details: error.message || String(error) }
    });
  }
});

export { presign_post as default };
//# sourceMappingURL=presign.post.mjs.map
