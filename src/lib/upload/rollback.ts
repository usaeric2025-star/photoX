import { api } from '#lib/api.js';
import { logger } from '#lib/logger.js';

/**
 * Rollback an R2 upload if database save fails
 */
export async function rollbackUpload(imageUrl: string): Promise<void> {
  try {
    const res = await api.storage.rollback.$post({
      json: { imageUrl }
    });
    if (!res.ok) {
        logger.warn('[Rollback] Server returned error:', res.status);
    }
  } catch (error) {
    logger.warn('[Rollback] Failed to delete orphan file:', imageUrl, error);
  }
}
