import { getThumbnailUrl as getRawThumbnailUrl } from '#src/services/mappers/utils.js';

export const THUMBNAIL_SIZES = {
  /** 網格 SM 變體 / 軌道 / 卡片縮圖 */
  SM: 120,
  /** 網格 MD 變體 (2-3欄佈局) */
  MD: 400,
  /** 燈箱主圖 / 全螢幕預覽 */
  LG: 800,
} as const;

/**
 * 統一縮圖 URL 產生器
 * 封裝 Hash 處理與尺寸標準
 */
export function getPhotoThumb(
  url: string | null | undefined, 
  size: keyof typeof THUMBNAIL_SIZES, 
  hash?: string | null
): string {
  if (!url) return '';
  const dimension = THUMBNAIL_SIZES[size];
  // 呼叫底層 mapper 工具，確保參數順序正確 (url, width, height, hash)
  return getRawThumbnailUrl(url, dimension, dimension, hash) || url;
}
