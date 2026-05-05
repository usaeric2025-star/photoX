import { supabase } from '../lib/supabase';
import { SubCategory as Manufacturer } from '../types';
import { createCache } from './cacheUtils';

const manufacturerCache = createCache<Manufacturer[]>();

// 加载所有厂商
export const loadManufacturersFromCloud = async (): Promise<Manufacturer[]> => {
  const cached = manufacturerCache.get();
  if (cached) return cached;

  const { data, error } = await supabase
    .from('manufacturers')
    .select('*')
    .order('name', { ascending: true });
  if (error) {
    return [];
  }
  const result = (data || []).map((m: any) => ({
    ...m,
    id: String(m.id)
  }));
  manufacturerCache.set(result);
  return result;
};

// 新增厂商
export const addManufacturerToDB = async (name: string): Promise<Manufacturer> => {
  const { data, error } = await supabase
    .from('manufacturers')
    .insert({ name, aliases: [] })
    .select()
    .single();
  if (error) throw error;
  manufacturerCache.clear();
  return { ...data, id: String(data.id) };
};

// 更新厂商
export const updateManufacturerInDB = async (id: string, name: string) => {
  const { error } = await supabase
    .from('manufacturers')
    .update({ name })
    .eq('id', id);
  if (error) throw error;
  manufacturerCache.clear();
  return true;
};

// 删除厂商
export const deleteManufacturerFromDB = async (id: string) => {
  const { error } = await supabase
    .from('manufacturers')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error(`[manufacturerService] Error deleting manufacturer: ${id}`, error);
    throw error;
  }
  manufacturerCache.clear();
  return true;
};
