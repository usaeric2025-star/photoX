import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { generateThumbHash } from '@/lib/image/thumbHash';
import { updatePhoto as updatePhotoInCloud } from '../commands';

import { StandardError } from '@/lib/validators/protocol';

export interface BackfillStats {
  total: number;
  processed: number;
  success: number;
  failed: number;
}

/**
 * 扫描并为缺失 ThumbHash 的照片回填该字段
 */
export async function backfillThumbHashes(onProgress: (stats: BackfillStats) => void) {
  // 1. 获取所有没有 thumb_hash 的照片
  const { data: photos, error } = await supabase
    .from('furniture_items')
    .select('id, image_url')
    .is('thumb_hash', null);

  if (error) {
    throw new StandardError(error.message, { 
      originalError: error,
      aiDebugHint: `[backfillThumbHashes] 底層異常: ${error.message}` 
    });
  }
  if (!photos || photos.length === 0) return;

  const stats: BackfillStats = {
    total: photos.length,
    processed: 0,
    success: 0,
    failed: 0
  };

  onProgress({ ...stats });

  // 2. 逐个处理（为避免并发压力，采用串行或小批量并行）
  for (const photo of photos) {
    try {
      // 生成 Hash (fetch 可能会受跨域 CORS 影响，如果存储配置了 CORS 没问题)
      const hash = await generateThumbHash(photo.image_url);
      if (hash) {
        await updatePhotoInCloud(photo.id, { thumb_hash: hash });
        stats.success++;
      } else {
        stats.failed++;
      }
    } catch (err) {
      logger.error(`[Backfill] Failed for ${photo.id}:`, err);
      stats.failed++;
    } finally {
      stats.processed++;
      onProgress({ ...stats });
    }
    
    // 给 UI 一点喘息空间
    await new Promise(r => setTimeout(r, 100));
  }
}
