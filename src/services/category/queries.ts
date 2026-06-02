import { logger } from '@/lib/logger';
import { supabase } from '../../lib/supabase';
import { Category } from '../../types';

export const TABLE_NAME = 'categories';

export const loadCategoriesFromCloud = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*');

  if (error) {
    logger.error("Failed to load categories from TABLE_NAME", TABLE_NAME, ":", JSON.stringify(error, null, 2));
    return [];
  }
  
  logger.info("Categories loaded successfully from", TABLE_NAME, ":", data);
  return data || [];
};
