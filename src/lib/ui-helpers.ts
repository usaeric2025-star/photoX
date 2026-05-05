import { Photo, Category } from '../types';
import { translations, LanguageCode } from './translations';

/**
 * Gets the translated name for a category with proper fallbacks.
 */
export const getTranslatedCategoryName = (
  catId: string | number | undefined,
  categories: Category[],
  lang: string,
  t: any
): string => {
  if (!catId) return t.uncategorized;
  
  const catIdStr = String(catId);
  const activeCat = categories.find(c => String(c.id) === catIdStr || (c as any).code === catIdStr);
  
  if (!activeCat) return t.uncategorized;

  if (lang === 'zh') return activeCat.zh || activeCat.name;
  if (lang === 'en') return activeCat.en || activeCat.name || activeCat.zh;
  if (lang === 'ms') return activeCat.ms || activeCat.name || activeCat.en || activeCat.zh;
  
  return activeCat.name;
};

/**
 * Gets the display name for a photo, falling back to category name if unnamed.
 */
export const getPhotoDisplayName = (
  photo: Photo,
  categories: Category[],
  lang: string,
  t: any
): string => {
  const isPlaceholder = !photo.name || 
    photo.name === t.furnitureRecord || 
    photo.name === 'Furniture Record' || 
    photo.name === '未命名产品' || 
    photo.name === (translations as any)['zh']?.furnitureRecord ||
    photo.name === (translations as any)['en']?.furnitureRecord;

  if (!isPlaceholder) return photo.name;
  
  const catName = getTranslatedCategoryName(photo.categoryId, categories, lang, t);
  if (catName && catName !== t.uncategorized) return catName;

  if (lang === 'ms') return (translations as any)['ms']?.furniture || 'Perabot';
  return lang === 'en' ? 'Furniture' : '家具';
};

/**
 * Simple helper to check if a category is "Uncategorized" based on various name variants.
 * Respects ID '7' as "Other" (valid category).
 */
export const isUncategorizedName = (name: string, t: any, catId?: string | number): boolean => {
  if (catId && (String(catId) === '7' || String(catId) === 'Others' || String(catId) === 'other')) return false;
  const uncatValues = ['未分类', '未分類', 'uncategorized', 'tiada kategori'];
  const nameLower = (name || '').toLowerCase().trim();
  if (nameLower === 'other' || nameLower === 'others' || nameLower === '其他') return false;
  return !name || name === t.uncategorized || uncatValues.includes(nameLower);
};

/**
 * Gets the manufacturer name from the ID.
 */
export const getManufacturerName = (
  mfrId: string | undefined,
  manufacturers: any[]
): string => {
  if (!mfrId) return '';
  const activeMfr = manufacturers.find(m => String(m.id) === String(mfrId));
  return activeMfr ? activeMfr.name : '';
};
