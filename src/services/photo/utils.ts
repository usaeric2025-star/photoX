import { supabase } from '../../lib/supabase';
import { Tag, Photo } from '../../types';
import { safeArray } from '../../lib/utils';
import { translations, TranslationType } from '@/lib/translations';
import { getSafeText } from '@/lib/ai/safeText';
import { getTranslatedCategoryName } from '../category/utils';
import { Category } from '@/types';

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

/**
 * Get a fresh UUID
 */
export const getDatabaseUUID = async (): Promise<string> => {
  return crypto.randomUUID(); 
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
    photoNameStr === (translations as any)['zh']?.furnitureRecord ||
    photoNameStr === (translations as any)['en']?.furnitureRecord;

  if (!isPlaceholder) return photoNameStr || "";
  
  const catName = getTranslatedCategoryName(photo.category_id || undefined, categories, lang, t);
  if (catName && catName !== t.uncategorized) return catName;

  return t.furniture;
};

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
