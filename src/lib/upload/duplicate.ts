import { api } from '#lib/api.js';
import { logger } from '#lib/logger.js';

/**
 * Check if a photo with the given hash already exists
 */
export async function checkDuplicate(hash: string): Promise<{ exists: boolean; existingId?: string }> {
  try {
    const res = await api.photos['check-hash'].$post({
      json: { hash }
    });

    if (!res.ok) {
      logger.warn('[Duplicate] Check failed, assuming not duplicate', res.status);
      return { exists: false };
    }

    const data = await res.json() as any;
    return { 
      exists: data.exists || data.isDuplicate || false, 
      existingId: data.id || data.existingId 
    };
  } catch (error) {
    logger.error('[Duplicate] Error during check', error);
    return { exists: false };
  }
}
