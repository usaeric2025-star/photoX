import { logger } from '../logger.js';
import { clearCountCache } from './queries/photos.js';

export async function ensureViewExists() {
  logger.info('[View Check] v_photos_list 視圖已廢棄，跳過檢查。');
}

export async function refreshPhotosView() {
  clearCountCache();
  logger.info('[View Refresh] 視圖已廢棄，緩存已清理。');
}
