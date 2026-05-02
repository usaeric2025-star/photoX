
import { supabase } from '../services/client';
import { Category } from '../types';

export const categoryApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async create(name: string) {
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name, sort_order: 0 }])
      .select()
      .single();

    if (error) throw error;
    return data as Category;
  },

  async update(id: string, updates: Partial<Category>) {
    const { error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  async deleteOne(id: string) {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
