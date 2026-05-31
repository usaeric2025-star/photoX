import { supabase } from '../../lib/supabase';
import { SubCategory as Manufacturer } from '../../types';

export const TABLE_NAME = 'manufacturers';

export const loadManufacturersFromCloud = async (): Promise<Manufacturer[]> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .order('name', { ascending: true });
  if (error) {
    return [];
  }
  const result = (data || []).map((m) => ({
    ...(m as Manufacturer),
    id: String(m.id)
  }));
  return result;
};
