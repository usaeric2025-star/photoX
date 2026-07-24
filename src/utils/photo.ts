import { Dimension } from '#src/types/index.js';

/**
 * Generate a unique human-readable code for items
 */
export const generateItemCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed O, I, 1, 0
  let random = '';
  for (let i = 0; i < 8; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `X-${random}`; // e.g. X-A8B9C2D4
};

/**
 * Derives a short, human-readable code from a UUID for display purposes.
 */
export const getDisplayGroupCode = (groupId?: string | null): string => {
  if (!groupId) return '';
  const short = groupId.split('-').pop()?.slice(-6).toUpperCase() || '';
  return `G-${short}`;
};

/**
 * Normalize dimension unit strings (inch, in, ", ″, cm, mm) without forcing conversion
 */
export function normalizeUnit(rawUnit?: string | null, rawDim?: Record<string, unknown>): 'cm' | 'inch' | 'mm' {
  const u = (rawUnit || '').toLowerCase().trim();
  if (['inch', 'in', 'inches', '"', '″', "''"].includes(u)) return 'inch';
  if (['mm', 'millimeter', 'millimetres'].includes(u)) return 'mm';
  if (['cm', 'centimeter', 'centimetres'].includes(u)) return 'cm';

  const str = (JSON.stringify(rawDim || {}) + ' ' + (rawUnit || '')).toLowerCase();
  if (str.includes('"') || str.includes('″') || str.includes('inch') || str.includes("''")) {
    return 'inch';
  }
  return 'cm';
}

/**
 * Validate and normalize photo dimensions
 */
export function validateDimension(dim: Dimension | null | undefined): Dimension | null {
  if (!dim) return null;
  const rawDim = dim as unknown as Record<string, unknown>;
  const value = rawDim.value ?? dim.height ?? dim.width ?? rawDim.length ?? 0;
  
  const unit = normalizeUnit(rawDim.unit as string | undefined, rawDim);

  return {
    ...dim,
    unit,
    height: Number(dim.height || ((rawDim.label as string)?.includes('H') ? value : 0)) || 0,
    width: Number(dim.width || ((rawDim.label as string)?.includes('W') ? value : 0)) || 0,
    length: Number(rawDim.length || ((rawDim.label as string)?.includes('D') || (rawDim.label as string)?.includes('L') ? value : 0)) || 0
  };
}
