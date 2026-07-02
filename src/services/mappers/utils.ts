import { getPathFromUrl } from '#lib/utils.js';
import { cleanTranslationPrefixes } from '#src/features/ai/safeText.js';

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

export const mapTranslationField = (value: unknown): { zh: string; en: string; ms: string } => {
  if (!value) return { zh: '', en: '', ms: '' };

  let target: any = value;

  // If it's a string, try parsing it as JSON first
  if (typeof target === 'string') {
    const trimmed = target.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        target = JSON.parse(trimmed);
      } catch (e) {
        // Not valid JSON, keep as is
      }
    }
  }

  // Now, if it's an object, we handle it
  if (target && typeof target === 'object') {
    let zhVal = target.zh;
    let enVal = target.en;
    let msVal = target.ms;

    // Helper to unwrap possible serialized JSON strings inside values
    const unwrapValue = (val: any): any => {
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          try {
            return JSON.parse(trimmed);
          } catch (e) {
            // keep as string
          }
        }
      }
      return val;
    };

    const unwrappedZh = unwrapValue(zhVal);
    const unwrappedEn = unwrapValue(enVal);
    const unwrappedMs = unwrapValue(msVal);

    // If unwrapping any returned a full translation object, use that!
    if (unwrappedZh && typeof unwrappedZh === 'object' && ('zh' in unwrappedZh || 'en' in unwrappedZh || 'ms' in unwrappedZh)) {
      return {
        zh: cleanTranslationPrefixes(String(unwrappedZh.zh || '')).trim(),
        en: cleanTranslationPrefixes(String(unwrappedZh.en || '')).trim(),
        ms: cleanTranslationPrefixes(String(unwrappedZh.ms || '')).trim(),
      };
    }
    if (unwrappedEn && typeof unwrappedEn === 'object' && ('zh' in unwrappedEn || 'en' in unwrappedEn || 'ms' in unwrappedEn)) {
      return {
        zh: cleanTranslationPrefixes(String(unwrappedEn.zh || '')).trim(),
        en: cleanTranslationPrefixes(String(unwrappedEn.en || '')).trim(),
        ms: cleanTranslationPrefixes(String(unwrappedEn.ms || '')).trim(),
      };
    }
    if (unwrappedMs && typeof unwrappedMs === 'object' && ('zh' in unwrappedMs || 'en' in unwrappedMs || 'ms' in unwrappedMs)) {
      return {
        zh: cleanTranslationPrefixes(String(unwrappedMs.zh || '')).trim(),
        en: cleanTranslationPrefixes(String(unwrappedMs.en || '')).trim(),
        ms: cleanTranslationPrefixes(String(unwrappedMs.ms || '')).trim(),
      };
    }

    // Otherwise, just get string values
    const getFinalStr = (val: any) => {
      if (!val) return '';
      if (typeof val === 'object') {
        return cleanTranslationPrefixes(String(val.zh || val.en || val.ms || '')).trim();
      }
      return cleanTranslationPrefixes(String(val)).trim();
    };

    return {
      zh: getFinalStr(zhVal || target.zh_CN || target.zh_TW || ''),
      en: getFinalStr(enVal),
      ms: getFinalStr(msVal || target.my || target.id || ''),
    };
  }

  // If it's just a raw string (and couldn't be parsed as JSON)
  return {
    zh: cleanTranslationPrefixes(String(target)).trim(),
    en: '',
    ms: '',
  };
};
