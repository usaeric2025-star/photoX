import { Category } from '@/types';
import { TranslationType } from '@/locales';
import { getSafeText } from '@/features/ai/safeText';

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
    : categories.find(c => String(c.id) === catIdStr || (c as unknown as Record<string, unknown>).code === catIdStr);
  
  if (!activeCat) return "";

  const activeCatRecord = activeCat as unknown as Record<string, unknown>;

  // 1. Try direct locale properties on the category object (e.g. activeCat.zh, activeCat.en, activeCat.ms)
  if (lang && activeCatRecord[lang]) {
    return String(activeCatRecord[lang]);
  }

  // 2. Try nested translations under name_translations
  if (activeCatRecord.name_translations && typeof activeCatRecord.name_translations === 'object') {
    const trans = activeCatRecord.name_translations as Record<string, unknown>;
    const val = trans[lang] || trans.zh || trans.en;
    if (val) return String(val);
  }

  // 3. Fallback to name field
  if (activeCat.name) {
    const result = getSafeText(activeCat.name, lang);
    if (result && typeof result === 'string') return result;
  }

  // 4. Fallback search looking up properties (Legacy support)
  const legacyFallback = activeCatRecord.zh || activeCatRecord.en || activeCatRecord.ms || activeCatRecord.code || "";
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
