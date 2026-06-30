import { getPathFromUrl } from '@/lib/utils';
import { cleanTranslationPrefixes } from '@/features/ai/safeText';

/**
 * 取得圖片 URL（支援縮圖）
 * @param imageUrlOrKey - 原始 URL 或 R2 檔案 Key
 * @param width - 縮圖寬度（可選）
 * @param height - 縮圖高度（可選）
 * @param imageHash - 快取失效標籤（可選）
 * @returns 圖片 URL
 */
export const getThumbnailUrl = (imageUrlOrKey: string, width?: number, height?: number, imageHash?: string) => {
  if (!imageUrlOrKey) return '';
  if (imageUrlOrKey.startsWith('data:')) return imageUrlOrKey;

  const env = import.meta.env;
  const workerUrl = env.VITE_IMAGE_WORKER_URL;
  
  // If we have a worker, we can resize
  if (workerUrl) {
    const path = getPathFromUrl(imageUrlOrKey);
    const key = path || imageUrlOrKey;
    const cleanKey = key.startsWith('/') ? key.slice(1) : key;
    
    const params = new URLSearchParams();
    if (width) params.set('w', String(width));
    if (height) params.set('h', String(height));
    if (imageHash) params.set('v', imageHash.slice(0, 8));
    
    const query = params.toString();
    const baseUrl = workerUrl.endsWith('/') ? workerUrl.slice(0, -1) : workerUrl;
    return `${baseUrl}/${cleanKey}${query ? `?${query}` : ''}`;
  }

  // If no worker, return the original URL as is, assuming it's already a public R2 URL
  return imageUrlOrKey;
};

export function normalizeStoredUrl(url: string | undefined | null): string {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    
    let processedUrl = url;
    if (processedUrl.includes('/products/')) {
        processedUrl = processedUrl
            .replace('/products/', '/')
            .replace(/\/(\d+-[a-z0-9]+\.webp)$/i, '/temp-$1');
    }
    
    const match = processedUrl.match(/photox\/(public|thumb|original)\/(.+)/);
    if (match) {
        const pathAndFilename = match[0];
        const r2Base = import.meta.env.VITE_R2_BASE_URL || import.meta.env.VITE_R2_PUBLIC_URL_PREFIX || 'https://pub-ffc4b0692ab74fabb58cbccc5287d7b1.r2.dev';
        const cleanBase = r2Base.endsWith('/') ? r2Base.slice(0, -1) : r2Base;
        return `${cleanBase}/${pathAndFilename}`;
    }
    
    return processedUrl;
}

export const mapTranslationField = (value: unknown) => {
  if (typeof value === 'string') {
    return { zh: cleanTranslationPrefixes(value).trim(), en: '', ms: '' };
  } else if (value && typeof value === 'object') {
    let obj = value as Record<string, unknown>;
    if (obj.zh && typeof obj.zh === 'object' && obj.zh !== null && ('zh' in obj.zh || 'en' in obj.zh || 'ms' in obj.zh)) {
      obj = obj.zh as Record<string, unknown>;
    }
    return {
      zh: cleanTranslationPrefixes(String(obj.zh || '')).trim(),
      en: cleanTranslationPrefixes(String(obj.en || '')).trim(),
      ms: cleanTranslationPrefixes(String(obj.ms || '')).trim(),
    };
  }
  return value;
};
