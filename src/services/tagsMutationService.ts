import { supabase } from '../lib/supabase';
import { Tag } from '../types';

const TABLE_NAME = 'tags';

const ALLOWED_FIELDS = ['id', 'name', 'zh', 'en', 'ms', 'aliases', 'userId'];
const NEVER_ALLOWED = ['isAnalyzing', 'exif_data', 'is_hidden', 'tempId', 'isSelected', 'isDragging', 'rawResponse'];

const FIELD_MAP: Record<string, string> = {
    userId: 'user_id',
};

const mapToDb = (updates: Partial<Tag> & Record<string, unknown>, isCreate = false): Record<string, unknown> => {
    const dbUpdates: Record<string, unknown> = {};

    // Filter
    for (const key of ALLOWED_FIELDS) {
        if (key in updates && !NEVER_ALLOWED.includes(key)) {
            const dbKey = FIELD_MAP[key] || key;
            dbUpdates[dbKey] = updates[key];
        }
    }

    return dbUpdates;
};

export const updateTag = async (tagId: string, updates: Partial<Tag>) => {
    const dbUpdates = mapToDb(updates);
    const { error } = await supabase
        .from(TABLE_NAME)
        .update(dbUpdates)
        .eq('id', tagId);

    if (error) {
        throw new Error(error.message);
    }
};

export const createTag = async (tagData: Omit<Tag, 'id'>) => {
    const dbUpdates = mapToDb(tagData, true);
    const { error, data } = await supabase
        .from(TABLE_NAME)
        .insert(dbUpdates)
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }
    return data;
};

export const batchCreateTags = async (tags: Partial<Tag>[]) => {
    const dbUpdates = tags.map(tag => mapToDb(tag, true));
    const { error, data } = await supabase
        .from(TABLE_NAME)
        .insert(dbUpdates)
        .select('id, name');

    if (error) {
        throw new Error(error.message);
    }
    return data;
};

export const deleteTag = async (tagId: string) => {
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', tagId);
    if (error) {
        throw new Error(error.message);
    }
};

export const removeTagFromPhoto = async (photoId: string, tagId: string) => {
    const { error } = await supabase
        .from('photo_tags')
        .delete()
        .eq('photo_id', photoId)
        .eq('tag_id', tagId);
    if (error) {
        throw new Error(error.message);
    }
};
