import "dotenv/config";
import { S3Client, GetBucketCorsCommand } from "@aws-sdk/client-s3";

async function checkCors() {
  const r2Endpoint = process.env.R2_ENDPOINT || 'https://3e1f6d6a9c0f2526239f23a5809fc667.r2.cloudflarestorage.com';
  let r2AccessKeyId = process.env.R2_ACCESS_KEY_ID || '';
  let r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
  
  if (r2AccessKeyId.length === 64 && r2SecretAccessKey.length === 32) {
    const temp = r2AccessKeyId;
    r2AccessKeyId = r2SecretAccessKey;
    r2SecretAccessKey = temp;
  }

  const s3Client = new S3Client({
    region: 'auto',
    endpoint: r2Endpoint,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
    forcePathStyle: true,
  });

  try {
    const bucket = process.env.R2_BUCKET_NAME || 'photox-storage';
    const command = new GetBucketCorsCommand({ Bucket: bucket });
    const response = await s3Client.send(command);
    console.log(JSON.stringify(response.CORSRules, null, 2));
  } catch (error) {
    console.error("Error fetching CORS rules:", error);
  }
}

checkCors();
