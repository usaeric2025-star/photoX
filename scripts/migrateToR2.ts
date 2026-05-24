import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.migration explicitly
dotenv.config({ path: path.join(__dirname, '../.env.migration') });

async function migrate() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey || supabaseKey === 'YOUR_SUPABASE_SERVICE_KEY') {
    console.error('Please configure SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.migration');
    process.exit(1);
  }

  const r2Endpoint = process.env.R2_ENDPOINT;
  const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
  const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const r2BucketName = process.env.R2_BUCKET_NAME;

  if (!r2Endpoint || !r2AccessKeyId || !r2SecretAccessKey || !r2BucketName) {
    console.error('Missing R2 environment variables in .env.migration');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const s3 = new S3Client({
    region: 'auto',
    endpoint: r2Endpoint,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
  });

  const migratedFile = path.join(__dirname, 'migrated.json');
  const failedFile = path.join(__dirname, 'failed.json');

  let migrated: string[] = [];
  let failed: { id: string; error: string }[] = [];

  if (fs.existsSync(migratedFile)) {
    migrated = JSON.parse(fs.readFileSync(migratedFile, 'utf-8'));
  }
  if (fs.existsSync(failedFile)) {
    failed = JSON.parse(fs.readFileSync(failedFile, 'utf-8'));
  }

  console.log('Fetching photos from Supabase...');
  const { data: photos, error } = await supabase.from('photos').select('id, image_url');

  if (error) {
    console.error('Failed to fetch photos:', error);
    return;
  }

  if (!photos) {
    console.log('No photos found.');
    return;
  }

  console.log(`Found ${photos.length} photos.`);

  let successCount = 0;
  let failureCount = 0;
  const skippedCount = migrated.length;

  for (const photo of photos) {
    if (migrated.includes(photo.id)) {
      continue;
    }

    try {
      const sourceUrl = `${supabaseUrl}/storage/v1/object/public/furniture_images/public/${photo.id}.webp`;
      console.log(`Downloading ${sourceUrl}...`);
      
      const response = await fetch(sourceUrl);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const objectKey = `photox/public/${photo.id}.webp`;
      console.log(`Uploading to R2: ${objectKey}...`);

      await s3.send(
        new PutObjectCommand({
          Bucket: r2BucketName,
          Key: objectKey,
          Body: buffer,
          ContentType: 'image/webp',
        })
      );

      migrated.push(photo.id);
      successCount++;
      
      // Save progress so we don't lose it if it crashes
      fs.writeFileSync(migratedFile, JSON.stringify(migrated, null, 2));
      console.log(`Successfully migrated ${photo.id}`);

    } catch (err: any) {
      console.error(`Failed to migrate ${photo.id}:`, err.message);
      failed.push({ id: photo.id, error: err.message });
      failureCount++;
      fs.writeFileSync(failedFile, JSON.stringify(failed, null, 2));
    }
  }

  console.log('Migration Complete.');
  console.log(`Successfully migrated: ${successCount}`);
  console.log(`Failed: ${failureCount}`);
  console.log(`Skipped (already migrated): ${skippedCount}`);
}

migrate();
