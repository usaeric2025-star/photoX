import { api } from '#lib/api.js';
import { logger } from '#lib/logger.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';

/**
 * Check if a photo with the given hash already exists
 */
export async function checkDuplicate(hash: string): Promise<{ exists: boolean; existingId?: string }> {
  try {
    const data = await ErrorFactory.unwrap<{ exists: boolean; photo?: { id: string } }>(
      api.photos['check-hash'].$post({
        json: { hash }
      }),
      '檢查重複項失敗'
    );
    
    return { 
      exists: data.exists || false, 
      existingId: data.photo?.id 
    };
  } catch (error) {
    ErrorFactory.handle(error, { context: '[Duplicate] Error during check', silent: true });
    return { exists: false };
  }
}
