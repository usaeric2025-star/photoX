import { Photo } from '../../types';
import { safeArray } from '../../lib/utils';
import { validateDimension } from '../../utils/dimensionValidator';

export const FIELD_MAP: Record<string, string> = {
  groupId: 'group_id',
  isGroupCover: 'is_group_cover',
  categoryId: 'category_id',
  manufacturerId: 'manufacturer_id',
  isPinned: 'is_pinned',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  itemCode: 'item_code',
  manualCode: 'manual_code',
  imageHash: 'image_hash',
  imageUrl: 'image_url',
  thumbUrl: 'thumb_url',
  modelNumber: 'model_number',
  userId: 'user_id',
  descriptionTranslations: 'description_translations',
  is_hidden: 'is_hidden',
};

export const ALLOWED_FIELDS = [
  'id', 'name', 'description', 'description_translations', 'categoryId', 'manufacturerId',
  'tagIds', 'dimensions', 'model_number', 'manual_code', 'groupId', 'isGroupCover', 'isPinned',
  'image_url', 'thumb_url', 'price', 'note', 'type', 'groupOrder', 'updatedAt', 'createdAt',
  'updated_at', 'created_at', 'userId', 'is_hidden', 'image_hash', 'item_code'
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
    
    // Map fields
    for (const [key, value] of Object.entries(filteredUpdates)) {
        // Exclude relational/array fields that are handled separately
        if (['tagIds', 'dimensions'].includes(key)) continue;

        if (['isAnalyzing'].includes(key)) continue;
        
        if (FIELD_MAP[key]) {
            let valueToSave = value;
            if (key === 'groupId' || key === 'categoryId' || key === 'manufacturerId') {
                if (value === '' || value === 'uncategorized' || value === 'null' || value === undefined || value === null) {
                    valueToSave = null;
                }
            }
            dbUpdates[FIELD_MAP[key]] = valueToSave;
        } else {
            dbUpdates[key] = value;
        }
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
    
    return dbUpdates;
};
