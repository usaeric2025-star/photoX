import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const r2Endpoint = process.env.R2_ENDPOINT;
  const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
  const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;

  console.log('R2 Config:', {
    r2Endpoint,
    r2AccessKeyId: r2AccessKeyId ? 'EXISTS (length: ' + r2AccessKeyId.length + ')' : 'MISSING',
    r2SecretAccessKey: r2SecretAccessKey ? 'EXISTS (length: ' + r2SecretAccessKey.length + ')' : 'MISSING',
    bucketName
  });

  try {
    const client = new S3Client({
      region: 'auto',
      endpoint: r2Endpoint,
      credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
      }
    });

    const command = new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 1 });
    const response = await client.send(command);
    console.log('SUCCESS listing objects!', response);
  } catch (err) {
    console.error('FAILED listing objects:', err);
  }
}
test();
