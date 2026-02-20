import { getConfig } from '../config.js';
import { getLogger } from '../logger.js';

const logger = getLogger();

export interface S3UploadResult {
  url: string;
  bucket: string;
  key: string;
}

export async function uploadToS3(
  buffer: Buffer,
  filename: string
): Promise<S3UploadResult> {
  const config = getConfig();
  
  if (!config.s3Endpoint || !config.s3Bucket) {
    throw new Error('S3 not configured');
  }

  const key = config.s3Prefix 
    ? `${config.s3Prefix.replace(/\/$/, '')}/${filename}`
    : filename;

  // Build S3 upload URL
  const uploadUrl = `${config.s3Endpoint.replace(/\/$/, '')}/${config.s3Bucket}/${key}`;
  
  logger.debug(`Uploading to S3: ${uploadUrl}`);

  // Prepare headers for S3-compatible upload
  const headers: Record<string, string> = {
    'Content-Type': 'image/jpeg',
    'Content-Length': String(buffer.length),
  };

  // Add AWS Signature V4 headers if credentials provided
  if (config.s3AccessKeyId && config.s3SecretAccessKey) {
    const date = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
    headers['X-Amz-Date'] = date;
    headers['X-Amz-Content-SHA256'] = 'UNSIGNED-PAYLOAD';
    // Note: Full AWS SigV4 implementation would go here
    // For now, assuming MinIO or compatible that accepts basic auth
  }

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers,
    body: buffer,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`S3 upload failed: ${response.status} ${errorText}`);
  }

  const publicUrl = config.s3PublicUrlBase
    ? `${config.s3PublicUrlBase.replace(/\/$/, '')}/${key}`
    : uploadUrl;

  logger.info(`Screenshot uploaded to S3: ${publicUrl}`);

  return {
    url: publicUrl,
    bucket: config.s3Bucket,
    key,
  };
}

export function generateScreenshotFilename(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const random = Math.random().toString(36).substring(2, 8);
  return `screenshot-${timestamp}-${random}.jpg`;
}
