import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Tag } from '@/types';
import { ErrorFactory } from '@/lib/error/ErrorFactory';

const TABLE_NAME = 'tags';
const ALLOWED_FIELDS = ['id', 'name', 'zh', 'en', 'ms', 'aliases', 'userId', 'hot_score'];
const NEVER_ALLOWED = ['isAnalyzing', 'exif_data', 'is_hidden', 'tempId', 'isSelected', 'isDragging', 'rawResponse'];

const FIELD_MAP: Record<string, string> = {
    userId: 'user_id',
};

const mapToDb = (updates: Partial<Tag> & Record<string, unknown>): Record<string, unknown> => {
    const dbUpdates: Record<string, unknown> = {};

    for (const key of ALLOWED_FIELDS) {
        if (key in updates && !NEVER_ALLOWED.includes(key)) {
            const dbKey = FIELD_MAP[key] || key;
            dbUpdates[dbKey] = updates[key];
        }
    }

    return dbUpdates;
};

/**
 * Updates a tag.
 * @precondition Tag exists.
 * @postcondition Tag record updated.
 */
const updateTag = async (tagId: number, updates: Partial<Tag>): Promise<void> => {
    const dbUpdates = mapToDb(updates);
    const res = await api.tags[':id'].$put({
        param: { id: String(tagId) },
        json: { updates: dbUpdates }
    });
    if (!res.ok) throw ErrorFactory.fatal('Update tag failed', { context: 'updateTag' });
};

const createTag = async (tagData: Omit<Tag, 'id'>): Promise<Tag> => {
    const dbUpdates = mapToDb(tagData as unknown as Partial<Tag> & Record<string, unknown>);
    const res = await api.tags.$post({
        json: { tagData: dbUpdates }
    });
    if (!res.ok) throw ErrorFactory.fatal('Create tag failed', { context: 'createTag' });
    const { data } = await res.json() as { data: Tag };
    return data;
};

const batchCreateTagsInCloud = async (tags: Partial<Tag>[]): Promise<Tag[]> => {
    const dbUpdates = tags.map(tag => mapToDb(tag as unknown as Partial<Tag> & Record<string, unknown>));
    const res = await api.tags.batch.$post({
        json: { tags: dbUpdates }
    });
    if (!res.ok) throw ErrorFactory.fatal('Batch create tags failed', { context: 'batchCreateTagsInCloud' });
    const { data } = await res.json() as { data: Tag[] };
    return data;
};

const deleteTag = async (tagId: number): Promise<void> => {
    const res = await api.tags[':id'].$delete({
        param: { id: String(tagId) }
    });
    if (!res.ok) throw ErrorFactory.fatal('Delete tag failed', { context: 'deleteTag' });
};

export const triggerRefreshTagHotScores = async (): Promise<void> => {
    const res = await api.tags['refresh-hot-scores'].$post();
    if (!res.ok) throw ErrorFactory.fatal('Refresh tag hot scores failed', { context: 'triggerRefreshTagHotScores' });
};

const removeTagFromPhoto = async (photoId: string, tagId: string): Promise<void> => {
    const res = await api.tags['remove-from-photo'].$post({
        json: { photoId, tagId }
    });
    if (!res.ok) throw ErrorFactory.fatal('Remove tag from photo failed', { context: 'removeTagFromPhoto' });
};

export const syncPhotoTags = async (photoId: string, tagIds: string[], tagWeights?: Record<string, number>, tagSources?: Record<string, 'ai' | 'user' | 'system'>): Promise<void> => {
    const res = await api.tags['sync-photo-tags'].$post({
        json: { photoId, tagIds, tagWeights, tagSources }
    });
    if (!res.ok) throw ErrorFactory.fatal('Sync photo tags failed', { context: 'syncPhotoTags' });
};

export const syncBatchPhotoTags = async (photoIds: string[], tagIds: string[], tagWeights?: Record<string, number>, tagSources?: Record<string, 'ai' | 'user' | 'system'>): Promise<void> => {
    const res = await api.tags['sync-batch-photo-tags'].$post({
        json: { photoIds, tagIds, tagWeights, tagSources }
    });
    if (!res.ok) throw ErrorFactory.fatal('Sync batch photo tags failed', { context: 'syncBatchPhotoTags' });
};

/**
 * Helper to add a tag.
 */
const addTag = async (name: string): Promise<Tag> => {
    const normalizedName = name.toUpperCase().trim();
    return createTag({ name: normalizedName } as Tag);
};

/**
 * Helper to batch create tags.
 */
export const batchCreateTags = async (names: string[]): Promise<Map<string, string>> => {
    const result = await batchCreateTagsInCloud(names.map(name => ({ name: name.toUpperCase().trim() })));
    
    const map = new Map<string, string>();
    (result || []).forEach(t => map.set(t.name, String(t.id)));
    return map;
};

/**
 * Helper to update a tag.
 */
const updateTagAtomic = async (tagId: number, updates: Partial<Tag>): Promise<void> => {
    const finalUpdates = { ...updates };
    if (finalUpdates.name) {
      finalUpdates.name = finalUpdates.name.toUpperCase().trim();
    }
    return updateTag(tagId, finalUpdates);
};

/**
 * Helper to delete a tag.
 */
const deleteTagAtomic = async (tagId: number): Promise<void> => {
    return deleteTag(tagId);
};

/**
 * Helper to remove tag from photo.
 */
const removeTagFromPhotoAtomic = async (photoId: string, tagId: string): Promise<void> => {
    return removeTagFromPhoto(photoId, tagId);
};

export const addTagToDB = async (name: string) => {
    try {
        return await addTag(name);
    } catch {
        return { ok: false };
    }
};
export const updateTagInDB = async (tagId: number, updates: Partial<Tag>) => {
    try {
        await updateTagAtomic(tagId, updates);
        return { ok: true };
    } catch {
        return { ok: false };
    }
};
export const deleteTagFromDB = async (tagId: number) => {
    try {
        await deleteTagAtomic(tagId);
        return { ok: true };
    } catch {
        return { ok: false };
    }
};
const removeTagFromPhotoFromDB = async (photoId: string, tagId: string) => {
    try {
        await removeTagFromPhotoAtomic(photoId, tagId);
        return { ok: true };
    } catch {
        return { ok: false };
    }
};


