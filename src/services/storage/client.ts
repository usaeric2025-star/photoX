import { S3Client } from "@aws-sdk/client-s3";

export async function getR2Client() {
  const r2Endpoint = process.env.R2_ENDPOINT || 'https://3e1f6d6a9c0f2526239f23a5809fc667.r2.cloudflarestorage.com';
  let r2AccessKeyId = process.env.R2_ACCESS_KEY_ID || '';
  let r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
  
  if (r2AccessKeyId.length === 64 && r2SecretAccessKey.length === 32) {
    const temp = r2AccessKeyId;
    r2AccessKeyId = r2SecretAccessKey;
    r2SecretAccessKey = temp;
  }

  if (!r2AccessKeyId || !r2SecretAccessKey) {
    console.error("[getR2Client] R2 Credentials missing!");
    throw new Error("R2 credentials missing (R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY)");
  }

  return new S3Client({
    region: 'auto',
    endpoint: r2Endpoint,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
    forcePathStyle: true,
  });
}
