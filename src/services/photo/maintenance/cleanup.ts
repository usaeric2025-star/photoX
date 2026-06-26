import { supabase } from '@/lib/supabase';
import { DB_CONFIG } from '@/constants/config';
import { logger } from '@/lib/logger';
import { ErrorFactory } from '@/lib/error/ErrorFactory';

export const cleanUpOrphanRecords = async (): Promise<{ count: number }> => {
  logger.info('[Maintenance] Starting Orphan Records Cleanup...');
  try {
    const { data: orphans, error } = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .select('id')
      .or('image_url.is.null,image_url.eq.""');

    if (error) throw error;
    if (!orphans || orphans.length === 0) {
      return { count: 0 };
    }

    const ids = orphans.map((o: { id: string }) => o.id);
    const { error: delError } = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .delete()
      .in('id', ids);

    if (delError) throw delError;
    logger.info(`[Maintenance] Successfully removed ${ids.length} orphan records.`);
    return { count: ids.length };
  } catch (err) {
    ErrorFactory.capture(err);
    throw err;
  }
};
