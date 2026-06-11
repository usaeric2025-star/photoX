import { logger } from './logger.js';
import { S3Client } from "@aws-sdk/client-s3";
import { getServerEnv } from "../_shared/envSchema.js";

const serverEnv = getServerEnv(process.env);

export async function getR2Client() {
  let r2Endpoint = serverEnv.R2_ENDPOINT;
  let r2AccessKeyId = serverEnv.R2_ACCESS_KEY_ID || '';
  let r2SecretAccessKey = serverEnv.R2_SECRET_ACCESS_KEY || '';
  
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
    maxAttempts: 1,
  });
}
