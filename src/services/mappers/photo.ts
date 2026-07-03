import { SupabasePhotoRaw } from '#src/types/supabase.js';
import { Photo, Tag, Dimension } from '#src/types/index.js';
import { getSafeText } from '#src/features/ai/safeText.js';
import { generateItemCode, validateDimension } from '#src/services/photo/utils.js';
import { getThumbnailUrl, normalizeStoredUrl, mapTranslationField } from './utils.js';

const ALLOWED_FIELDS = [
  'id', 'name', 'nameEn', 'nameMs', 'description', 'descriptionTranslations', 'categoryId', 'manufacturerId',
  'tagIds', 'dimensions', 'modelNumber', 'manualCode', 'groupId', 'isGroupCover', 'isPinned',
  'imageUrl', 'price', 'note', 'type', 'groupOrder', 'updatedAt', 'createdAt',
  'userId', 'isHidden', 'isAnalyzing', 'imageHash', 'itemCode', 'metadata'
];

export function mapSupabasePhoto(item: Partial<SupabasePhotoRaw>, allTags?: Tag[]): Photo {
    if (!item) return {} as Photo;
    
    // Cast to any to handle mixed snake_case/camelCase properties
    const raw: any = item;
    
    // Optimization: Create a tag map for O(1) lookup if it was passed
    const tagMapContainer = allTags as (Tag[] & { _map?: Map<string, Tag> }) | undefined;
    const tagCache = (tagMapContainer && tagMapContainer._map) || 
                   (allTags ? new Map(allTags.map(t => [String(t.id), t])) : null);
    if (tagMapContainer && tagCache && !tagMapContainer._map) {
        tagMapContainer._map = tagCache; // Attach for reuse in the same map loop
    }

    const rawImageUrl = raw.image_url || raw.imageUrl || '';
    let storageId = raw.id || '';
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
    const photoTags = raw.photo_tags || raw.photoTags;
    const itemTags = raw.tags;

    if (Array.isArray(photoTags)) {
      photoTags.forEach((pt: any) => {
        if (pt && typeof pt === 'object') {
            let tagId = pt.tag_id || pt.tagId;
            let tagName = '';
            
            if (pt.tags) {
                const rawTag = (Array.isArray(pt.tags) ? pt.tags[0] : pt.tags);
                if (rawTag && typeof rawTag === 'object' && 'id' in rawTag) {
                    tagId = rawTag.id;
                    tagName = getSafeText(rawTag.name);
                }
            } else if (tagCache && tagId) {
                const matchedTag = tagCache.get(String(tagId));
                if (matchedTag) {
                    tagName = matchedTag.name;
                }
            }
            
            if (tagId) {
                tags.push({
                    id: Number(tagId || 0),
                    name: tagName,
                    aliases: [],
                });
            }
        }
      });
    } else if (Array.isArray(itemTags)) {
      itemTags.forEach((t: any) => {
        if (t && typeof t === 'object' && 'id' in t) {
            tags.push({
                id: Number(t.id || 0),
                name: getSafeText(t.name || ''),
                aliases: [],
            });
        }
      });
    }

    const imageUrl = normalizeStoredUrl(rawImageUrl);
    const imageHash = raw.image_hash || raw.imageHash || '';
    const createdAt = raw.created_at || raw.createdAt || new Date().toISOString();
    const updatedAt = raw.updated_at || raw.updatedAt || createdAt;

    return {
      id: String(raw.id || ''),
      storageId,
      itemCode: raw.item_code || raw.itemCode || '',
      manualCode: raw.manual_code || raw.manualCode || '',
      modelNumber: raw.model_number || raw.modelNumber || '',
      imageHash,
      name: (raw.name && typeof raw.name === 'object') ? ((raw.name as Record<string, string>).en || (raw.name as Record<string, string>).zh || '') : (raw.name || ''),
      categoryId: raw.category_id || raw.categoryId || null,
      manufacturerId: raw.manufacturer_id || raw.manufacturerId || null,
      description: mapTranslationField(raw.description || raw.description_translations),
      imageUrl,
      thumbnailSmUrl: getThumbnailUrl(imageUrl, 200, undefined, imageHash),
      thumbnailMdUrl: getThumbnailUrl(imageUrl, 800, undefined, imageHash),
      exifData: raw.exif_data || raw.exifData || null,
      createdAt,
      updatedAt,
      groupId: raw.group_id || raw.groupId || null,
      group: raw.group ? {
          id: raw.group.id,
          name: getSafeText(raw.group.name),
          color: raw.group.color || '#3b82f6',
          coverPhotoId: raw.group.cover_photo_id || raw.group.coverPhotoId || null,
          memberCount: raw.group.member_count || raw.group.memberCount || 0,
      } : null,
      isGroupCover: !!(raw.is_group_cover ?? raw.isGroupCover ?? false),
      isHidden: !!(raw.is_hidden ?? raw.isHidden ?? false),
      isPinned: !!(raw.is_pinned ?? raw.isPinned ?? false),
      isAnalyzing: !!(raw.is_analyzing ?? raw.isAnalyzing ?? false),
      groupOrder: raw.group_order ?? raw.groupOrder,
      userId: raw.user_id || raw.userId,
      uri: imageUrl,
      price: raw.price || '',
      tags: tags,
      dimensions: Array.isArray(raw.dimensions) ? (raw.dimensions as Photo['dimensions']) : [],
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
            if (valueToSave && typeof valueToSave === 'object') {
                const obj = valueToSave as any;
                valueToSave = obj.zh || obj.en || obj.ms || obj.name || '';
            } else {
                valueToSave = String(valueToSave || '');
            }
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
