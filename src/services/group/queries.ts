import { success } from '@/lib/error/ErrorFactory';
import { withSupabase } from '@/lib/error/supabaseWrapper';
import { withErrorHandling } from '@/lib/error/wrapper';
import type { AppResult } from '@/types/api';
import { supabase } from '../../lib/supabase';
import { ProductGroup } from '../../types';

export const TABLE_NAME = 'groups';

const parseTranslation = (val: any) => {
  if (!val) return { zh: '' };
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (e) {
      // Not JSON
    }
    return { zh: val };
  }
  return { zh: String(val) };
};

const mapGroup = (item: any): ProductGroup => ({
  id: item.id,
  name: parseTranslation(item.name),
  description: parseTranslation(item.description),
  colors: item.colors || [],
  materials: item.materials || [],
  cover_photo_id: item.cover_photo_id,
  is_hidden: (item.is_hidden ?? false) as boolean,
  created_at: item.created_at,
  updated_at: item.updated_at,
  user_id: item.user_id,
  member_count: item.member_count ?? 1
});

export const loadGroupsFromCloud = async (userId: string): Promise<AppResult<ProductGroup[]>> => {
  return withErrorHandling(async () => {
    const query = supabase
      .from(TABLE_NAME)
      .select('*')
      .or('is_hidden.eq.false,is_hidden.is.null');

    const res = await withSupabase(query, 'loadGroupsFromCloud');
    if (!res.ok) return res;
    
    return success((res.data || []).map(mapGroup));
  }, 'loadGroupsFromCloud');
};

export const getGroupById = async (id: string): Promise<AppResult<ProductGroup | null>> => {
  return withErrorHandling(async () => {
    const query = supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    const res = await withSupabase(query, 'getGroupById');
    if (!res.ok) return res;
    
    return success(res.data ? mapGroup(res.data) : null);
  }, 'getGroupById');
};
