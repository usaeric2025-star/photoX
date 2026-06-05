import { errorFactory, success } from '@/lib/errorFactory';
import type { AppResult } from '@/lib/errorFactory';
import { supabase } from '../../lib/supabase';
import { ProductGroup } from '../../types';

export const TABLE_NAME = 'groups';

export const loadGroupsFromCloud = async (userId: string): Promise<AppResult<ProductGroup[]>> => {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .or('is_hidden.eq.false,is_hidden.is.null');

    if (error) {
      if (error.message.includes('relation "groups" does not exist')) {
        console.warn("Table 'groups' does not exist in DB yet.");
        return success([]);
      }
      return errorFactory(`Failed to fetch groups: ${error.message}`, 'DB_ERROR', 'loadGroupsFromCloud', error);
    }

    const groups = (data || []).map(item => ({
      id: item.id,
      name: (item.name && typeof item.name === 'object') ? item.name : { zh: String(item.name || '') },
      description: (item.description && typeof item.description === 'object') ? item.description : { zh: String(item.description || '') },
      colors: item.colors || [],
      materials: item.materials || [],
      cover_photo_id: item.cover_photo_id,
      is_hidden: (item.is_hidden ?? false) as boolean,
      created_at: item.created_at,
      updated_at: item.updated_at,
      user_id: item.user_id,
      member_count: item.member_count ?? 1
    }));
    return success(groups);
};

export const getGroupById = async (id: string): Promise<AppResult<ProductGroup | null>> => {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return success(null);
      return errorFactory(`Failed to fetch group: ${error.message}`, 'DB_ERROR', 'getGroupById', error);
    }

    if (!data) return success(null);

    const result: ProductGroup = {
      id: data.id,
      name: (data.name && typeof data.name === 'object') ? data.name : { zh: String(data.name || '') },
      description: (data.description && typeof data.description === 'object') ? data.description : { zh: String(data.description || '') },
      colors: data.colors || [],
      materials: data.materials || [],
      cover_photo_id: data.cover_photo_id,
      is_hidden: (data.is_hidden ?? false) as boolean,
      created_at: data.created_at,
      updated_at: data.updated_at,
      user_id: data.user_id,
      member_count: data.member_count ?? 1
    };
    
    return success(result);
};
