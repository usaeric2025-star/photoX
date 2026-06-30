import { logger } from '../logger.js';

export async function ensureViewExists() {
  logger.info('[View Check] v_photos_list 視圖已廢棄，跳過檢查。');
}

export async function refreshPhotosView() {
  logger.info('[View Refresh] 視圖已廢棄，跳過刷新。');
}
