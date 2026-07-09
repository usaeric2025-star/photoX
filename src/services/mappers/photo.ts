import { Photo, Tag } from '#src/types/index.js';
import { generateItemCode, validateDimension } from '#src/services/photo/utils.js';
import { getThumbnailUrl, normalizeStoredUrl } from './utils.js';

/**
 * Maps raw database/API data to the internal Photo type.
 * This is the "Truth" for UI consumption.
 */
export function mapSupabasePhoto(raw: any, allTags?: Tag[]): Photo {
    if (!raw) return {} as Photo;
    
    // Resolve tags: Support both embedded and external tag list
    const tags: Tag[] = [];
    const rawTags = raw.photo_tags || raw.photoTags || raw.tags;
    
    if (Array.isArray(rawTags)) {
      rawTags.forEach((t: any) => {
        const tagObj = t.tags || t;
        if (tagObj && tagObj.id) {
          tags.push({
            id: Number(tagObj.id),
            name: String(tagObj.name || ''),
            aliases: tagObj.aliases || [],
          });
        }
      });
    }

    const imageUrl = normalizeStoredUrl(raw.image_url || raw.imageUrl || '');
    const imageHash = String(raw.image_hash || raw.imageHash || '');
    const createdAt = String(raw.created_at || raw.createdAt || new Date().toISOString());

    return {
      id: String(raw.id || ''),
      itemCode: String(raw.item_code || raw.itemCode || ''),
      manualCode: String(raw.manual_code || raw.manualCode || ''),
      modelNumber: String(raw.model_number || raw.modelNumber || ''),
      imageHash,
      name: typeof raw.name === 'object' ? (raw.name.zh || raw.name.en || '') : String(raw.name || ''),
      categoryId: (raw.category_id || raw.categoryId || null) as string | null,
      manufacturerId: (raw.manufacturer_id || raw.manufacturerId || null) as string | null,
      description: raw.description || raw.description_translations || null,
      imageUrl,
      thumbnailSmUrl: getThumbnailUrl(imageUrl, 120, undefined, imageHash),
      thumbnailMdUrl: getThumbnailUrl(imageUrl, 400, undefined, imageHash),
      thumbnailLgUrl: getThumbnailUrl(imageUrl, 800, undefined, imageHash),
      createdAt,
      updatedAt: String(raw.updated_at || raw.updatedAt || createdAt),
      groupId: (raw.group_id || raw.groupId || null) as string | null,
      isGroupCover: !!(raw.is_group_cover ?? raw.isGroupCover ?? false),
      isHidden: !!(raw.is_hidden ?? raw.isHidden ?? false),
      isPinned: !!(raw.is_pinned ?? raw.isPinned ?? false),
      isAnalyzing: !!(raw.is_analyzing ?? raw.isAnalyzing ?? false),
      groupOrder: Number(raw.group_order ?? raw.groupOrder ?? 0),
      userId: String(raw.user_id || raw.userId || ''),
      price: String(raw.price || ''),
      tags,
      dimensions: Array.isArray(raw.dimensions) ? raw.dimensions.map((d: any) => validateDimension(d)) : [],
      categoryName: '',
      manufacturerName: ''
    };
}

/**
 * Prepares a Photo object for the database (UPSERT).
 * Simplified to match the backend Hono API expectations.
 */
export const mapToDb = (updates: any, isCreate = false): Record<string, any> => {
    const db: Record<string, any> = { ...updates };
    
    // Remove transient/UI fields
    delete db.tags;
    delete db.group;
    delete db.categoryName;
    delete db.manufacturerName;
    delete db.thumbnailSmUrl;
    delete db.thumbnailMdUrl;
    delete db.thumbnailLgUrl;

    // Normalize IDs
    if (db.categoryId === 'uncategorized') db.categoryId = null;
    
    // Ensure itemCode exists
    if (!db.itemCode) {
      db.itemCode = generateItemCode();
    }

    // Format price
    if (db.price && typeof db.price === 'string' && !db.price.includes('RM')) {
        db.price = `RM ${db.price.replace(/RM/gi, '').trim()}`;
    }

    return db;
};
