import { api } from '@/lib/api';
import { supabase } from '../../lib/supabase';
import { Tag } from '../../types';
import { errorFactory, success } from '@/lib/error/ErrorFactory';
import type { AppResult } from '@/types/api';

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
export const updateTag = async (tagId: string, updates: Partial<Tag>): Promise<AppResult<void>> => {
    const dbUpdates = mapToDb(updates);
    const res = await api.tags[':id'].$put({
        param: { id: tagId },
        json: { updates: dbUpdates }
    });
    if (!res.ok) return errorFactory('Update tag failed', 'DB_ERROR', '[updateTag] error');
    return success(undefined);
};

export const createTag = async (tagData: Omit<Tag, 'id'>): Promise<AppResult<Tag>> => {
    const dbUpdates = mapToDb(tagData as any);
    const res = await api.tags.$post({
        json: { tagData: dbUpdates }
    });
    if (!res.ok) return errorFactory('Create tag failed', 'DB_ERROR', '[createTag] error');
    const { data } = await res.json();
    return success(data as Tag);
};

export const batchCreateTagsInCloud = async (tags: Partial<Tag>[]): Promise<AppResult<Tag[]>> => {
    const dbUpdates = tags.map(tag => mapToDb(tag as any));
    const res = await api.tags.batch.$post({
        json: { tags: dbUpdates }
    });
    if (!res.ok) return errorFactory('Batch create tags failed', 'DB_ERROR', '[batchCreateTagsInCloud] error');
    const { data } = await res.json();
    return success(data as Tag[]);
};

export const deleteTag = async (tagId: string): Promise<AppResult<void>> => {
    const res = await api.tags[':id'].$delete({
        param: { id: tagId }
    });
    if (!res.ok) return errorFactory('Delete tag failed', 'DB_ERROR', '[deleteTag] error');
    return success(undefined);
};

export const triggerRefreshTagHotScores = async (): Promise<AppResult<void>> => {
    const res = await api.tags['refresh-hot-scores'].$post();
    if (!res.ok) return errorFactory('Refresh tag hot scores failed', 'DB_ERROR', '[triggerRefreshTagHotScores] error');
    return success(undefined);
};

export const removeTagFromPhoto = async (photoId: string, tagId: string): Promise<AppResult<void>> => {
    const res = await api.tags['remove-from-photo'].$post({
        json: { photoId, tagId }
    });
    if (!res.ok) return errorFactory('Remove tag from photo failed', 'DB_ERROR', '[removeTagFromPhoto] error');
    return success(undefined);
};

export const syncPhotoTags = async (photoId: string, tagIds: string[]): Promise<AppResult<void>> => {
    const res = await api.tags['sync-photo-tags'].$post({
        json: { photoId, tagIds }
    });
    if (!res.ok) return errorFactory('Sync photo tags failed', 'DB_ERROR', 'syncPhotoTags/error');
    return success(undefined);
};

export const syncBatchPhotoTags = async (photoIds: string[], tagIds: string[]): Promise<AppResult<void>> => {
    const res = await api.tags['sync-batch-photo-tags'].$post({
        json: { photoIds, tagIds }
    });
    if (!res.ok) return errorFactory('Sync batch photo tags failed', 'DB_ERROR', 'syncBatchPhotoTags/error');
    return success(undefined);
};

/**
 * Helper to add a tag.
 */
export const addTag = async (name: string): Promise<AppResult<Tag>> => {
    const normalizedName = name.toUpperCase().trim();
    return createTag({ name: normalizedName } as Tag);
};

/**
 * Helper to batch create tags.
 */
export const batchCreateTags = async (names: string[]): Promise<AppResult<Map<string, string>>> => {
    const result = await batchCreateTagsInCloud(names.map(name => ({ name: name.toUpperCase().trim() })));
    if (!result.ok) return result as any;
    
    const map = new Map<string, string>();
    (result.data || []).forEach(t => map.set(t.name, String(t.id)));
    return success(map);
};

/**
 * Helper to update a tag.
 */
export const updateTagAtomic = async (tagId: string, updates: Partial<Tag>): Promise<AppResult<void>> => {
    const finalUpdates = { ...updates };
    if (finalUpdates.name) {
      finalUpdates.name = finalUpdates.name.toUpperCase().trim();
    }
    return updateTag(tagId, finalUpdates);
};

/**
 * Helper to delete a tag.
 */
export const deleteTagAtomic = async (tagId: string | number): Promise<AppResult<void>> => {
    return deleteTag(String(tagId));
};

/**
 * Helper to remove tag from photo.
 */
export const removeTagFromPhotoAtomic = async (photoId: string, tagId: string): Promise<AppResult<void>> => {
    return removeTagFromPhoto(photoId, tagId);
};

export const addTagToDB = addTag;
export const updateTagInDB = updateTagAtomic;
export const deleteTagFromDB = deleteTagAtomic;
export const removeTagFromPhotoFromDB = removeTagFromPhotoAtomic;


