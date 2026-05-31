import { supabase } from '../../lib/supabase';
import { Tag } from '../../types';
import { ok, err, Result } from 'neverthrow';
import { StandardError } from '@/lib/validators/protocol';

const TABLE_NAME = 'tags';
const ALLOWED_FIELDS = ['id', 'name', 'zh', 'en', 'ms', 'aliases', 'userId'];
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

export const updateTag = async (tagId: string, updates: Partial<Tag>): Promise<Result<void, StandardError>> => {
    const dbUpdates = mapToDb(updates);
    const { error } = await supabase
        .from(TABLE_NAME)
        .update(dbUpdates)
        .eq('id', tagId);

    if (error) {
        return err(new StandardError(error.message, { aiDebugHint: '[updateTag] error' }));
    }
    return ok(undefined);
};

export const createTag = async (tagData: Omit<Tag, 'id'>): Promise<Result<Tag, StandardError>> => {
    const dbUpdates = mapToDb(tagData as any);
    const { error, data } = await supabase
        .from(TABLE_NAME)
        .insert(dbUpdates)
        .select()
        .single();

    if (error) {
        return err(new StandardError(error.message, { aiDebugHint: '[createTag] error' }));
    }
    return ok(data as Tag);
};

export const batchCreateTagsInCloud = async (tags: Partial<Tag>[]): Promise<Result<Tag[], StandardError>> => {
    const dbUpdates = tags.map(tag => mapToDb(tag as any));
    const { error, data } = await supabase
        .from(TABLE_NAME)
        .insert(dbUpdates)
        .select('id, name');

    if (error) {
        return err(new StandardError(error.message, { aiDebugHint: '[batchCreateTagsInCloud] error' }));
    }
    return ok(data as Tag[]);
};

export const deleteTag = async (tagId: string): Promise<Result<void, StandardError>> => {
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', tagId);
    if (error) {
        return err(new StandardError(error.message, { aiDebugHint: '[deleteTag] error' }));
    }
    return ok(undefined);
};

export const triggerRefreshTagHotScores = async (): Promise<Result<void, StandardError>> => {
    const { error } = await supabase.rpc('refresh_tag_hot_scores');
    if (error) {
        return err(new StandardError(error.message, { aiDebugHint: '[triggerRefreshTagHotScores] error' }));
    }
    return ok(undefined);
};

export const removeTagFromPhoto = async (photoId: string, tagId: string): Promise<Result<void, StandardError>> => {
    const { error } = await supabase
        .from('photo_tags')
        .delete()
        .eq('photo_id', photoId)
        .eq('tag_id', tagId);
    if (error) {
        return err(new StandardError(error.message, { aiDebugHint: '[removeTagFromPhoto] error' }));
    }
    return ok(undefined);
};

export const addTagToDB = async (name: string): Promise<Tag> => {
    const normalizedName = name.toUpperCase().trim();
    const result = await createTag({ name: normalizedName } as Tag);
    if (result.isErr()) throw result.error;
    const tag = result.value;
    return { ...tag, id: String(tag.id) } as Tag;
};

export const batchCreateTags = async (names: string[]): Promise<Map<string, string>> => {
    const result = await batchCreateTagsInCloud(names.map(name => ({ name: name.toUpperCase().trim() })));
    if (result.isErr()) throw result.error;
    const data = result.value;
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
