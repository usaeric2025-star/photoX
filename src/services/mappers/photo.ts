import { SupabasePhotoRaw } from '@/types/supabase';
import { Photo, Tag, Dimension } from '@/types';
import { getSafeText } from '@/features/ai/safeText';
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
    
    // Helper to gracefully read either snake_case (direct PG/Supabase client) or camelCase (Hono/Drizzle mapping) keys
    const getValue = <T>(snakeKey: string, camelKey: string, fallback?: T): T => {
      if (item[snakeKey as keyof SupabasePhotoRaw] !== undefined) {
        return item[snakeKey as keyof SupabasePhotoRaw] as unknown as T;
      }
      if ((item as any)[camelKey] !== undefined) {
        return (item as any)[camelKey] as unknown as T;
      }
      return fallback as T;
    };

    // Optimization: Create a tag map for O(1) lookup if it was passed
    const tagMapContainer = allTags as (Tag[] & { _map?: Map<string, Tag> }) | undefined;
    const tagCache = (tagMapContainer && tagMapContainer._map) || 
                   (allTags ? new Map(allTags.map(t => [String(t.id), t])) : null);
    if (tagMapContainer && tagCache && !tagMapContainer._map) {
        tagMapContainer._map = tagCache; // Attach for reuse in the same map loop
    }

    const rawImageUrl = getValue<string>('image_url', 'imageUrl', '');
    let storageId = item.id;
    if (rawImageUrl) {
      try {
        const parts = rawImageUrl.split('/');
        const lastPart = parts[parts.length - 1];
        if (lastPart) {
          storageId = lastPart.split('.')[0];
        }
      } catch (e) {
      }
    }

    const tags: Tag[] = [];
    const rawPhotoTags = getValue<any>('photo_tags', 'photoTags');
    const rawTags = getValue<any>('tags', 'tags');

    if (Array.isArray(rawPhotoTags)) {
      rawPhotoTags.forEach((pt) => {
        if (pt && typeof pt === 'object') {
            const rawPt = pt as Record<string, unknown>;
            let tagId = rawPt.tag_id ?? rawPt.tagId;
            let tagName = '';
            
            if (rawPt.tags) {
                const rawTag = (Array.isArray(rawPt.tags) ? rawPt.tags[0] : rawPt.tags) as Record<string, unknown> | null | undefined;
                if (rawTag) {
                    tagId = rawTag.id || tagId;
                    tagName = getSafeText(rawTag.name);
                }
            } else if (tagCache) {
                const matchedTag = tagCache.get(String(tagId));
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
    } else if (Array.isArray(rawTags)) {
      rawTags.forEach((t) => {
        if (t && typeof t === 'object') {
            const rawT = t as Record<string, unknown>;
            tags.push({
                id: String(rawT.id),
                name: getSafeText(rawT.name),
                aliases: [],
            });
        }
      });
    }

    const imageUrl = normalizeStoredUrl(rawImageUrl);
    
    const manufacturerName = ''; // Handled by caller/hooks
    const categoryName = ''; // Handled by caller/hooks

    const imageHash = getValue<string>('image_hash', 'imageHash', '');
    const createdAtVal = getValue<string>('created_at', 'createdAt') || new Date().toISOString();
    const updatedAtVal = getValue<string>('updated_at', 'updatedAt') || createdAtVal;

    return {
      id: String(item.id),
      storage_id: storageId,
      item_code: getValue<string>('item_code', 'itemCode', ''),
      manual_code: getValue<string>('manual_code', 'manualCode', ''),
      model_number: getValue<string>('model_number', 'modelNumber', ''),
      image_hash: imageHash,
      name: item.name as unknown as Photo['name'],
      category_id: getValue<string | null>('category_id', 'categoryId', null),
      manufacturer_id: getValue<string | null>('manufacturer_id', 'manufacturerId', null),
      description: item.description as unknown as Photo['description'],
      image_url: imageUrl,
      thumbnail_sm_url: getThumbnailUrl(imageUrl, 200, 200, imageHash),
      thumbnail_md_url: getThumbnailUrl(imageUrl, 800, 800, imageHash),
      thumb_hash: getValue<string>('thumb_hash', 'thumbHash', ''),
      exif_data: getValue<Record<string, unknown> | null>('exif_data', 'exifData', null),
      created_at: createdAtVal,
      updated_at: updatedAtVal,
      group_id: getValue<string | null>('group_id', 'groupId', null) || undefined,
      group: item.group ? {
          id: item.group.id,
          name: getSafeText(item.group.name),
          color: '#3b82f6',
          cover_photo_id: item.group.cover_photo_id,
          member_count: (item.group as any).member_count,
      } : null,
      is_group_cover: !!getValue<boolean>('is_group_cover', 'isGroupCover', false),
      is_hidden: !!getValue<boolean>('is_hidden', 'isHidden', false),
      is_pinned: !!getValue<boolean>('is_pinned', 'isPinned', false),
      is_analyzing: !!getValue<boolean>('is_analyzing', 'isAnalyzing', false),
      group_order: getValue<number | undefined>('group_order', 'groupOrder'),
      user_id: getValue<string | undefined>('user_id', 'userId'),
      uri: imageUrl,
      price: getValue<string>('price', 'price', ''),
      tags: tags,
      dimensions: Array.isArray(getValue<any[]>('dimensions', 'dimensions', [])) ? (getValue<any[]>('dimensions', 'dimensions', []) as Photo['dimensions']) : [],
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
        const validated = validateDimension({ ...dim, value: maxVal } as unknown as Dimension);
        if (validated?.unit) {
          dim.unit = validated.unit;
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
