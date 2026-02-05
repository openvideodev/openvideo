import { randomUUID } from 'crypto';
import { R2StorageService } from '../../utils/r2';
import { config } from '../../utils/config';

interface PresignRequest {
  userId: string;
  fileNames: string[];
}

const r2 = new R2StorageService({
  bucketName: config.r2.bucket,
  accessKeyId: config.r2.accessKeyId,
  secretAccessKey: config.r2.secretAccessKey,
  accountId: config.r2.accountId,
  cdn: config.r2.cdn,
});

export default defineEventHandler(async (event) => {
  try {
    const body: PresignRequest = await readBody(event);
    const { userId = 'mockuser', fileNames } = body;

    if (!fileNames || !Array.isArray(fileNames) || fileNames.length === 0) {
      throw createError({
        statusCode: 400,
        message: 'fileNames array is required and must not be empty',
      });
    }

    const uploads = await Promise.all(
      fileNames.map(async (originalName) => {
        const cleanName = originalName.trim();
        const uniqueName = `${userId}/${randomUUID()}-${cleanName}`;

        const presigned = await r2.createPresignedUpload(uniqueName, {
          contentType: undefined,
          expiresIn: 3600,
        });

        return {
          fileName: cleanName,
          filePath: presigned.filePath,
          contentType: presigned.contentType,
          presignedUrl: presigned.presignedUrl,
          url: presigned.url,
        };
      })
    );

    return { success: true, uploads };
  } catch (error: any) {
    console.error('Error in presign route:', error);
    throw createError({
      statusCode: 500,
      message: 'Internal server error',
      data: { details: error.message || String(error) },
    });
  }
});
