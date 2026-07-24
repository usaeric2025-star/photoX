import { Category } from '#src/types/index.js';
import { TranslationType } from '#src/locales/index.js';
import { getSafeText } from '#src/features/ai/safeText.js';

/**
 * Gets the translated name for a category with proper fallbacks.
 */
export const getTranslatedCategoryName = (
  catId: string | number | undefined,
  categories: Category[],
  lang: string,
  t?: TranslationType,
  categoryMap?: Map<string, Category>
): string => {
  if (!catId) return "";
  
  const catIdStr = String(catId);
  const activeCat = categoryMap 
    ? categoryMap.get(catIdStr) 
    : categories.find(c => String(c.id) === catIdStr || (c as unknown as Record<string, unknown>).code === catIdStr);

  if (!activeCat) return "";

  const activeCatRecord = activeCat as unknown as Record<string, unknown>;

  // 1. Try nested translations under description (Standard now)
  if (activeCat.description && typeof activeCat.description === 'object') {
    const desc = activeCat.description as Record<string, unknown>;
    const val = desc[lang] || desc.zh || desc.en;
    if (val && String(val).trim().length > 0) return String(val);
  }

  // 2. Try direct locale properties on the category object (Legacy support)
  if (lang && activeCatRecord[lang] && String(activeCatRecord[lang]).trim().length > 0) {
    return String(activeCatRecord[lang]);
  }

  // 3. Try nested translations under name_translations
  if (activeCatRecord.name_translations && typeof activeCatRecord.name_translations === 'object') {
    const trans = activeCatRecord.name_translations as Record<string, unknown>;
    const val = trans[lang] || trans.zh || trans.en;
    if (val && String(val).trim().length > 0) return String(val);
  }

  // 4. Fallback to name field
  if (activeCat.name) {
    const result = getSafeText(activeCat.name, lang);
    if (result && typeof result === 'string' && result.trim().length > 0) return result;
    return activeCat.name;
  }

  // 4. Fallback search looking up properties (Legacy support)
  const legacyFallback = activeCatRecord.zh || activeCatRecord.en || activeCatRecord.ms || activeCatRecord.code || "";
  return String(legacyFallback);
};

/**
 * Simple helper to check if a category is "Uncategorized" based on various name variants.
 * Respects ID '7' as "Other" (valid category).
 */
const isUncategorizedName = (name: string, t: TranslationType, catId?: string | number): boolean => {
  if (catId && (String(catId) === '7' || String(catId) === 'Others' || String(catId) === 'other')) return false;
  const uncatValues = ['未分类', 'uncategorized', 'tiada kategori'];
  const nameLower = (name || '').toLowerCase().trim();
  if (nameLower === 'other' || nameLower === 'others' || nameLower === '其他') return false;
  return !name || name === t.uncategorized || uncatValues.includes(nameLower);
};
