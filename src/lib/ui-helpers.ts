import { Category, Manufacturer } from '../types';
import { getTranslatedCategoryName, isUncategorizedName } from '../services/category/utils';
import { getPhotoDisplayName, getCacheBustedImageUrl } from '../services/photo/utils';

export { getTranslatedCategoryName, isUncategorizedName, getPhotoDisplayName, getCacheBustedImageUrl };

// ... existing code ...

/**
 * Gets the manufacturer name from the ID.
 */
export const getManufacturerName = (
  mfrId: string | undefined,
  manufacturers: Manufacturer[],
  lang: string = 'zh'
): string => {
  if (!mfrId) return '';
  const activeMfr = manufacturers.find(m => String(m.id) === String(mfrId));
  if (!activeMfr) return '';
  return getSafeText(activeMfr.name, lang).toUpperCase();
};

/**
 * Converts a string to Title Case.
 */
export function toTitleCase(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
