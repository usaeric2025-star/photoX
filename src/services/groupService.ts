import { supabase } from '../lib/supabase';
import { supabasePublic } from '../lib/supabase-public';
import { ProductGroup } from '../types';
import { upsertGroup, deleteGroup } from './groupMutationService';

export const TABLE_NAME = 'groups';

export const loadGroupsFromCloud = async (userId: string): Promise<ProductGroup[]> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*');
    // .eq('user_id', userId);

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
    isHidden: (item.isHidden ?? false) as boolean,
    created_at: item.created_at,
    updated_at: item.updated_at,
    user_id: item.user_id
  }));
};

export const saveGroupToCloud = async (group: Partial<ProductGroup> & { id: string, user_id: string }) => {
  await upsertGroup(group);
};

const groupCache = new Map<string, ProductGroup>();

export const getGroupById = async (id: string): Promise<ProductGroup | null> => {
  if (groupCache.has(id)) return groupCache.get(id)!;

  const { data, error } = await supabasePublic
    .from(TABLE_NAME)
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  const result: ProductGroup = {
    id: data.id,
    name: data.name,
    description: data.description,
    description_translations: data.description_translations,
    colors: data.colors || [],
    materials: data.materials || [],
    cover_photo_id: data.cover_photo_id,
    isHidden: (data.isHidden ?? false) as boolean,
    created_at: data.created_at,
    updated_at: data.updated_at,
    user_id: data.user_id
  };
  
  groupCache.set(id, result);
  return result;
};

export const deleteGroupFromCloud = async (id: string) => {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  await deleteGroup(id, userId);
};
