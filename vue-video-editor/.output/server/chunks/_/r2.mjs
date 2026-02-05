import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import mime from 'mime/lite';

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
class R2StorageService {
  constructor(params) {
    __publicField(this, "client");
    __publicField(this, "bucketName");
    __publicField(this, "accountId");
    __publicField(this, "cdn");
    this.bucketName = params.bucketName;
    this.accountId = params.accountId;
    this.cdn = params.cdn;
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${params.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: params.accessKeyId,
        secretAccessKey: params.secretAccessKey
      }
    });
  }
  async uploadData(fileName, data, contentType = "application/octet-stream") {
    try {
      const type = mime.getType(fileName) || contentType;
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: fileName,
          Body: data,
          ContentType: type
        })
      );
      const url = this.getUrl(fileName);
      return url;
    } catch (error) {
      console.error("[R2] Failed to upload file:", fileName);
      console.error(
        "[R2] Error stack:",
        error instanceof Error ? error.stack : error
      );
      throw new Error("Failed to upload to R2");
    }
  }
  async uploadJson(fileName, data) {
    const content = JSON.stringify(data);
    return this.uploadData(fileName, content, "application/json");
  }
  async createPresignedUpload(filePath, options = {}) {
    var _a;
    const inferredType = options.contentType || mime.getType(filePath) || "application/octet-stream";
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: filePath,
      ContentType: inferredType
    });
    const presignedUrl = await getSignedUrl(this.client, command, {
      expiresIn: (_a = options.expiresIn) != null ? _a : 3600
    });
    return {
      fileName: filePath.split("/").pop() || filePath,
      filePath,
      contentType: inferredType,
      presignedUrl,
      url: this.getUrl(filePath)
    };
  }
  getUrl(fileName) {
    return `${this.cdn}/${fileName}`;
  }
}

export { R2StorageService as R };
//# sourceMappingURL=r2.mjs.map
