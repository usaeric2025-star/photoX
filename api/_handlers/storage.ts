import { logger } from '../_lib/logger.js';
import { Hono } from "hono";
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand, CopyObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db, systemLogs, furnitureItems } from '../_lib/db/index.js';
import { eq } from "drizzle-orm";
import { getServerEnv } from "../_shared/envSchema.js";
import { getR2Client } from "../_lib/storage.js";
import { requireRealUser } from "../_lib/auth.js";

const serverEnv = getServerEnv(process.env);
export const storage = new Hono();

storage.post("/log-error", async (c) => {
    try {
        const body = await c.req.json();
        const metadata = body.metadata || {};
        const payload = {
            errorMessage: String(body.error_message || body.message || 'Unknown error').substring(0, 5000),
            stackTrace: (body.stack_trace || body.stack || body.component_stack || null) as string | null,
            url: body.url || '',
            context: metadata.context || body.context || 'global',
            metadata: {
                ...metadata,
                level: metadata.level || body.level || 'error'
            },
            createdAt: new Date()
        };
        
        await db.insert(systemLogs).values(payload as any);
        return c.json({ success: true });
    } catch (e: unknown) {
        logger.error("Error logging via /log-error", e);
        return c.json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }, 500);
    }
});

storage.post("/upload-direct", async (c) => {
    try {
      await requireRealUser(c);
      const { base64Data, fileKey, contentType } = await c.req.json();
      if (!base64Data || !fileKey) return c.json({ error: "base64Data and fileKey required" }, 400);

      let uint8Array: Uint8Array;
      try {
        const buf = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        uint8Array = new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
      } catch (err: unknown) {
        throw new Error('Invalid base64 data');
      }

      const fileName = `photox/public/${fileKey}`;
      const s3Client = await getR2Client();
      const bucketName = serverEnv.R2_BUCKET_NAME;
      if (!bucketName) throw new Error("R2_BUCKET_NAME missing");

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        ContentType: contentType || 'image/webp',
        Body: uint8Array,
      });
      
      await s3Client.send(command);
      
      if (!serverEnv.R2_PUBLIC_URL_PREFIX) throw new Error("R2_PUBLIC_URL_PREFIX missing");
      const publicUrl = `${serverEnv.R2_PUBLIC_URL_PREFIX}/${fileName}`;
      
      return c.json({ success: true, data: { publicUrl } });
    } catch(e: unknown) {
      return c.json({ success: false, error: (e as Error).message }, 500);
    }
});

storage.post("/upload-presign", async (c) => {
    try {
      await requireRealUser(c);
      const { photoId, fileKey, contentType, imageHash, force } = await c.req.json();
      if (!photoId && !fileKey) return c.json({ error: "photoId or fileKey required" }, 400);

      // 排重检查
      if (imageHash && !force) {
        const existing = await db.query.furnitureItems.findFirst({
            columns: { id: true, imageUrl: true, imageHash: true },
            where: eq(furnitureItems.imageHash, imageHash)
        });
        
        if (existing) {
          if (existing.imageUrl && (existing.imageUrl.startsWith('http') || existing.imageUrl.startsWith('https'))) {
            return c.json({ 
              success: false,
              error: "照片已存在",
              duplicateId: existing.id,
              existingUrl: existing.imageUrl 
            }, 409);
          }
          
          return c.json({ 
            success: true, 
            data: { 
              resuming: true,
              photoId: existing.id,
              uploadUrl: await (async () => {
                const fileName = `photox/public/${existing.id}.webp`;
                const s3Client = await getR2Client();
                const bucketName = serverEnv.R2_BUCKET_NAME;
                const command = new PutObjectCommand({
                  Bucket: bucketName!,
                  Key: fileName,
                  ContentType: contentType || 'image/webp',
                });
                return getSignedUrl(s3Client, command, { expiresIn: 300 });
              })(),
              publicUrl: `${serverEnv.R2_PUBLIC_URL_PREFIX}/photox/public/${existing.id}.webp`
            } 
          });
        }
      }
      
      const fileName = fileKey ? `photox/public/${fileKey}` : `photox/public/${photoId}.webp`;
      const s3Client = await getR2Client();
      
      const bucketName = serverEnv.R2_BUCKET_NAME;
      if (!bucketName) throw new Error("R2_BUCKET_NAME missing");

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        ContentType: contentType || 'image/webp',
      });
      
      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
      if (!serverEnv.R2_PUBLIC_URL_PREFIX) throw new Error("R2_PUBLIC_URL_PREFIX missing");
      const publicUrl = `${serverEnv.R2_PUBLIC_URL_PREFIX}/${fileName}`;
      
      return c.json({ success: true, data: { uploadUrl, publicUrl } });
    } catch(e: unknown) {
      return c.json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }, 500);
    }
});

storage.post("/r2-delete", async (c) => {
    try {
      await requireRealUser(c);
      const { fileKeys } = await c.req.json();
      if (!fileKeys || !Array.isArray(fileKeys)) {
        return c.json({ success: false, error: "fileKeys array required" }, 400);
      }

      const s3Client = await getR2Client();
      const bucketName = serverEnv.R2_BUCKET_NAME;
      if (!bucketName) throw new Error("R2_BUCKET_NAME missing");

      await Promise.allSettled(fileKeys.map(async (key) => {
          const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: `photox/public/${key}`,
          });
          return s3Client.send(command).catch(err => {
              logger.error(`Failed to delete key ${key}:`, err);
          });
      }));

      return c.json({ success: true });
    } catch(e: unknown) {
      return c.json({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }, 500);
    }
});
