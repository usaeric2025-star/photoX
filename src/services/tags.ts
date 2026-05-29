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

export const batchCreateTagsInCloud = async (tags: Partial<Tag>[]) => {
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

export const triggerRefreshTagHotScores = async () => {
    const { error } = await supabase.rpc('refresh_tag_hot_scores');
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

export const loadTagsFromCloud = async (): Promise<Tag[]> => {
    const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name', { ascending: true });
    
    if (error) {
        return [];
    }
    
    // Ensure name is uppercase and id is string, map hot_score
    const result = (data || []).map((t: any) => ({
      ...t,
      name: (t.name || '').toUpperCase(),
      id: String(t.id),
      hot_score: t.hot_score || 0
    }));

    return result;
};

export const addTagToDB = async (name: string): Promise<Tag> => {
    const normalizedName = name.toUpperCase().trim();
    const tag = await createTag({ name: normalizedName } as Tag);
    return { ...tag, id: String(tag.id) } as Tag;
};

export const batchCreateTags = async (names: string[]): Promise<Map<string, string>> => {
    const data = await batchCreateTagsInCloud(names.map(name => ({ name: name.toUpperCase().trim() })));
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
