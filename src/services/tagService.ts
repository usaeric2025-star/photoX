import { supabase } from '../lib/supabase';
import { Tag } from '../types';
import { createCache } from './cacheUtils';
import { createTag, updateTag, deleteTag, batchCreateTags as createBatchTags } from './tagsMutationService';

const tagCache = createCache<Tag[]>();

export const loadTagsFromCloud = async (): Promise<Tag[]> => {
    const cached = tagCache.get();
    if (cached) return cached;

    const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name', { ascending: true });
    
    if (error) {
        return [];
    }
    
    // Ensure name is uppercase and id is string
    const result = (data || []).map((t: Tag) => ({
      ...t,
      name: (t.name || '').toUpperCase(),
      id: String(t.id)
    }));

    tagCache.set(result);
    return result;
};

export const addTagToDB = async (name: string): Promise<Tag> => {
    const normalizedName = name.toUpperCase().trim();
    const tag = await createTag({ name: normalizedName } as Tag);
    tagCache.clear();
    return { ...tag, id: String(tag.id) } as Tag;
};

export const batchCreateTags = async (names: string[]): Promise<Map<string, string>> => {
    const data = await createBatchTags(names.map(name => ({ name: name.toUpperCase().trim() })));
    tagCache.clear();
    const map = new Map<string, string>();
    (data || []).forEach(t => map.set(t.name, String(t.id)));
    return map;
};

export const updateTagInDB = async (tagId: string, name: string): Promise<boolean> => {
    const normalizedName = name.toUpperCase().trim();
    await updateTag(tagId, { name: normalizedName });
    tagCache.clear();
    return true;
};

export const deleteTagFromDB = async (tagId: string | number): Promise<boolean> => {
    await deleteTag(String(tagId));
    tagCache.clear();
    return true;
};
