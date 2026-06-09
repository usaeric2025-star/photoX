import { api } from '@/lib/api';
import { STORAGE_KEYS, safeGetItem, safeSetItem } from '@/lib/storage';

/**
 * 每日維護 Worker
 * 在後台靜默執行，確保系統日誌不膨脹，緩存保持潔淨
 */
class DailyWorker {
  private isProcessing = false;

  async checkAndRun() {
    if (this.isProcessing) return;

    const lastRunStr = safeGetItem((STORAGE_KEYS as any).LAST_MAINTENANCE_RUN || 'photo_last_maintenance_day', null);
    const today = new Date().toISOString().split('T')[0];

    if (lastRunStr === today) {
      return; // 今天已執行過
    }

    this.isProcessing = true;
    try {
      console.log('[DailyWorker] Starting maintenance sync...');
      
      // 1. 觸發後端清理
      await api.admin.maintenance['daily-cleanup'].$post();

      // 2. 本地 IDB 冗餘鍵清理 (未來擴展)
      
      safeSetItem((STORAGE_KEYS as any).LAST_MAINTENANCE_RUN || 'photo_last_maintenance_day', today);
      console.log('[DailyWorker] Maintenance completed successfully.');
    } catch (err) {
      console.warn('[DailyWorker] Maintenance failed silently', err);
    } finally {
      this.isProcessing = false;
    }
  }
}

export const dailyWorker = new DailyWorker();
