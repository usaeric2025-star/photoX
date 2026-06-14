import { Category } from '@/types';
import { TranslationType } from '@/locales';
import { getSafeText } from '@/services/ai/safeText';

/**
 * Gets the translated name for a category with proper fallbacks.
 */
export const getTranslatedCategoryName = (
  catId: string | number | undefined,
  categories: Category[],
  lang: string,
  t: TranslationType,
  categoryMap?: Map<string, Category>
): string => {
  if (!catId) return "";
  
  const catIdStr = String(catId);
  const activeCat = categoryMap 
    ? categoryMap.get(catIdStr) 
    : categories.find(c => String(c.id) === catIdStr || (c as any).code === catIdStr);
  
  if (!activeCat) return "";

  // 1. Try direct locale properties on the category object (e.g. activeCat.zh, activeCat.en, activeCat.ms)
  if (lang && (activeCat as any)[lang]) {
    return String((activeCat as any)[lang]);
  }

  // 2. Try nested translations under name_translations
  if ((activeCat as any).name_translations && typeof (activeCat as any).name_translations === 'object') {
    const trans = (activeCat as any).name_translations;
    const val = trans[lang] || trans.zh || trans.en;
    if (val) return String(val);
  }

  // 3. Fallback to name field
  if (activeCat.name) {
    const result = getSafeText(activeCat.name, lang);
    if (result && typeof result === 'string') return result;
  }

  // 4. Fallback search looking up properties (Legacy support)
  const legacyFallback = (activeCat as any).zh || (activeCat as any).en || (activeCat as any).ms || (activeCat as any).code || "";
  return String(legacyFallback);
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
