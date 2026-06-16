import { SupabasePhotoRaw } from '@/types/supabase';
import { Photo, Tag, Dimension } from '@/types';
import { getSafeText } from '@/services/ai/safeText';
import { generateItemCode, validateDimension } from '../photo/utils';
import { getThumbnailUrl, normalizeStoredUrl, mapTranslationField } from './utils';

export const ALLOWED_FIELDS = [
  'id', 'name', 'name_en', 'name_ms', 'description', 'description_translations', 'category_id', 'manufacturer_id',
  'tag_ids', 'dimensions', 'model_number', 'manual_code', 'group_id', 'is_group_cover', 'is_pinned',
  'image_url', 'thumb_hash', 'price', 'note', 'type', 'group_order', 'updated_at', 'created_at',
  'user_id', 'is_hidden', 'is_analyzing', 'image_hash', 'item_code'
];

export function mapSupabasePhoto(item: SupabasePhotoRaw, allTags?: Tag[]): Photo {
    if (!item) return {} as Photo;
    
    // Optimization: Create a tag map for O(1) lookup if it was passed
    const tagCache = (allTags && (allTags as any)._map) || 
                   (allTags ? new Map(allTags.map(t => [String(t.id), t])) : null);
    if (allTags && tagCache && !(allTags as any)._map) {
        (allTags as any)._map = tagCache; // Attach for reuse in the same map loop
    }

    let storageId = item.id;
    if (item.image_url) {
      try {
        const parts = item.image_url.split('/');
        const lastPart = parts[parts.length - 1];
        if (lastPart) {
          storageId = lastPart.split('.')[0];
        }
      } catch (e) {
      }
    }

    const tags: Tag[] = [];
    if (Array.isArray(item.photo_tags)) {
      item.photo_tags.forEach((pt: any) => {
        if (pt) {
            let tagId = pt.tag_id;
            let tagName = '';
            
            if (pt.tags) {
                const rawTag = Array.isArray(pt.tags) ? pt.tags[0] : pt.tags;
                if (rawTag) {
                    tagId = rawTag.id || tagId;
                    tagName = getSafeText(rawTag.name);
                }
            } else if (tagCache) {
                const matchedTag = tagCache.get(String(pt.tag_id));
                if (matchedTag) {
                    tagName = matchedTag.name;
                }
            }
            
            tags.push({
                id: String(tagId || ''),
                name: tagName,
                aliases: [],
            });
        }
      });
    } else if (Array.isArray(item.tags)) {
      item.tags.forEach((t: any) => {
        if (t) {
            tags.push({
                id: String(t.id),
                name: getSafeText(t.name),
                aliases: [],
            });
        }
      });
    }

    const imageUrl = normalizeStoredUrl(item.image_url || '');
    
    const manufacturerName = ''; // Handled by caller/hooks
    const categoryName = ''; // Handled by caller/hooks

    return {
      id: String(item.id),
      storage_id: storageId,
      item_code: item.item_code || '',
      manual_code: item.manual_code || '',
      model_number: item.model_number || '',
      image_hash: item.image_hash || '',
      name: item.name as any,
      category_id: item.category_id ? String(item.category_id) : null,
      manufacturer_id: item.manufacturer_id ? String(item.manufacturer_id) : null,
      description: item.description as any,
      image_url: imageUrl,
      thumbnail_sm_url: getThumbnailUrl(imageUrl, 200, 200, item.image_hash || ''),
      thumbnail_md_url: getThumbnailUrl(imageUrl, 800, 800, item.image_hash || ''),
      thumb_hash: item.thumb_hash || '',
      exif_data: item.exif_data ?? null,
      created_at: item.created_at || new Date().toISOString(),
      updated_at: item.updated_at || item.created_at || new Date().toISOString(),
      group_id: item.group_id ? String(item.group_id) : undefined,
      group: item.group ? {
          id: item.group.id,
          name: getSafeText(item.group.name),
          color: '#3b82f6',
          cover_photo_id: item.group.cover_photo_id,
      } : null,
      is_group_cover: !!item.is_group_cover,
      is_hidden: !!item.is_hidden,
      is_pinned: !!item.is_pinned,
      is_analyzing: !!item.is_analyzing,
      group_order: item.group_order,
      user_id: item.user_id ? String(item.user_id) : undefined,
      uri: imageUrl,
      price: item.price ? String(item.price) : '',
      tags: tags,
      dimensions: Array.isArray(item.dimensions) ? (item.dimensions as Photo['dimensions']) : [],
      categoryName,
      manufacturerName
    };
}

export function normalizeDimensionsBeforeSave(dimensions: Dimension[] | null | undefined) {
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
      if (!/[A-Za-z0-9]/.test(label) || label === '-') return false;
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
    
    for (const key of ALLOWED_FIELDS) {
        if (!(key in updates)) continue;
        if (['tag_ids', 'dimensions'].includes(key)) continue;

        let valueToSave = updates[key];
        
        if (['group_id', 'category_id', 'manufacturer_id'].includes(key)) {
            if (valueToSave === '' || valueToSave === 'uncategorized' || valueToSave === 'null' || valueToSave === undefined || valueToSave === null) {
                valueToSave = null;
            }
        }
        
        if (key === 'name' || key === 'description') {
            valueToSave = mapTranslationField(valueToSave);
        }
        
        dbUpdates[key] = valueToSave;
    }
    
    dbUpdates.updated_at = new Date().toISOString();
    if (isCreate && !dbUpdates.created_at) {
        dbUpdates.created_at = new Date().toISOString();
    }
    
    if ('dimensions' in updates) {
        dbUpdates.dimensions = Array.isArray(updates.dimensions) ? updates.dimensions : [];
        normalizeDimensionsBeforeSave(dbUpdates.dimensions as any);
    }
    
    if (dbUpdates.price && typeof dbUpdates.price === 'string' && !dbUpdates.price.includes('RM')) {
        dbUpdates.price = `RM ${dbUpdates.price.replace(/RM/gi, '').trim()}`;
    }

    if (!dbUpdates.item_code || String(dbUpdates.item_code).trim() === '') {
        dbUpdates.item_code = generateItemCode();
    }
    
    return dbUpdates;
};
