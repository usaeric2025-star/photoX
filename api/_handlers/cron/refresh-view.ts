import { Hono } from 'hono';
import { refreshPhotosView } from '../../_lib/db/actions.js';

export const cronRefreshView = new Hono();

cronRefreshView.get('/', async (c) => {
  try {
    await refreshPhotosView();
    return c.json({ success: true, message: '物化視圖已刷新' });
  } catch (error) {
    console.error('[Cron] 視圖刷新失敗:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});
