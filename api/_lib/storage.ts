import { logger } from './logger.js';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getServerEnv } from "../../shared/envSchema.js";

function getStorageEnv() {
  return getServerEnv(process.env);
}

export async function getR2Client() {
  const env = getStorageEnv();
  let r2Endpoint = env.R2_ENDPOINT;
  let r2AccessKeyId = env.R2_ACCESS_KEY_ID || '';
  let r2SecretAccessKey = env.R2_SECRET_ACCESS_KEY || '';
  
  if (r2Endpoint && !r2Endpoint.startsWith("http://") && !r2Endpoint.startsWith("https://")) {
    r2Endpoint = `https://${r2Endpoint}`;
  }

  // Handle swapped keys if necessary
  if (r2AccessKeyId.length === 64 && r2SecretAccessKey.length === 32) {
    const temp = r2AccessKeyId;
    r2AccessKeyId = r2SecretAccessKey;
    r2SecretAccessKey = temp;
  }

  if (!r2AccessKeyId || !r2SecretAccessKey || !r2Endpoint) {
    logger.error("[getR2Client] R2 Credentials missing!", { endpoint: !!r2Endpoint, key: !!r2AccessKeyId, secret: !!r2SecretAccessKey });
    throw new Error("R2 storage credentials missing. Please check R2_ENDPOINT, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY env variables.");
  }

  return new S3Client({
    region: 'auto',
    endpoint: r2Endpoint,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
    forcePathStyle: true,
    maxAttempts: 3,
  });
}

export interface UploadOptions {
    contentType?: string;
    isPublic?: boolean;
}

export const uploadToR2 = async (key: string, content: Buffer | Uint8Array | string, options: UploadOptions = {}): Promise<{ success: boolean; error?: string; url?: string }> => {
  try {
    const client = await getR2Client();
    const env = getStorageEnv();
    const bucket = env.R2_BUCKET_NAME;
    if (!bucket) throw new Error('R2_BUCKET_NAME not set');

    const { contentType = 'application/octet-stream' } = options;

    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: content as any,
      ContentType: contentType,
      // Metadata or ACLs can be added here if needed
    }));

    const url = env.R2_PUBLIC_URL_PREFIX ? `${env.R2_PUBLIC_URL_PREFIX.replace(/\/$/, '')}/${key}` : undefined;
    
    return { success: true, url };
  } catch (error) {
    logger.error(`[uploadToR2] Failed to upload ${key}:`, error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
};

export const getFromR2 = async (key: string): Promise<string | null> => {
  try {
    const client = await getR2Client();
    const env = getStorageEnv();
    const bucket = env.R2_BUCKET_NAME;
    if (!bucket) throw new Error('R2_BUCKET_NAME not set');

    const result = await client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key
    }));
    
    if (!result.Body) return null;
    return await result.Body.transformToString();
  } catch (error) {
    logger.error(`[getFromR2] Failed to get ${key}:`, error);
    return null;
  }
};

export const deleteFromR2 = async (key: string): Promise<void> => {
  try {
    const client = await getR2Client();
    const env = getStorageEnv();
    const bucket = env.R2_BUCKET_NAME;
    if (!bucket) return;

    await client.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: key
    }));
  } catch (error) {
    logger.error(`[deleteFromR2] Failed to delete ${key}:`, error);
  }
};

export const batchDeleteFromR2 = async (keys: string[]): Promise<void> => {
    if (keys.length === 0) return;
    const { DeleteObjectsCommand } = await import("@aws-sdk/client-s3");
    try {
        const client = await getR2Client();
        const env = getStorageEnv();
        const bucket = env.R2_BUCKET_NAME;
        if (!bucket) return;

        await client.send(new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: {
                Objects: keys.map(Key => ({ Key }))
            }
        }));
    } catch (error) {
        logger.error(`[batchDeleteFromR2] Failed to batch delete keys:`, error);
    }
};

export const getUploadPresignedUrl = async (key: string, contentType: string = 'image/webp', expiresIn: number = 300): Promise<string> => {
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const client = await getR2Client();
    const env = getStorageEnv();
    const bucket = env.R2_BUCKET_NAME;
    if (!bucket) throw new Error('R2_BUCKET_NAME not set');

    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
    });
    
    return await getSignedUrl(client, command, { expiresIn });
};
