import { logger } from '../_lib/logger.js';
import { Hono } from "hono";
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand, CopyObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db, systemLogs, furnitureItems } from '../_lib/db/index.js';
import { eq } from "drizzle-orm";
import { getServerEnv } from "../../shared/envSchema.js";
import { getR2Client } from '../_lib/storage.js';
import { requireRealUser } from '../_lib/auth.js';
import { errorResponse, successResponse } from '../_lib/response.js';

const serverEnv = getServerEnv(process.env);
export const storage = new Hono()
  .post("/upload-presign", async (c) => {
    await requireRealUser(c);
    const { photoId, fileKey, contentType, imageHash, force } = await c.req.json();
    if (!photoId && !fileKey) return errorResponse(c, "photoId or fileKey required", 400);

    // 排重检查
    if (imageHash && !force) {
        const existing = await db.query.furnitureItems.findFirst({
            columns: { id: true, imageUrl: true, imageHash: true },
            where: eq(furnitureItems.imageHash, imageHash)
        });
        
        if (existing) {
            if (existing.imageUrl && (existing.imageUrl.startsWith('http') || existing.imageUrl.startsWith('https'))) {
                return errorResponse(c, "照片已存在", 409);
            }
            
            return successResponse(c, { 
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
    
    return successResponse(c, { uploadUrl, publicUrl });
  })
  .post("/rollback", async (c) => {
    await requireRealUser(c);
    const { imageUrl } = await c.req.json();
    if (!imageUrl) return errorResponse(c, "imageUrl required", 400);

    // Extract key from URL
    // URL format: https://.../photox/public/filename.webp
    const urlParts = imageUrl.split('/');
    const key = urlParts.slice(urlParts.indexOf('public') + 1).join('/');
    
    if (!key) return errorResponse(c, "invalid imageUrl format", 400);

    const s3Client = await getR2Client();
    const bucketName = serverEnv.R2_BUCKET_NAME;
    if (!bucketName) throw new Error("R2_BUCKET_NAME missing");

    try {
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: `photox/public/${key}`,
      });
      await s3Client.send(command);
      logger.info(`[Rollback] Deleted orphan file: ${key}`);
      return successResponse(c, { success: true });
    } catch (err) {
      logger.error(`[Rollback] Failed to delete orphan file ${key}:`, err);
      return errorResponse(c, "rollback failed", 500);
    }
  })
  .post("/r2-delete", async (c) => {
    await requireRealUser(c);
    const { fileKeys } = await c.req.json();
    if (!fileKeys || !Array.isArray(fileKeys)) {
        return errorResponse(c, "fileKeys array required", 400);
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

    return successResponse(c, null);
});
