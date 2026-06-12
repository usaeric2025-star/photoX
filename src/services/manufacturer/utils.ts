import { Manufacturer } from '@/types';
import { getSafeText } from '@/services/ai/safeText';

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
