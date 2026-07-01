import { SupabasePhotoRaw } from '@/types/supabase';
import { Photo, Tag, Dimension } from '@/types';
import { getSafeText } from '@/features/ai/safeText';
import { generateItemCode, validateDimension } from '@/services/photo/utils';
import { getThumbnailUrl, normalizeStoredUrl, mapTranslationField } from './utils';

const ALLOWED_FIELDS = [
  'id', 'name', 'nameEn', 'nameMs', 'description', 'descriptionTranslations', 'categoryId', 'manufacturerId',
  'tagIds', 'dimensions', 'modelNumber', 'manualCode', 'groupId', 'isGroupCover', 'isPinned',
  'imageUrl', 'price', 'note', 'type', 'groupOrder', 'updatedAt', 'createdAt',
  'userId', 'isHidden', 'isAnalyzing', 'imageHash', 'itemCode', 'metadata'
];

export function mapSupabasePhoto(item: any, allTags?: Tag[]): Photo {
    if (!item) return {} as Photo;
    
    // Optimization: Create a tag map for O(1) lookup if it was passed
    const tagMapContainer = allTags as (Tag[] & { _map?: Map<string, Tag> }) | undefined;
    const tagCache = (tagMapContainer && tagMapContainer._map) || 
                   (allTags ? new Map(allTags.map(t => [String(t.id), t])) : null);
    if (tagMapContainer && tagCache && !tagMapContainer._map) {
        tagMapContainer._map = tagCache; // Attach for reuse in the same map loop
    }

    const rawImageUrl = item.imageUrl || item.image_url || '';
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
    const photoTags = item.photoTags || item.photo_tags;
    const itemTags = item.tags;

    if (Array.isArray(photoTags)) {
      (photoTags as Record<string, any>[]).forEach((pt) => {
        if (pt && typeof pt === 'object') {
            let tagId = pt.tagId ?? pt.tag_id;
            let tagName = '';
            
            if (pt.tags) {
                const rawTag = (Array.isArray(pt.tags) ? pt.tags[0] : pt.tags) as Record<string, any> | null | undefined;
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
                id: Number(tagId || 0),
                name: tagName,
                aliases: [],
            });
        }
      });
    } else if (Array.isArray(itemTags)) {
      (itemTags as Record<string, any>[]).forEach((t) => {
        if (t && typeof t === 'object') {
            tags.push({
                id: Number(t.id || 0),
                name: getSafeText(t.name),
                aliases: [],
            });
        }
      });
    }

    const imageUrl = normalizeStoredUrl(rawImageUrl);
    const imageHash = item.imageHash || item.image_hash || '';
    const createdAt = item.createdAt || item.created_at || new Date().toISOString();
    const updatedAt = item.updatedAt || item.updated_at || createdAt;

    return {
      id: String(item.id),
      storageId,
      itemCode: item.itemCode || item.item_code || '',
      manualCode: item.manualCode || item.manual_code || '',
      modelNumber: item.modelNumber || item.model_number || '',
      imageHash,
      name: (item.name && typeof item.name === 'object') ? ((item.name as any).en || (item.name as any).zh || '') : (item.name || ''),
      categoryId: item.categoryId || item.category_id || null,
      manufacturerId: item.manufacturerId || item.manufacturer_id || null,
      description: (item.description && typeof item.description === 'object') ? item.description : { zh: String(item.description || '') },
      imageUrl,
      thumbnailSmUrl: getThumbnailUrl(imageUrl, 200, undefined, imageHash),
      thumbnailMdUrl: getThumbnailUrl(imageUrl, 800, undefined, imageHash),
      exifData: item.exifData || item.exif_data || null,
      createdAt,
      updatedAt,
      groupId: item.groupId || item.group_id || null,
      group: item.group ? {
          id: item.group.id,
          name: getSafeText(item.group.name),
          color: '#3b82f6',
          coverPhotoId: item.group.coverPhotoId || item.group.cover_photo_id,
          memberCount: item.group.memberCount || item.group.member_count || 0,
      } : null,
      isGroupCover: !!(item.isGroupCover ?? item.is_group_cover ?? false),
      isHidden: !!(item.isHidden ?? item.is_hidden ?? false),
      isPinned: !!(item.isPinned ?? item.is_pinned ?? false),
      isAnalyzing: !!(item.isAnalyzing ?? item.is_analyzing ?? false),
      groupOrder: item.groupOrder ?? item.group_order,
      userId: item.userId || item.user_id,
      uri: imageUrl,
      price: item.price || '',
      tags: tags,
      dimensions: Array.isArray(item.dimensions) ? (item.dimensions as Photo['dimensions']) : [],
      categoryName: '',
      manufacturerName: ''
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

export const mapToDb = (updates: Partial<Photo> & Record<string, any>, isCreate = false): Record<string, any> => {
    const dbUpdates: Record<string, any> = {};
    
    for (const key of ALLOWED_FIELDS) {
        if (!(key in updates)) continue;
        if (['tagIds', 'dimensions'].includes(key)) continue;

        let valueToSave = updates[key];
        
        if (['groupId', 'categoryId', 'manufacturerId'].includes(key)) {
            if (valueToSave === '' || valueToSave === 'uncategorized' || valueToSave === 'null' || valueToSave === undefined || valueToSave === null) {
                valueToSave = null;
            }
        }
        
        if (key === 'name') {
            valueToSave = String(valueToSave || '');
        }
        
        dbUpdates[key] = valueToSave;
    }
    
    dbUpdates.updatedAt = new Date().toISOString();
    if (isCreate && !dbUpdates.createdAt) {
        dbUpdates.createdAt = new Date().toISOString();
    }
    
    if ('dimensions' in updates) {
        dbUpdates.dimensions = Array.isArray(updates.dimensions) ? updates.dimensions : [];
        normalizeDimensionsBeforeSave(dbUpdates.dimensions as unknown as Dimension[]);
    }
    
    if (dbUpdates.price && typeof dbUpdates.price === 'string' && !dbUpdates.price.includes('RM')) {
        dbUpdates.price = `RM ${dbUpdates.price.replace(/RM/gi, '').trim()}`;
    }

    if (!dbUpdates.itemCode || String(dbUpdates.itemCode).trim() === '') {
        dbUpdates.itemCode = generateItemCode();
    }
    
    return dbUpdates;
};
