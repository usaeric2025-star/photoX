import { sql } from 'drizzle-orm';
import { db } from './index.js';
import { logger } from '../logger.js';

export async function refreshPhotosView() {
  try {
    // Concurrent refresh: non-blocking, requiring unique index on materialized view.
    await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY v_photos_list`);
    logger.info('[View Refresh] Materialized view v_photos_list updated concurrently');
  } catch (err: unknown) {
    logger.warn('[View Refresh] Concurrent refresh failed, trying simple refresh:', err);
    try {
      await db.execute(sql`REFRESH MATERIALIZED VIEW v_photos_list`);
      logger.info('[View Refresh] Materialized view v_photos_list updated successfully with simple refresh');
    } catch (fallbackErr: unknown) {
      logger.error('[View Refresh] Fallback refresh failed:', fallbackErr);
    }
  }
}
