import { 
  updateGroupInCloud as updateGroup,
  upsertGroupInCloud as upsertGroup,
  createGroupInCloud as createGroup,
  deleteGroupFromCloud as deleteGroup
} from './groupMutationService';
import { supabase } from '../lib/supabase';
import { supabasePublic } from '../lib/supabase-public';
import { ProductGroup } from '../types';

export const TABLE_NAME = 'groups';

export const loadGroupsFromCloud = async (userId: string): Promise<ProductGroup[]> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .or('is_hidden.eq.false,is_hidden.is.null');

  if (error) {
    if (error.message.includes('relation "groups" does not exist')) {
      console.warn("Table 'groups' does not exist in DB yet.");
      return [];
    }
    throw error;
  }

  return (data || []).map(item => ({
    id: item.id,
    name: item.name,
    description: item.description,
    colors: item.colors || [],
    materials: item.materials || [],
    cover_photo_id: item.cover_photo_id,
    is_hidden: (item.is_hidden ?? false) as boolean,
    created_at: item.created_at,
    updated_at: item.updated_at,
    user_id: item.user_id
  }));
};

export const saveGroupToCloud = async (group: Partial<ProductGroup> & { id: string }) => {
  await upsertGroup(group);
};

export const getGroupById = async (id: string): Promise<ProductGroup | null> => {

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
    is_hidden: (data.is_hidden ?? false) as boolean,
    created_at: data.created_at,
    updated_at: data.updated_at,
    user_id: data.user_id
  };
  
  return result;
};

export const deleteGroupFromCloud = async (id: string) => {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  await deleteGroup(id, userId);
};
