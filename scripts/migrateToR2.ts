import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey || supabaseKey === 'YOUR_SUPABASE_SERVICE_KEY') {
    console.error('Please configure SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.migration');
    process.exit(1);
  }

  const r2Endpoint = process.env.R2_ENDPOINT || 'https://3e1f6d6a9c0f2526239f23a5809fc667.r2.cloudflarestorage.com';
  const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
  const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const r2BucketName = process.env.R2_BUCKET_NAME || 'photox-storage';

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
  const { data: photos, error } = await supabase.from('furniture_items').select('id, image_url, thumb_url');

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
      const sourceUrl = photo.image_url;
      const thumbSourceUrl = photo.thumb_url;

      if (!sourceUrl) {
         console.log(`No image_url for ${photo.id}, skipping download.`);
         continue;
      }

      console.log(`Downloading main image ${sourceUrl}...`);
      
      const response = await fetch(sourceUrl);
      if (!response.ok) {
        throw new Error(`Failed to download main image: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const filename = sourceUrl.split('/').pop();
      const objectKey = `photox/public/${filename}`;
      console.log(`Uploading to R2: ${objectKey}...`);

      await s3.send(
        new PutObjectCommand({
          Bucket: r2BucketName,
          Key: objectKey,
          Body: buffer,
          ContentType: 'image/webp',
        })
      );

      // Try migrating thumbnail as well
      if (thumbSourceUrl) {
         try {
           console.log(`Downloading thumbnail ${thumbSourceUrl}...`);
           const thumbRes = await fetch(thumbSourceUrl);
           if (thumbRes.ok) {
             const thumbBuffer = Buffer.from(await thumbRes.arrayBuffer());
             const thumbFilename = thumbSourceUrl.split('/').pop();
             const thumbKey = `photox/public/${thumbFilename}`;
             await s3.send(
               new PutObjectCommand({
                 Bucket: r2BucketName,
                 Key: thumbKey,
                 Body: thumbBuffer,
                 ContentType: 'image/webp',
               })
             );
             console.log(`Uploaded thumbnail to R2: ${thumbKey}`);
           } else {
             console.log(`Thumbnail not found or could not download (Status: ${thumbRes.status}), skipping...`);
           }
         } catch (thumbErr) {
           console.log(`Error processing thumbnail for ${photo.id}, skipping.`, thumbErr);
         }
      }

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
