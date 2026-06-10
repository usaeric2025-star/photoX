import { supabase } from '../../lib/supabase';
import { Tag } from '../../types';
import { errorFactory, success, ErrorFactory } from '@/lib/error/ErrorFactory';
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
    const { error } = await supabase
        .from(TABLE_NAME)
        .update(dbUpdates)
        .eq('id', tagId);

    if (error) {
        return errorFactory(error.message, 'DB_ERROR', '[updateTag] error', error);
    }
    return success(undefined);
};

/**
 * Creates a new tag.
 * @precondition Unique tag name.
 * @postcondition Tag record created.
 */
export const createTag = async (tagData: Omit<Tag, 'id'>): Promise<AppResult<Tag>> => {
    const dbUpdates = mapToDb(tagData as any);
    const { error, data } = await supabase
        .from(TABLE_NAME)
        .insert(dbUpdates)
        .select()
        .single();

    if (error) {
        return errorFactory(error.message, 'DB_ERROR', '[createTag] error', error);
    }
    return success(data as Tag);
};

/**
 * Bulk creates tags.
 * @postcondition Tag records created.
 */
export const batchCreateTagsInCloud = async (tags: Partial<Tag>[]): Promise<AppResult<Tag[]>> => {
    const dbUpdates = tags.map(tag => mapToDb(tag as any));
    const { error, data } = await supabase
        .from(TABLE_NAME)
        .insert(dbUpdates)
        .select('id, name');

    if (error) {
        return errorFactory(error.message, 'DB_ERROR', '[batchCreateTagsInCloud] error', error);
    }
    return success(data as Tag[]);
};

/**
 * Deletes a tag.
 * @precondition Tag exists.
 * @postcondition Tag record deleted.
 */
export const deleteTag = async (tagId: string): Promise<AppResult<void>> => {
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', tagId);
    if (error) {
        return errorFactory(error.message, 'DB_ERROR', '[deleteTag] error', error);
    }
    return success(undefined);
};

/**
 * Refreshes hot scores via RPC.
 * @postcondition Hot scores recalculated.
 */
export const triggerRefreshTagHotScores = async (): Promise<AppResult<void>> => {
    const { error } = await supabase.rpc('refresh_tag_hot_scores');
    if (error) {
        return errorFactory(error.message, 'DB_ERROR', '[triggerRefreshTagHotScores] error', error);
    }
    return success(undefined);
};

/**
 * Removes tag association from a photo.
 * @precondition Link exists.
 * @postcondition Association removed.
 */
export const removeTagFromPhoto = async (photoId: string, tagId: string): Promise<AppResult<void>> => {
    const { error } = await supabase
        .from('photo_tags')
        .delete()
        .eq('photo_id', photoId)
        .eq('tag_id', tagId);
    if (error) {
        return errorFactory(error.message, 'DB_ERROR', '[removeTagFromPhoto] error', error);
    }
    return success(undefined);
};

/**
 * Syncs a set of tags for a single photo.
 * @precondition Photo exists.
 * @postcondition Tag associations updated.
 */
export const syncPhotoTags = async (photoId: string, tagIds: string[]): Promise<AppResult<void>> => {
    const { error: deleteError } = await supabase.from('photo_tags').delete().eq('photo_id', photoId);
    if (deleteError) return errorFactory(deleteError.message, 'DB_ERROR', 'syncPhotoTags/delete', deleteError);

    // 唯一限制點：強制限制最多 3 個標籤
    const limitedTagIds = tagIds.slice(0, 3);
    if (limitedTagIds.length > 0) {
        const associations = limitedTagIds.map(tagId => ({
            photo_id: photoId,
            tag_id: tagId
        }));
        const { error: insertError } = await supabase.from('photo_tags').insert(associations);
        if (insertError) return errorFactory(insertError.message, 'DB_ERROR', 'syncPhotoTags/insert', insertError);
    }
    return success(undefined);
};

/**
 * Syncs a set of photos with a new set of tags.
 * @precondition Photos exist.
 * @postcondition Tag associations updated.
 */
export const syncBatchPhotoTags = async (photoIds: string[], tagIds: string[]): Promise<AppResult<void>> => {
    const { error: deleteError } = await supabase.from('photo_tags').delete().in('photo_id', photoIds);
    if (deleteError) return errorFactory(deleteError.message, 'DB_ERROR', 'syncBatchPhotoTags/delete', deleteError);

    if (tagIds.length > 0) {
        const associations = photoIds.flatMap(photoId => 
            tagIds.map(tagId => ({
                photo_id: photoId,
                tag_id: tagId
            }))
        );
        const { error: insertError } = await supabase.from('photo_tags').insert(associations);
        if (insertError) return errorFactory(insertError.message, 'DB_ERROR', 'syncBatchPhotoTags/insert', insertError);
    }
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


