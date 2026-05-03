import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class R2Service {
  private s3Client: S3Client;
  private readonly logger = new Logger(R2Service.name);
  private bucketName: string;
  private publicUrl: string;

  constructor(private configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');
    
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME') || 'openvideo-assets';
    this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL') || '';

    if (accountId && accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.logger.log('R2 Service initialized');
    } else {
      this.logger.warn('R2 credentials missing, Storage Service will be limited');
    }
  }

  /**
   * Generates a pre-signed URL for the client to directly upload an asset to R2.
   */
  async getUploadUrl(key: string, contentType: string): Promise<{ uploadUrl: string; finalUrl: string }> {
    if (!this.s3Client) {
      throw new Error('R2 Client not configured');
    }

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    
    // Construct the final public URL where the asset will be served
    const finalUrl = this.publicUrl ? `${this.publicUrl}/${key}` : uploadUrl.split('?')[0];

    return { uploadUrl, finalUrl };
  }
}
