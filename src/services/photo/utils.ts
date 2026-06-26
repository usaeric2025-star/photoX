import { supabase } from '../../lib/supabase';
import { Tag, Photo, Dimension } from '../../types';
import { safeArray } from '../../lib/utils';
import { translations, TranslationType } from '@/locales';
import { getSafeText } from '@/features/ai/safeText';
import { getTranslatedCategoryName } from '../category/utils';
import { Category } from '@/types';
import { generateId } from '@/lib/id';

const NEVER_ALLOWED = ['isAnalyzing', 'exif_data', 'is_hidden', 'tempId', 'isSelected', 'isDragging', 'rawResponse'];

export const cleanObject = <T extends Record<string, unknown>>(obj: T): T => {
    const cleaned = { ...obj };
    for (const key of NEVER_ALLOWED) {
        delete cleaned[key];
    }
    return cleaned;
};

export const generateItemCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed O, I, 1, 0
  let random = '';
  // Increased to 8 characters for much lower collision probability (approx 1 in 2.8 trillion)
  for (let i = 0; i < 8; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `X-${random}`; // e.g. X-A8B9C2D4
};

/**
 * Derives a short, human-readable code from a UUID for display purposes.
 * This ensures consistency when talking to AI or searching manually.
 */
export const getDisplayGroupCode = (groupId?: string | null): string => {
  if (!groupId) return '';
  // Use the last 6 characters of the UUID, prefixed with G-
  const short = groupId.split('-').pop()?.slice(-6).toUpperCase() || '';
  return `G-${short}`;
};

export function normalizeUnit(unit: string | null | undefined): 'cm' | 'inch' | 'mm' {
  const u = unit?.toLowerCase().trim();
  if (u === 'in' || u === 'inches' || u === 'inch') return 'inch';
  if (u === 'cm' || u === 'centimeter' || u === 'centimetres') return 'cm';
  if (u === 'mm' || u === 'millimeter' || u === 'millimetres') return 'mm';
  // Default to cm if m or other
  return 'cm';
}

export function validateDimension(dim: Dimension | null | undefined): Dimension | null {
  if (!dim) return null;
  const rawDim = dim as unknown as Record<string, unknown>;
  const value = rawDim.value ?? dim.height ?? dim.width ?? rawDim.length ?? 0;
  const unit = normalizeUnit(rawDim.unit as string | undefined);
  
  return {
    ...dim,
    unit,
    height: Number(dim.height || ((rawDim.label as string)?.includes('H') ? value : 0)) || 0,
    width: Number(dim.width || ((rawDim.label as string)?.includes('W') ? value : 0)) || 0,
    length: Number(rawDim.length || ((rawDim.label as string)?.includes('D') || (rawDim.label as string)?.includes('L') ? value : 0)) || 0
  };
}

/**
 * Gets a fresh UUID
 */
export const getDatabaseUUID = async (): Promise<string> => {
  return generateId(); 
};

// Tag management utils to unify conversion
export const getTagIds = (tags: Tag[] | undefined) => safeArray<Tag>(tags).map(t => String(t.id));

export const getTagsFromIds = (ids: string[], allAvailableTags: Tag[]) => 
  ids.map(id => allAvailableTags.find(t => String(t.id) === id)).filter(Boolean) as Tag[];

/**
 * Gets the display name for a photo, falling back to category name if unnamed.
 */
export const getPhotoDisplayName = (
  photo: Photo,
  categories: Category[],
  lang: string,
  t: TranslationType
): string => {
  const photoNameStr = getSafeText(photo.name, lang);
  
  const isPlaceholder = !photoNameStr || 
    photoNameStr === t.furnitureRecord || 
    photoNameStr === 'Furniture Record' || 
    photoNameStr === '未命名产品' || 
    photoNameStr === (translations as Record<string, { furnitureRecord?: string }>)['zh']?.furnitureRecord ||
    photoNameStr === (translations as Record<string, { furnitureRecord?: string }>)['en']?.furnitureRecord;

  if (!isPlaceholder) return photoNameStr || "";
  
  const catName = getTranslatedCategoryName(photo.category_id || undefined, categories, lang, t);
  if (catName && catName !== t.uncategorized) return catName;

  return t.furniture;
};

interface ResizeOptions {
  width?: number;
  format?: 'auto' | 'webp' | 'avif';
}

/**
 * Resolves an image URL, optionally using the image worker.
 */
export function resolveImageUrl(url: string, options: ResizeOptions = {}): string {
  if (!url || url.startsWith('data:')) return url;
  
  const workerUrl = import.meta.env.VITE_IMAGE_WORKER_URL;
  
  if (workerUrl) {
    const width = options.width || 400;
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      return `${workerUrl.replace(/\/$/, '')}${cleanPath}?width=${width}`;
    } catch (e) {
      const cleanUrl = url.split('?')[0];
      const filename = cleanUrl.split('/').pop() || '';
      return `${workerUrl.replace(/\/$/, '')}/${filename}?width=${width}`;
    }
  }

  // Fallback
  return url;
}

/**
 * Gets a thumbnail URL for a given original URL.
 */
export function getThumbnailUrl(originalUrl: string, width: number, updatedAt?: string) {
  if (!originalUrl) return '';
  if (originalUrl.startsWith('data:')) return originalUrl;

  const workerUrl = import.meta.env.VITE_IMAGE_WORKER_URL;
  const r2Base = import.meta.env.VITE_R2_BASE_URL || import.meta.env.VITE_R2_PUBLIC_URL_PREFIX;
  
  try {
    const url = new URL(originalUrl);
    const path = url.pathname;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const cacheBuster = updatedAt ? `&t=${new Date(updatedAt).getTime()}` : '';
    
    if (workerUrl) {
      return `${workerUrl.replace(/\/$/, '')}${cleanPath}?width=${width}${cacheBuster}`;
    }
    
    if (r2Base) {
      return `${r2Base.replace(/\/$/, '')}${cleanPath}`;
    }
    
    return originalUrl;
  } catch (e) {
    return originalUrl;
  }
}

/**
 * 取得照片縮圖 URL（包裝函式）
 */
export function getPhotoThumbUrl(
  photo: { image_url?: string; uri?: string; updated_at?: string },
  size: 'sm' | 'md' | 'lg' = 'sm'
): string {
  const url = photo.image_url || photo.uri || '';
  const sizeMap = { sm: 120, md: 400, lg: 800 };
  const width = sizeMap[size];
  return getThumbnailUrl(url, width, photo.updated_at);
}

/**
 * Gets a cache-busted image URL.
 */
export const getCacheBustedImageUrl = (photo: Photo, type: 'image' | 'thumb' = 'image'): string => {
  const url = type === 'thumb' ? (photo.thumbnail_sm_url || photo.image_url || photo.uri) : (photo.image_url || photo.uri);
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  
  const timestamp = photo.updated_at ? new Date(photo.updated_at).getTime() : 
                   (photo.created_at ? new Date(photo.created_at).getTime() : 0);
  
  if (timestamp === 0) return url;
  return `${url}${url.includes('?') ? '&' : '?'}t=${timestamp}`;
};
