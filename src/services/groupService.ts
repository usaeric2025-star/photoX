import { supabase } from '../lib/supabase';
import { ProductGroup } from '../types';

export const TABLE_NAME = 'groups';

export const loadGroupsFromCloud = async (userId: string): Promise<ProductGroup[]> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', userId);

  if (error) {
    if (error.message.includes('relation "groups" does not exist')) {
      console.warn("Table 'groups' does not exist in DB yet.");
      return [];
    }
    console.error("Failed to fetch groups:", error);
    return [];
  }

  return (data || []).map(item => ({
    id: item.id,
    name: item.name,
    description: item.description,
    colors: item.colors || [],
    materials: item.materials || [],
    cover_photo_id: item.cover_photo_id,
    isHidden: item.isHidden,
    created_at: item.created_at,
    updated_at: item.updated_at,
    user_id: item.user_id
  }));
};

export const saveGroupToCloud = async (group: Partial<ProductGroup> & { id: string, user_id: string }) => {
  const payload: any = {
    id: group.id,
    name: group.name,
    description: group.description,
    colors: group.colors,
    materials: group.materials,
    cover_photo_id: group.cover_photo_id,
    isHidden: group.isHidden,
    user_id: group.user_id,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from(TABLE_NAME)
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    console.error("Failed to save group:", error);
    throw new Error(error.message);
  }
};

export const getGroupById = async (id: string): Promise<ProductGroup | null> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    colors: data.colors || [],
    materials: data.materials || [],
    cover_photo_id: data.cover_photo_id,
    isHidden: data.isHidden,
    created_at: data.created_at,
    updated_at: data.updated_at,
    user_id: data.user_id
  };
};

export const deleteGroupFromCloud = async (id: string) => {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  const query = supabase.from(TABLE_NAME).delete().eq('id', id);
  
  if (userId) {
    query.eq('user_id', userId);
  }

  const { error } = await query;

  if (error) {
    console.error(`[DB Error] Failed to delete group ${id}:`, error);
    throw new Error(`刪除群組中繼資料失敗: ${error.message} (Code: ${error.code})`);
  }
};
