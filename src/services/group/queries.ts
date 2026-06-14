import { ErrorFactory } from '@/lib/error/ErrorFactory';
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
  member_count: item.member_count ?? 1,
  status: item.status,
  metadata: item.metadata,
});

export const loadGroupsFromCloud = async (userId: string, isAdmin: boolean = false): Promise<ProductGroup[]> => {
  let query = supabase
    .from(TABLE_NAME)
    .select('*')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });

  if (!isAdmin) {
    query = query.eq('status', 'confirmed').or('is_hidden.eq.false,is_hidden.is.null');
  }

  const { data, error } = await query;
  if (error) {
    throw ErrorFactory.fatal(error.message, { context: 'loadGroupsFromCloud' });
  }
  
  return (data || []).map(mapGroup);
};

export const getGroupById = async (id: string, mode: 'public' | 'admin' = 'public'): Promise<ProductGroup | null> => {
  let query = supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', id);

  if (mode === 'public') {
    query = query.eq('status', 'confirmed').or('is_hidden.eq.false,is_hidden.is.null');
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw ErrorFactory.fatal(error.message, { context: 'getGroupById' });
  }
  
  return data ? mapGroup(data) : null;
};
