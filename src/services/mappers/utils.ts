import { getPathFromUrl } from '@/lib/utils';
import { cleanTranslationPrefixes } from '@/services/ai/safeText';

export const getThumbnailUrl = (imageUrl: string, width: number = 400, height: number = 400, imageHash?: string) => {
  const workerUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_THUMBNAIL_WORKER_URL : undefined;
  if (!workerUrl || !imageUrl || !workerUrl.startsWith('http')) return imageUrl;
  
  const path = getPathFromUrl(imageUrl);
  if (!path) return imageUrl;
  
  const base = workerUrl.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  const cacheBuster = imageHash ? `&h=${imageHash.slice(0,8)}` : '';
  
  return `${base}${cleanPath}?w=${width}&h=${height}${cacheBuster}`;
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
        return `https://pub-ffc4b0692ab74fabb58cbccc5287d7b1.r2.dev/${pathAndFilename}`;
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
