import { supabase } from './client';
import { Tag } from '../types';

export const loadTagsFromCloud = async (): Promise<Tag[]> => {
    const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name', { ascending: true });
    
    if (error) {
        console.error("Failed to load tags from cloud:", error);
        return [];
    }
    
    console.log("DEBUG: loadTagsFromCloud resulting data:", data);
    
    // Ensure name is uppercase and id is string
    return (data || []).map((t: any) => ({
      ...t,
      name: (t.name || '').toUpperCase(),
      id: String(t.id)
    }));
};

export const addTagToDB = async (name: string): Promise<Tag> => {
    const normalizedName = name.toUpperCase().trim();
    const { data, error } = await supabase
        .from('tags')
        .insert([{ name: normalizedName }])
        .select()
        .single();
    
    if (error) {
        console.error("Failed to add tag to DB:", error);
        
        let errorMessage = "Unknown tag error";
        if (error.message) {
            errorMessage = error.message;
        } else if (error.code) {
             errorMessage = `DB Error ${error.code}: ${error.details || ''}`;
        } else {
            try {
                errorMessage = JSON.stringify(error);
            } catch (e) {
                errorMessage = String(error);
            }
        }
        
        throw new Error(errorMessage);
    }
    return { ...data, id: String(data.id) };
};

export const batchCreateTags = async (names: string[]): Promise<Map<string, string>> => {
    const normalizedNames = names.map(n => n.toUpperCase().trim());
    const { data, error } = await supabase
        .from('tags')
        .insert(normalizedNames.map(name => ({ name })))
        .select('id, name');
    
    if (error) {
        console.error("Failed to batch create tags:", error);
        
        let errorMessage = "Unknown batch tag error";
        if (error.message) {
            errorMessage = error.message;
        } else if (error.code) {
             errorMessage = `DB Error ${error.code}: ${error.details || ''}`;
        } else {
            try {
                errorMessage = JSON.stringify(error);
            } catch (e) {
                errorMessage = String(error);
            }
        }
        
        throw new Error(errorMessage);
    }
    
    const map = new Map<string, string>();
    (data || []).forEach(t => map.set(t.name, String(t.id)));
    return map;
};

export const updateTagInDB = async (tagId: string, name: string): Promise<boolean> => {
    const normalizedName = name.toUpperCase().trim();
    const { error } = await supabase
        .from('tags')
        .update({ name: normalizedName })
        .eq('id', tagId);
    
    if (error) {
        console.error("Failed to update tag:", error);
        return false;
    }
    return true;
};

export const deleteTagFromDB = async (tagId: string | number): Promise<boolean> => {
    // 1. Delete associations first
    try {
        console.log(`[tagService] Deleting associations for tagId:`, tagId, `(type: ${typeof tagId})`);
        await supabase
            .from('photo_tags')
            .delete()
            .eq('tag_id', tagId);
    } catch (e) {
        console.warn("Failed to delete tag associations, proceeding with tag deletion:", e);
    }

    // 2. Delete the tag itself
    const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId);
    
    if (error) {
        console.error("Failed to delete tag from cloud:", error);
        return false;
    }
    return true;
};
