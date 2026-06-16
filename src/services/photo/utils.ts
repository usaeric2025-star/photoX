import { supabase } from '../../lib/supabase';
import { Tag, Photo, Dimension } from '../../types';
import { safeArray } from '../../lib/utils';
import { translations, TranslationType } from '@/locales';
import { getSafeText } from '@/services/ai/safeText';
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
  const value = (dim as any).value ?? dim.height ?? dim.width ?? (dim as any).length ?? 0;
  const unit = normalizeUnit((dim as any).unit);
  
  return {
    ...dim,
    unit,
    height: Number(dim.height || ((dim as any).label?.includes('H') ? value : 0)) || 0,
    width: Number(dim.width || ((dim as any).label?.includes('W') ? value : 0)) || 0,
    length: Number((dim as any).length || ((dim as any).label?.includes('D') || (dim as any).label?.includes('L') ? value : 0)) || 0
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
    photoNameStr === (translations as Record<string, any>)['zh']?.furnitureRecord ||
    photoNameStr === (translations as Record<string, any>)['en']?.furnitureRecord;

  if (!isPlaceholder) return photoNameStr || "";
  
  const catName = getTranslatedCategoryName(photo.category_id || undefined, categories, lang, t);
  if (catName && catName !== t.uncategorized) return catName;

  return t.furniture;
};

export interface ResizeOptions {
  width?: number;
  format?: 'auto' | 'webp' | 'avif';
}

/**
 * Resolves an image URL, optionally using the thumbnail worker.
 */
export function resolveImageUrl(url: string, options: ResizeOptions = {}): string {
  if (!url || url.startsWith('data:')) return url;
  
  const workerUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_THUMBNAIL_WORKER_URL : undefined;
  
  if (workerUrl) {
    const width = options.width || 400; // Default
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      return `${workerUrl.replace(/\/$/, '')}${path}?w=${width}&h=${width}`;
    } catch (e) {
      // Fallback if URL parsing fails
      const cleanUrl = url.split('?')[0];
      return `${workerUrl.replace(/\/$/, '')}/${cleanUrl.split('/').pop()}?w=${width}&h=${width}`;
    }
  }

  // Fallback for direct R2 resizing (if for some reason worker is not configured)
  const isResizingSupported = url.includes('r2.dev') || 
                              url.includes('cloudflarestorage.com');
  
  if (!isResizingSupported) {
    return url;
  }
  
  const { width, format = 'auto' } = options;
  const params = new URLSearchParams();
  if (width) params.append('width', width.toString());
  params.append('format', format);

  return `${url}${url.includes('?') ? '&' : '?'}${params.toString()}`;
}

/**
 * Gets a thumbnail URL for a given original URL.
 */
export function getThumbnailUrl(originalUrl: string, width: number, updatedAt?: string) {
  const workerUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_THUMBNAIL_WORKER_URL : undefined;
  if (!workerUrl || !originalUrl) return originalUrl;
  
  try {
    const url = new URL(originalUrl);
    const cacheBuster = updatedAt ? `&t=${new Date(updatedAt).getTime()}` : '';
    return `${workerUrl.replace(/\/$/, '')}${url.pathname}?w=${width}${cacheBuster}`;
  } catch (e) {
    return originalUrl;
  }
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
