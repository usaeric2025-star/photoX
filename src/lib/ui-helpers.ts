import { Photo, Category, Manufacturer } from '../types';
import { translations, LanguageCode } from './translations';

export type TranslationType = typeof translations.en;

/**
 * Gets the translated name for a category with proper fallbacks.
 */
export const getTranslatedCategoryName = (
  catId: string | number | undefined,
  categories: Category[],
  lang: string,
  t: TranslationType
): string => {
  if (!catId) return "";
  
  const catIdStr = String(catId);
  const activeCat = categories.find(c => String(c.id) === catIdStr || (c as any).code === catIdStr);
  
  if (!activeCat) return "";

  const nameTrans = (activeCat as any).name_translations || {};

  const name = lang === 'zh' ? (activeCat.zh || nameTrans.zh || activeCat.name || activeCat.en || nameTrans.en) : 
               lang === 'en' ? (activeCat.en || nameTrans.en || activeCat.name || activeCat.zh || nameTrans.zh) :
               lang === 'ms' ? (activeCat.ms || nameTrans.ms || activeCat.name || activeCat.en || nameTrans.en) : activeCat.name;

  return name || "";
};

/**
 * Gets the display name for a photo, falling back to category name if unnamed.
 */
export const getPhotoDisplayName = (
  photo: Photo,
  categories: Category[],
  lang: string,
  t: TranslationType
): string => {
  const isPlaceholder = !photo.name || 
    photo.name === t.furnitureRecord || 
    photo.name === 'Furniture Record' || 
    photo.name === '未命名产品' || 
    photo.name === (translations as any)['zh']?.furnitureRecord ||
    photo.name === (translations as any)['en']?.furnitureRecord;

  if (!isPlaceholder) return photo.name;
  
  const catName = getTranslatedCategoryName(photo.category_id || undefined, categories, lang, t);
  if (catName && catName !== t.uncategorized) return catName;

  return t.furniture;
};

/**
 * Simple helper to check if a category is "Uncategorized" based on various name variants.
 * Respects ID '7' as "Other" (valid category).
 */
export const isUncategorizedName = (name: string, t: TranslationType, catId?: string | number): boolean => {
  if (catId && (String(catId) === '7' || String(catId) === 'Others' || String(catId) === 'other')) return false;
  const uncatValues = ['未分类', 'uncategorized', 'tiada kategori'];
  const nameLower = (name || '').toLowerCase().trim();
  if (nameLower === 'other' || nameLower === 'others' || nameLower === '其他') return false;
  return !name || name === t.uncategorized || uncatValues.includes(nameLower);
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

/**
 * Gets the manufacturer name from the ID.
 */
export const getManufacturerName = (
  mfrId: string | undefined,
  manufacturers: Manufacturer[]
): string => {
  if (!mfrId) return '';
  const activeMfr = manufacturers.find(m => String(m.id) === String(mfrId));
  return activeMfr ? (activeMfr.name || '').toUpperCase() : '';
};

/**
 * Converts a string to Title Case.
 */
export function toTitleCase(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
