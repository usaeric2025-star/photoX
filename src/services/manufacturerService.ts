import { supabase } from '../lib/supabase';
import { SubCategory as Manufacturer } from '../types';
import { createCache } from './cacheUtils';
import { updateManufacturer, createManufacturer, deleteManufacturer } from './manufacturersMutationService';

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
  const data = await createManufacturer({ name, aliases: [] } as Manufacturer);
  manufacturerCache.clear();
  return { ...data, id: String(data.id) } as Manufacturer;
};

// 更新厂商
export const updateManufacturerInDB = async (id: string, updates: Partial<Manufacturer>) => {
  await updateManufacturer(id, updates);
  manufacturerCache.clear();
  return true;
};

// 删除厂商
export const deleteManufacturerFromDB = async (id: string) => {
  await deleteManufacturer(id);
  manufacturerCache.clear();
  return true;
};
