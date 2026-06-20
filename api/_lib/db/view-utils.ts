import { sql } from 'drizzle-orm';
import { db } from './index.js';
import { logger } from '../logger.js';

/**
 * 刷新物化視圖 v_photos_list
 * 考慮到性能，使用 CONCURRENTLY 模式（需要視圖上有唯一索引）
 */
export async function refreshPhotosView() {
  try {
    logger.info('[DB] Refreshing materialized view v_photos_list concurrently...');
    const start = Date.now();
    
    // Drizzle 目前對 REFRESH MATERIALIZED VIEW 的原生支持較少，直接用 sql
    await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY v_photos_list`);
    
    const duration = Date.now() - start;
    logger.info(`[DB] View v_photos_list refreshed in ${duration}ms`);
  } catch (err) {
    // 如果 CONCURRENTLY 報錯（例如索引消失），回退到普通刷新
    try {
      logger.warn('[DB] Concurrent refresh failed, falling back to standard refresh:', err);
      await db.execute(sql`REFRESH MATERIALIZED VIEW v_photos_list`);
    } catch (fallbackErr) {
      logger.error('[DB] Failed to refresh materialized view:', fallbackErr);
    }
  }
}
