import { supabase } from '../lib/supabase';
import { Tag } from '../types';
import { createTag, updateTag, deleteTag, batchCreateTagsInCloud as createBatchTags, removeTagFromPhoto } from './tagsMutationService';

export const loadTagsFromCloud = async (): Promise<Tag[]> => {
    const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name', { ascending: true });
    
    if (error) {
        return [];
    }
    
    // Ensure name is uppercase and id is string, map usage_count
    const result = (data || []).map((t: any) => ({
      ...t,
      name: (t.name || '').toUpperCase(),
      id: String(t.id),
      usage_count: t.usage_count || 0
    }));

    return result;
};

export const addTagToDB = async (name: string): Promise<Tag> => {
    const normalizedName = name.toUpperCase().trim();
    const tag = await createTag({ name: normalizedName } as Tag);
    return { ...tag, id: String(tag.id) } as Tag;
};

export const batchCreateTags = async (names: string[]): Promise<Map<string, string>> => {
    const data = await createBatchTags(names.map(name => ({ name: name.toUpperCase().trim() })));
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
