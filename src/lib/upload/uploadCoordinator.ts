import { UploadTask, UploadResult } from './types.js';
import { checkDuplicate } from './duplicate.js';
import { compressImage } from './compression.js';
import { uploadToR2 } from './storage.js';
import { savePhoto } from './savePhoto.js';
import { rollbackUpload } from './rollback.js';
import { generateId } from '#lib/id.js';
import { logger } from '#lib/logger.js';

/**
 * Orchestrate the upload process:
 * 1. Duplicate check (via hash)
 * 2. Compression (via Worker)
 * 3. Storage (via R2)
 * 4. Database save (via Hono API)
 * 5. Rollback on failure
 */
export async function processUpload(task: UploadTask): Promise<UploadResult> {
  const { file, hash } = task;

  // 1. Duplicate Check (using original hash)
  const duplicate = await checkDuplicate(hash);
  if (duplicate.exists) {
    logger.info(`[Upload] Duplicate found for hash ${hash.substring(0, 8)}: ${duplicate.existingId}`);
    return { success: true, duplicate: true, id: duplicate.existingId };
  }

  // 2. Compression
  const compressed = await compressImage(file);
  const photoId = generateId();
  
  // 3. Storage (Upload to R2)
  let imageUrl: string;
  try {
    imageUrl = await uploadToR2(compressed.blob, photoId, hash);
  } catch (error) {
    logger.error('[Upload] Storage failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Storage upload failed' };
  }

  // 4. Database Save
  try {
    const id = await savePhoto({
      id: photoId,
      imageUrl,
      imageHash: hash,
      width: compressed.width,
      height: compressed.height,
      name: file.name,
      groupId: task.groupId
    });

    return {
      success: true,
      id,
      imageUrl,
      fallback: compressed.fallback
    };
  } catch (error) {
    logger.error('[Upload] Database save failed, rolling back storage:', error);
    // Rollback: delete the uploaded R2 file to prevent orphans
    await rollbackUpload(imageUrl);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Database save failed'
    };
  }
}
