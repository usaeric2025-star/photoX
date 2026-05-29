import { type Result, ok, err, createError } from '@/lib/errorFactory';
import { 
  updateGroupInCloud as updateGroup,
  upsertGroupInCloud as upsertGroup,
  createGroupInCloud as createGroup,
  deleteGroupFromCloud as deleteGroup
} from './groupMutationService';
import { supabase } from '../lib/supabase';
import { ProductGroup } from '../types';

export const TABLE_NAME = 'groups';

export const loadGroupsFromCloud = async (userId: string): Promise<Result<ProductGroup[], Error>> => {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .or('is_hidden.eq.false,is_hidden.is.null');

    if (error) {
      if (error.message.includes('relation "groups" does not exist')) {
        console.warn("Table 'groups' does not exist in DB yet.");
        return ok([]);
      }
      return err(createError(`Failed to fetch groups: ${error.message}`, ['groups', 'loadGroupsFromCloud']));
    }

    const groups = (data || []).map(item => ({
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
    return ok(groups);
  } catch (errValue) {
    return err(errValue instanceof Error ? errValue : new Error(String(errValue)));
  }
};

export const saveGroupToCloud = async (group: Partial<ProductGroup> & { id: string }): Promise<Result<void, Error>> => {
  try {
    await upsertGroup(group);
    return ok(undefined);
  } catch (errValue) {
    return err(errValue instanceof Error ? errValue : new Error(String(errValue)));
  }
};

export const getGroupById = async (id: string): Promise<Result<ProductGroup | null, Error>> => {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return ok(null);
      return err(createError(`Failed to fetch group: ${error.message}`, ['groups', 'getGroupById']));
    }

    if (!data) return ok(null);

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
    
    return ok(result);
  } catch (errValue) {
    return err(errValue instanceof Error ? errValue : new Error(String(errValue)));
  }
};

export const deleteGroupFromCloud = async (id: string): Promise<Result<void, Error>> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    await deleteGroup(id, userId);
    return ok(undefined);
  } catch (errValue) {
    return err(errValue instanceof Error ? errValue : new Error(String(errValue)));
  }
};
