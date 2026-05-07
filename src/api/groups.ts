
import { supabase } from '../lib/supabase';
import { DB_CONFIG } from '../constants/config';
import { ProductGroup } from '../types';
import { upsertGroup, deleteGroup } from '../services/groupMutationService';

const TABLE_NAME = 'groups';

export const groupApi = {
  async getAll(userId: string) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return (data || []).map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      description_translations: item.description_translations || null,
      colors: item.colors || [],
      materials: item.materials || [],
      cover_photo_id: item.cover_photo_id,
      created_at: item.created_at,
      updated_at: item.updated_at,
      user_id: item.user_id
    })) as ProductGroup[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as ProductGroup;
  },

  async upsert(group: any) {
    await upsertGroup(group);
  },

  async deleteOne(id: string, userId: string) {
    await deleteGroup(id, userId);
  }
};
