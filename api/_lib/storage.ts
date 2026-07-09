import { logger } from './logger.js';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getServerEnv } from "../../shared/envSchema.js";

export function getStorageEnv() {
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

const uploadToR2 = async (key: string, content: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const client = await getR2Client();
    const env = getStorageEnv();
    const bucket = env.R2_BUCKET_NAME;
    if (!bucket) throw new Error('R2_BUCKET_NAME not set');

    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: content,
      ContentType: 'application/json'
    }));
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
};

const getFromR2 = async (key: string): Promise<string | null> => {
  try {
    const client = await getR2Client();
    const env = getStorageEnv();
    const bucket = env.R2_BUCKET_NAME;
    if (!bucket) throw new Error('R2_BUCKET_NAME not set');

    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const result = await client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key
    }));
    
    if (!result.Body) return null;
    return await result.Body.transformToString();
  } catch (error) {
    logger.error(`Failed to get ${key} from R2:`, error);
    return null;
  }
};

const deleteFromR2 = async (key: string): Promise<void> => {
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
    logger.error(`Failed to delete ${key} from R2:`, error);
  }
};
