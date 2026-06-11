import { api } from '@/lib/api';
import { STORAGE_KEYS, safeGetItem, safeSetItem } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

/**
 * 每日維護 Worker
 * 在後台靜默执行，确保系统日志不膨胀，缓存保持洁净
 */
class DailyWorker {
  private isProcessing = false;

  async checkAndRun() {
    if (this.isProcessing) return;

    // 前置检查：只有已登录用户才触发后端清理，避免访客触发产生 401 报错
    const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    if (!session) {
      return;
    }

    const lastRunStr = safeGetItem((STORAGE_KEYS as any).LAST_MAINTENANCE_RUN || 'photo_last_maintenance_day', null);
    const today = new Date().toISOString().split('T')[0];

    if (lastRunStr === today) {
      return; // 今天已执行过
    }

    this.isProcessing = true;
    try {
      logger.info('[DailyWorker] Starting maintenance sync...');
      
      // 1. 触发后端清理
      await api.admin.maintenance['daily-cleanup'].$post();

      // 2. 本地 IDB 冗余键清理 (未来扩展)
      
      safeSetItem((STORAGE_KEYS as any).LAST_MAINTENANCE_RUN || 'photo_last_maintenance_day', today);
      logger.info('[DailyWorker] Maintenance completed successfully.');
    } catch (err) {
      logger.warn('[DailyWorker] Maintenance failed silently', err);
    } finally {
      this.isProcessing = false;
    }
  }
}

export const dailyWorker = new DailyWorker();
