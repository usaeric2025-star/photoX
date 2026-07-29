import { Category } from '#src/types/index.js';
import { TranslationType } from '#src/locales/index.js';
import { getSafeText } from '#src/features/ai/safeText.js';

const STANDARD_CATEGORY_MAP: Record<string, Record<string, string>> = {
  chair: { zh: '椅子', en: 'Chair', ms: 'Kerusi' },
  table: { zh: '桌子', en: 'Table', ms: 'Meja' },
  bed: { zh: '床具', en: 'Bed', ms: 'Katil' },
  cabinet: { zh: '柜子', en: 'Cabinet', ms: 'Almari' },
  office: { zh: '办公', en: 'Office', ms: 'Pejabat' },
  sofa: { zh: '沙发', en: 'Sofa', ms: 'Sofa' },
  others: { zh: '其他', en: 'Others', ms: 'Lain-lain' },
  other: { zh: '其他', en: 'Others', ms: 'Lain-lain' },
  '椅子': { zh: '椅子', en: 'Chair', ms: 'Kerusi' },
  '桌子': { zh: '桌子', en: 'Table', ms: 'Meja' },
  '床具': { zh: '床具', en: 'Bed', ms: 'Katil' },
  '柜子': { zh: '柜子', en: 'Cabinet', ms: 'Almari' },
  '办公': { zh: '办公', en: 'Office', ms: 'Pejabat' },
  '沙发': { zh: '沙发', en: 'Sofa', ms: 'Sofa' },
  '其他': { zh: '其他', en: 'Others', ms: 'Lain-lain' },
};

export interface CategoryFallbackData {
  categoryDescription?: Record<string, string> | string | null;
  categoryName?: string | null;
  code?: string | null;
}

/**
 * Gets the translated name for a category with proper fallbacks.
 */
export const getTranslatedCategoryName = (
  catId: string | number | undefined,
  categories: Category[],
  lang: string,
  t?: TranslationType,
  categoryMap?: Map<string, Category>,
  fallbackData?: CategoryFallbackData
): string => {
  const targetLang = (lang || 'zh').toLowerCase();
  const catIdStr = catId !== undefined && catId !== null ? String(catId) : "";
  
  const activeCat = catIdStr 
    ? (categoryMap 
        ? categoryMap.get(catIdStr) 
        : categories.find(c => String(c.id) === catIdStr || (c as unknown as Record<string, unknown>).code === catIdStr))
    : undefined;

  if (activeCat) {
    const activeCatRecord = activeCat as unknown as Record<string, unknown>;

    // 1. Try description object
    if (activeCat.description && typeof activeCat.description === 'object') {
      const desc = activeCat.description as Record<string, unknown>;
      const val = desc[targetLang] || desc.en || desc.zh;
      if (val && String(val).trim().length > 0) return String(val);
    }

    // 2. Try direct locale properties
    if (activeCatRecord[targetLang] && String(activeCatRecord[targetLang]).trim().length > 0) {
      return String(activeCatRecord[targetLang]);
    }

    // 3. Try name_translations
    if (activeCatRecord.name_translations && typeof activeCatRecord.name_translations === 'object') {
      const trans = activeCatRecord.name_translations as Record<string, unknown>;
      const val = trans[targetLang] || trans.en || trans.zh;
      if (val && String(val).trim().length > 0) return String(val);
    }

    // 4. Try code dictionary
    if (activeCat.code && STANDARD_CATEGORY_MAP[activeCat.code.toLowerCase()]) {
      const dict = STANDARD_CATEGORY_MAP[activeCat.code.toLowerCase()];
      if (dict[targetLang]) return dict[targetLang];
    }

    // 5. Try name dictionary / getSafeText
    if (activeCat.name) {
      const cleanName = activeCat.name.trim();
      if (STANDARD_CATEGORY_MAP[cleanName.toLowerCase()]) {
        const dict = STANDARD_CATEGORY_MAP[cleanName.toLowerCase()];
        if (dict[targetLang]) return dict[targetLang];
      }
      const result = getSafeText(activeCat.name, targetLang);
      if (result && typeof result === 'string' && result.trim().length > 0) return result;
      return activeCat.name;
    }
  }

  // Fallback data handling (e.g., photo.categoryDescription / photo.categoryName)
  if (fallbackData) {
    const { categoryDescription, categoryName, code } = fallbackData;

    if (categoryDescription) {
      let descObj: Record<string, unknown> | null = null;
      if (typeof categoryDescription === 'object') {
        descObj = categoryDescription as Record<string, unknown>;
      } else if (typeof categoryDescription === 'string') {
        try {
          descObj = JSON.parse(categoryDescription);
        } catch {
          // not json
        }
      }
      if (descObj) {
        const val = descObj[targetLang] || descObj.en || descObj.zh;
        if (val && String(val).trim().length > 0) return String(val);
      }
    }

    if (code && STANDARD_CATEGORY_MAP[code.toLowerCase()]) {
      const dict = STANDARD_CATEGORY_MAP[code.toLowerCase()];
      if (dict[targetLang]) return dict[targetLang];
    }

    if (categoryName) {
      const cleanName = categoryName.trim();
      if (STANDARD_CATEGORY_MAP[cleanName.toLowerCase()]) {
        const dict = STANDARD_CATEGORY_MAP[cleanName.toLowerCase()];
        if (dict[targetLang]) return dict[targetLang];
      }
      return cleanName;
    }
  }

  return "";
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
