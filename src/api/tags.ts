
import { supabase } from '../lib/supabase';
import { DB_CONFIG } from '../constants/config';
import { Tag } from '../types';

export const tagApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map((t: any) => ({
      ...t,
      name: (t.name || '').toUpperCase(),
      id: String(t.id)
    })) as Tag[];
  },

  async create(name: string) {
    const normalizedName = name.toUpperCase().trim();
    const { data, error } = await supabase
      .from('tags')
      .insert([{ name: normalizedName }])
      .select()
      .single();

    if (error) throw error;
    return { ...data, id: String(data.id) } as Tag;
  },

  async batchCreate(names: string[]) {
    const normalizedNames = names.map(n => n.toUpperCase().trim());
    const { data, error } = await supabase
      .from('tags')
      .insert(normalizedNames.map(name => ({ name })))
      .select('id, name');

    if (error) throw error;
    return data || [];
  },

  async update(id: string, name: string) {
    const normalizedName = name.toUpperCase().trim();
    const { error } = await supabase
      .from('tags')
      .update({ name: normalizedName })
      .eq('id', id);

    if (error) throw error;
  },

  async deleteOne(id: string) {
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
