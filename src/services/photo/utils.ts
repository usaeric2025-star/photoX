import { supabase } from '../../lib/supabase';
import { Tag, Photo, Dimension } from '../../types';
import { safeArray } from '../../lib/utils';
import { translations, TranslationType } from '@/locales';
import { getSafeText } from '@/features/ai/safeText';
import { getTranslatedCategoryName } from '../category/utils';
import { Category } from '@/types';
import { generateId } from '@/lib/id';

const NEVER_ALLOWED = ['isAnalyzing', 'exif_data', 'is_hidden', 'tempId', 'isSelected', 'isDragging', 'rawResponse'];

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

export function validateDimension(dim: Dimension | null | undefined): Dimension | null {
  if (!dim) return null;
  const rawDim = dim as unknown as Record<string, unknown>;
  const value = rawDim.value ?? dim.height ?? dim.width ?? rawDim.length ?? 0;
  
  // Local implementation of normalizeUnit since the exported one is unused elsewhere and being removed
  const u = (rawDim.unit as string | undefined)?.toLowerCase().trim();
  let unit: 'cm' | 'inch' | 'mm' = 'cm';
  if (u === 'in' || u === 'inches' || u === 'inch') unit = 'inch';
  else if (u === 'cm' || u === 'centimeter' || u === 'centimetres') unit = 'cm';
  else if (u === 'mm' || u === 'millimeter' || u === 'millimetres') unit = 'mm';
  
  return {
    ...dim,
    unit,
    height: Number(dim.height || ((rawDim.label as string)?.includes('H') ? value : 0)) || 0,
    width: Number(dim.width || ((rawDim.label as string)?.includes('W') ? value : 0)) || 0,
    length: Number(rawDim.length || ((rawDim.label as string)?.includes('D') || (rawDim.label as string)?.includes('L') ? value : 0)) || 0
  };
}

