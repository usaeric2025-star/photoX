import { getPathFromUrl } from '#lib/utils.js';
import { cleanTranslationPrefixes } from '#src/features/ai/safeText.js';
import { getEnv } from '#lib/env.js';

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

  const workerUrl = getEnv('VITE_IMAGE_WORKER_URL');
  
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

  // Legacy temporary fix for some broken paths
  if (processedUrl.includes('/products/')) {
    processedUrl = processedUrl
      .replace('/products/', '/')
      .replace(/\/(\d+-[a-z0-9]+\.webp)$/i, '/temp-$1');
  }

  // Ensure it includes the bucket path
  const match = processedUrl.match(/photox\/(public|thumb|original)\/(.+)/);
  if (match) {
    const pathAndFilename = match[0];
    const r2Base = getEnv('VITE_R2_BASE_URL') || getEnv('VITE_R2_PUBLIC_URL_PREFIX') || 'https://pub-ffc4b0692ab74fabb58cbccc5287d7b1.r2.dev';
    const cleanBase = r2Base.endsWith('/') ? r2Base.slice(0, -1) : r2Base;
    return `${cleanBase}/${pathAndFilename}`;
  }

  return processedUrl;
}

export const mapTranslationField = (value: unknown): { zh: string; en: string; ms: string } => {
  if (!value) return { zh: '', en: '', ms: '' };

  let target: unknown = value;

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
  if (target && typeof target === 'object' && !Array.isArray(target)) {
    const t = target as Record<string, unknown>;
    let zhVal = t.zh;
    let enVal = t.en;
    let msVal = t.ms;

    // Helper to unwrap possible serialized JSON strings inside values
    const unwrapValue = (val: unknown): unknown => {
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
    if (unwrappedZh && typeof unwrappedZh === 'object' && !Array.isArray(unwrappedZh)) {
      const uZ = unwrappedZh as Record<string, unknown>;
      if ('zh' in uZ || 'en' in uZ || 'ms' in uZ) {
        return {
          zh: cleanTranslationPrefixes(String(uZ.zh || '')).trim(),
          en: cleanTranslationPrefixes(String(uZ.en || '')).trim(),
          ms: cleanTranslationPrefixes(String(uZ.ms || '')).trim(),
        };
      }
    }

    if (unwrappedEn && typeof unwrappedEn === 'object' && !Array.isArray(unwrappedEn)) {
      const uE = unwrappedEn as Record<string, unknown>;
      if ('zh' in uE || 'en' in uE || 'ms' in uE) {
        return {
          zh: cleanTranslationPrefixes(String(uE.zh || '')).trim(),
          en: cleanTranslationPrefixes(String(uE.en || '')).trim(),
          ms: cleanTranslationPrefixes(String(uE.ms || '')).trim(),
        };
      }
    }

    if (unwrappedMs && typeof unwrappedMs === 'object' && !Array.isArray(unwrappedMs)) {
      const uM = unwrappedMs as Record<string, unknown>;
      if ('zh' in uM || 'en' in uM || 'ms' in uM) {
        return {
          zh: cleanTranslationPrefixes(String(uM.zh || '')).trim(),
          en: cleanTranslationPrefixes(String(uM.en || '')).trim(),
          ms: cleanTranslationPrefixes(String(uM.ms || '')).trim(),
        };
      }
    }

    // Otherwise, just get string values
    const getFinalStr = (val: unknown) => {
      if (!val) return '';
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        const v = val as Record<string, unknown>;
        return cleanTranslationPrefixes(String(v.zh || v.en || v.ms || '')).trim();
      }
      return cleanTranslationPrefixes(String(val)).trim();
    };

    return {
      zh: getFinalStr(zhVal || (target as Record<string, unknown>).zh_CN || (target as Record<string, unknown>).zh_TW || ''),
      en: getFinalStr(enVal),
      ms: getFinalStr(msVal || (target as Record<string, unknown>).my || (target as Record<string, unknown>).id || ''),
    };
  }

  // If it's just a raw string (and couldn't be parsed as JSON)
  return {
    zh: cleanTranslationPrefixes(String(target)).trim(),
    en: '',
    ms: '',
  };
};

/**
 * 泛用的欄位資料庫映射工具，減少多個 commands.ts 中的重複程式碼
 */
export const mapFieldsToDb = (
  updates: Record<string, any>,
  allowedFields: string[],
  neverAllowed: string[],
  fieldMap: Record<string, string>
): Record<string, any> => {
  const dbUpdates: Record<string, any> = {};

  for (const key of allowedFields) {
    if (key in updates && !neverAllowed.includes(key)) {
      const dbKey = fieldMap[key] || key;
      dbUpdates[dbKey] = updates[key];
    }
  }

  return dbUpdates;
};
