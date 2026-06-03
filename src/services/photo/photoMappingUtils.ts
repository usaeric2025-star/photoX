import { Photo } from '../../types';
import { safeArray } from '../../lib/utils';
import { validateDimension } from '@/lib/validators/dimensionValidator';
import { generateItemCode } from '../utils';

export const FIELD_MAP: Record<string, string> = {};

export const ALLOWED_FIELDS = [
  'id', 'name', 'description', 'description_translations', 'category_id', 'manufacturer_id',
  'tag_ids', 'dimensions', 'model_number', 'manual_code', 'group_id', 'is_group_cover', 'is_pinned',
  'image_url', 'thumb_hash', 'price', 'note', 'type', 'group_order', 'updated_at', 'created_at',
  'user_id', 'is_hidden', 'is_analyzing', 'image_hash', 'item_code'
];

export function normalizeDimensionsBeforeSave(dimensions: import('../../types').Dimension[] | null | undefined) {
  if (!Array.isArray(dimensions)) return;
  const sDims = [...dimensions];
  const validDims = sDims.filter(dim => {
    if (!dim) return false;
    const label = String(dim.label || '').trim();
    if (label === '' || label === '-') return false;
    const lengthVal = Number(dim.length) || 0;
    const widthVal = Number(dim.width) || 0;
    const heightVal = Number(dim.height) || 0;
    if (lengthVal === 0 && widthVal === 0 && heightVal === 0) {
      if (!/[A-Za-z0-9]/.test(label) || label === '-') {
        return false;
      }
    }
    return true;
  });

  dimensions.length = 0;
  validDims.forEach((dim) => {
    if (dim && typeof dim === 'object') {
        const maxVal = Math.max(Number(dim.length) || 0, Number(dim.width) || 0, Number(dim.height) || 0);
        const validated = validateDimension({ ...dim, value: maxVal });
        if (validated?.unit) {
          dim.unit = validated.unit as any;
        }
        dimensions.push(dim);
    }
  });
}

export const mapToDb = (updates: Partial<Photo> & Record<string, unknown>, isCreate = false): Record<string, unknown> => {
    const dbUpdates: Record<string, unknown> = {};
    
    // Filter updates based on whitelist
    const filteredUpdates: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
        if (key in updates) {
            filteredUpdates[key] = updates[key];
        }
    }
    
    // Process fields
    for (const [key, value] of Object.entries(filteredUpdates)) {
        // Exclude relational/array fields that are handled separately
        if (['tag_ids', 'dimensions'].includes(key)) continue;

        let valueToSave = value;
        if (key === 'group_id' || key === 'category_id' || key === 'manufacturer_id') {
            if (value === '' || value === 'uncategorized' || value === 'null' || value === undefined || value === null) {
                valueToSave = null;
            }
        }
        dbUpdates[key] = valueToSave;
    }
    
    // Auto-timestamps
    dbUpdates.updated_at = new Date().toISOString();
    if (isCreate && !dbUpdates.created_at) {
        dbUpdates.created_at = new Date().toISOString();
    }
    
    // Array safety
    if ('dimensions' in updates) {
        dbUpdates.dimensions = Array.isArray(updates.dimensions) ? updates.dimensions : [];
        normalizeDimensionsBeforeSave(dbUpdates.dimensions as any);
    }
    
    // Ensure Price unit
    if (dbUpdates.price && typeof dbUpdates.price === 'string' && !dbUpdates.price.includes('RM')) {
        dbUpdates.price = `RM ${dbUpdates.price.replace(/RM/gi, '').trim()}`;
    }

    // Guarantee unique, non-empty, and valid item_code to prevent database constraint violations
    if (!dbUpdates.item_code || String(dbUpdates.item_code).trim() === '') {
        dbUpdates.item_code = generateItemCode();
    }
    
    return dbUpdates;
};
