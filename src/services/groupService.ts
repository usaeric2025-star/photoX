import { supabase } from '../lib/supabase';
import { supabasePublic } from '../lib/supabase-public';
import { ProductGroup } from '../types';

export const TABLE_NAME = 'groups';

const ALLOWED_FIELDS = [
    'id', 'name', 'description', 'description_translations', 'colors', 'materials',
    'is_hidden', 'cover_photo_id', 'user_id', 'created_at', 'updated_at'
];

const mapToDb = (updates: Partial<ProductGroup> & Record<string, unknown>, isCreate = false, userId?: string): Record<string, unknown> => {
    const dbUpdates: Record<string, unknown> = {};

    // Filter
    for (const key of ALLOWED_FIELDS) {
        if (key in updates) {
            const val = updates[key];
            if (key === 'user_id' && (val === '' || val === 'default' || !val)) {
                continue;
            }
            dbUpdates[key] = val;
        }
    }

    // Auto-timestamps
    dbUpdates.updated_at = new Date().toISOString();
    if (isCreate && !dbUpdates.created_at) {
        dbUpdates.created_at = new Date().toISOString();
    }
    
    // Explicitly set user_id if provided and not already set
    if (userId && (!dbUpdates.user_id || dbUpdates.user_id === 'default' || dbUpdates.user_id === '')) {
        dbUpdates.user_id = userId;
    }

    return dbUpdates;
};

const getCurrentUserId = async (): Promise<string | undefined> => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
};

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

export const updateGroup = async (groupId: string, updates: Partial<ProductGroup>) => {
    const userId = await getCurrentUserId();
    const dbUpdates = mapToDb(updates, false, userId);
    const { error } = await supabase
        .from(TABLE_NAME)
        .update(dbUpdates)
        .eq('id', groupId);

    if (error) {
        throw new Error(`Update Group Fail: ${error.message}`);
    }
};

export const upsertGroup = async (group: Partial<ProductGroup> & { id: string }) => {
    const userId = await getCurrentUserId();
    const dbUpdates = mapToDb(group, false, userId);
    const { error } = await supabase
        .from(TABLE_NAME)
        .upsert(dbUpdates, { onConflict: 'id' });

    if (error) {
        throw new Error(`Upsert Group Fail: ${error.message}`);
    }
};

export const saveGroupToCloud = async (group: Partial<ProductGroup> & { id: string }) => {
  // console.log('saveGroupToCloud group:', group);
  await upsertGroup(group);
};

export const createGroup = async (groupData: ProductGroup) => {
    const userId = await getCurrentUserId();
    const dbUpdates = mapToDb(groupData as unknown as Record<string, unknown>, true, userId);
    const { error, data } = await supabase
        .from(TABLE_NAME)
        .insert(dbUpdates)
        .select()
        .single();

    if (error) {
        throw new Error(`Create Group Fail: ${error.message}`);
    }
    return data;
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

export const deleteGroup = async (id: string, userId?: string) => {
    let query = supabase.from(TABLE_NAME).delete().eq('id', id);
    if (userId) {
        query = query.eq('user_id', userId);
    }
    const { error } = await query;
    if (error) {
        throw new Error(`Delete Group Fail: ${error.message}`);
    }
};

export const deleteGroupFromCloud = async (id: string) => {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  await deleteGroup(id, userId);
};
