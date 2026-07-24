import { logger } from '../_lib/logger.js';
import { Hono } from "hono";
import { db, furnitureItems } from '../_lib/db/index.js';
import { eq } from "drizzle-orm";
import { getServerEnv } from "../../shared/envSchema.js";
import { getUploadPresignedUrl, deleteFromR2, batchDeleteFromR2 } from '../_lib/storage.js';
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
                return c.json({
                    success: false,
                    error: "照片已存在",
                    existingUrl: existing.imageUrl,
                    photoId: existing.id
                }, 409);
            }
            
            const fileName = `photox/public/${existing.id}.webp`;
            const uploadUrl = await getUploadPresignedUrl(fileName, contentType || 'image/webp');
            
            return successResponse(c, { 
                resuming: true,
                photoId: existing.id,
                uploadUrl,
                publicUrl: `${serverEnv.R2_PUBLIC_URL_PREFIX}/photox/public/${existing.id}.webp`
            });
        }
    }
    
    const fileName = fileKey ? `photox/public/${fileKey}` : `photox/public/${photoId}.webp`;
    const uploadUrl = await getUploadPresignedUrl(fileName, contentType || 'image/webp');
    const publicUrl = `${serverEnv.R2_PUBLIC_URL_PREFIX}/${fileName}`;
    
    return successResponse(c, { uploadUrl, publicUrl });
  })
  .post("/rollback", async (c) => {
    await requireRealUser(c);
    const { imageUrl } = await c.req.json();
    if (!imageUrl) return errorResponse(c, "imageUrl required", 400);

    const urlParts = imageUrl.split('/');
    const key = urlParts.slice(urlParts.indexOf('public') + 1).join('/');
    
    if (!key) return errorResponse(c, "invalid imageUrl format", 400);

    try {
      await deleteFromR2(`photox/public/${key}`);
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

    await batchDeleteFromR2(fileKeys.map(key => `photox/public/${key}`));
    return successResponse(c, null);
});
