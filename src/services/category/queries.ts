import { supabase } from '../../lib/supabase';
import { Category } from '../../types';

export const TABLE_NAME = 'categories';

export const loadCategoriesFromCloud = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error("Failed to load categories:", error);
    return [];
  }
  
  return data || [];
};
