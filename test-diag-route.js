import { getR2Client } from './api/lib/storage.js';
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const envKeys = ["R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_URL_PREFIX"];
  const configState = {};
  
  for (const key of envKeys) {
    const val = process.env[key];
    configState[key] = { exists: !!val, length: val ? String(val).length : 0 };
  }

  let s3Client;
  try {
    s3Client = await getR2Client();
    console.log('Client instantiated successfully');
  } catch (clientErr) {
    console.error('Instantiation error:', clientErr);
    return;
  }

  try {
    const bucketName = process.env.R2_BUCKET_NAME;
    const command = new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 1 });
    await s3Client.send(command, { abortSignal: AbortSignal.timeout(4000) });
    console.log('SUCCESS connecting to R2!');
  } catch (s3Err) {
    console.error('Connection error:', s3Err);
  }
}
test();
