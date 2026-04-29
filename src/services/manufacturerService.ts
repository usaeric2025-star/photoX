import { supabase } from './client';

// 加载所有厂商
export const loadManufacturersFromCloud = async () => {
  const { data, error } = await supabase
    .from('manufacturers')
    .select('*')
    .order('name', { ascending: true });
  if (error) {
    console.error("Failed to load manufacturers:", error);
    return [];
  }
  return data || [];
};

// 新增厂商
export const addManufacturerToDB = async (name: string) => {
  const { data, error } = await supabase
    .from('manufacturers')
    .insert({ name, aliases: [] })
    .select()
    .single();
  if (error) throw error;
  return data;
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
  if (error) throw error;
  return true;
};
