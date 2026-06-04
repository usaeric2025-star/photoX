import { supabase } from '../../lib/supabase';
import { Tag } from '../../types';
import { errorFactory, success } from '@/lib/errorFactory';
import type { AppResult } from '@/lib/errorFactory';
import { StandardError } from '@/lib/validators/protocol';
import { ErrorFactory } from '../../lib/error/ErrorFactory';

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

export const updateTag = async (tagId: string, updates: Partial<Tag>): Promise<AppResult<void>> => {
    const dbUpdates = mapToDb(updates);
    const { error } = await supabase
        .from(TABLE_NAME)
        .update(dbUpdates)
        .eq('id', tagId);

    if (error) {
        return errorFactory(error.message, 'DB_ERROR', '[updateTag] error');
    }
    return success(undefined);
};

export const createTag = async (tagData: Omit<Tag, 'id'>): Promise<AppResult<Tag>> => {
    const dbUpdates = mapToDb(tagData as any);
    const { error, data } = await supabase
        .from(TABLE_NAME)
        .insert(dbUpdates)
        .select()
        .single();

    if (error) {
        return errorFactory(error.message, 'DB_ERROR', '[createTag] error');
    }
    return success(data as Tag);
};

export const batchCreateTagsInCloud = async (tags: Partial<Tag>[]): Promise<AppResult<Tag[]>> => {
    const dbUpdates = tags.map(tag => mapToDb(tag as any));
    const { error, data } = await supabase
        .from(TABLE_NAME)
        .insert(dbUpdates)
        .select('id, name');

    if (error) {
        return errorFactory(error.message, 'DB_ERROR', '[batchCreateTagsInCloud] error');
    }
    return success(data as Tag[]);
};

export const deleteTag = async (tagId: string): Promise<AppResult<void>> => {
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', tagId);
    if (error) {
        return errorFactory(error.message, 'DB_ERROR', '[deleteTag] error');
    }
    return success(undefined);
};

export const triggerRefreshTagHotScores = async (): Promise<AppResult<void>> => {
    const { error } = await supabase.rpc('refresh_tag_hot_scores');
    if (error) {
        return errorFactory(error.message, 'DB_ERROR', '[triggerRefreshTagHotScores] error');
    }
    return success(undefined);
};

export const removeTagFromPhoto = async (photoId: string, tagId: string): Promise<AppResult<void>> => {
    const { error } = await supabase
        .from('photo_tags')
        .delete()
        .eq('photo_id', photoId)
        .eq('tag_id', tagId);
    if (error) {
        return errorFactory(error.message, 'DB_ERROR', '[removeTagFromPhoto] error');
    }
    return success(undefined);
};

export const addTagToDB = async (name: string): Promise<Tag> => {
    const normalizedName = name.toUpperCase().trim();
    const result = await createTag({ name: normalizedName } as Tag);
    if (!result.ok) throw ErrorFactory.wrap(new Error(result.message), 'addTagToDB', name);
    const tag = result.data;
    return { ...tag, id: String(tag.id) } as Tag;
};

export const batchCreateTags = async (names: string[]): Promise<Map<string, string>> => {
    const result = await batchCreateTagsInCloud(names.map(name => ({ name: name.toUpperCase().trim() })));
    if (!result.ok) throw ErrorFactory.wrap(new Error(result.message), 'batchCreateTags', names.join(', '));
    const data = result.data;
    const map = new Map<string, string>();
    (data || []).forEach(t => map.set(t.name, String(t.id)));
    return map;
};

export const updateTagInDB = async (tagId: string, updates: Partial<Tag>): Promise<boolean> => {
    const finalUpdates = { ...updates };
    if (finalUpdates.name) {
      finalUpdates.name = finalUpdates.name.toUpperCase().trim();
    }
    await updateTag(tagId, finalUpdates);
    return true;
};

export const deleteTagFromDB = async (tagId: string | number): Promise<boolean> => {
    await deleteTag(String(tagId));
    return true;
};

export const removeTagFromPhotoFromDB = async (photoId: string, tagId: string): Promise<boolean> => {
    await removeTagFromPhoto(photoId, tagId);
    return true;
};
