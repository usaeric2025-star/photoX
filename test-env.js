import dotenv from 'dotenv';
dotenv.config();

const envKeys = ["R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_URL_PREFIX"];
console.log('--- Server Process Env Check ---');
for (const key of envKeys) {
  const val = process.env[key];
  console.log(`${key}: ${val ? 'EXISTS (length: ' + val.length + ')' : 'MISSING'}`);
}
