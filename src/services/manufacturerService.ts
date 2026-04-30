import { supabase } from './client';
import { SubCategory as Manufacturer } from '../types';

// 加载所有厂商
export const loadManufacturersFromCloud = async (): Promise<Manufacturer[]> => {
  const { data, error } = await supabase
    .from('manufacturers')
    .select('*')
    .order('name', { ascending: true });
  if (error) {
    return [];
  }
  return (data || []).map((m: any) => ({
    ...m,
    id: String(m.id)
  }));
};

// 新增厂商
export const addManufacturerToDB = async (name: string): Promise<Manufacturer> => {
  const { data, error } = await supabase
    .from('manufacturers')
    .insert({ name, aliases: [] })
    .select()
    .single();
  if (error) throw error;
  return { ...data, id: String(data.id) };
};

// 更新厂商
export const updateManufacturerInDB = async (id: string, name: string) => {
  const { error } = await supabase
    .from('manufacturers')
    .update({ name })
    .eq('id', id);
  if (error) throw error;
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
  return true;
};
