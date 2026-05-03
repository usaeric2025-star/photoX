
import { supabase, TABLE_NAME, BUCKET_NAME } from '../services/client';
import { Photo } from '../types';
import { mapSupabasePhoto } from '../services/photoService';

export const photoApi = {
  async getAll(params: {
    userId?: string;
    since?: string;
    page?: number;
    limit?: number;
    categoryId?: string | null;
    tagId?: string | null;
    searchQuery?: string | null;
  }) {
    const { userId, since, page = 0, limit = 1000, categoryId, tagId, searchQuery } = params;
    
    let query = supabase
      .from(TABLE_NAME)
      .select(`
        *,
        photo_tags(${tagId ? '!inner' : ''}*),
        category:categories(*)
      `);

    if (userId) query = query.eq('user_id', userId);
    if (since) query = query.gt('updated_at', since);
    if (categoryId) query = query.eq('category_id', categoryId);
    if (tagId) query = query.eq('photo_tags.tag_id', tagId);
    
    if (searchQuery) {
      const q = searchQuery.trim();
      query = query.or(`name.ilike.%${q}%,manual_code.ilike.%${q}%,model_number.ilike.%${q}%`);
    }

    const from = page * limit;
    const to = from + limit - 1;

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return (data as any[] || []).map(mapSupabasePhoto);
  },

  async getCount(params: {
    categoryId?: string | null;
    tagId?: string | null;
    searchQuery?: string | null;
  }) {
    const { categoryId, tagId, searchQuery } = params;
    
    let query = supabase
      .from(TABLE_NAME)
      .select('*', { count: 'exact', head: true });
    
    if (categoryId) query = query.eq('category_id', categoryId);
    if (tagId) query = query.eq('photo_tags.tag_id', tagId);
    if (searchQuery) {
      const q = searchQuery.trim();
      query = query.or(`name.ilike.%${q}%,manual_code.ilike.%${q}%,model_number.ilike.%${q}%`);
    }

    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  },

  async upsert(payload: Partial<Photo>) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .upsert(payload, { onConflict: 'id' })
      .select('id')
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async deleteSlice(ids: string[], userId: string) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .in('id', ids)
      .eq('user_id', userId)
      .select('id');

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Photo>) {
    const { error } = await supabase
      .from(TABLE_NAME)
      .update(updates)
      .eq('id', id);
    
    if (error) throw error;
  },

  async batchUpdate(ids: string[], updates: Partial<Photo>) {
    const { error } = await supabase
      .from(TABLE_NAME)
      .update(updates)
      .in('id', ids);
    
    if (error) throw error;
  }
};
