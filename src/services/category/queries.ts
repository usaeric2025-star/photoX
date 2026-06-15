import { logger } from '@/lib/logger';
import { supabase } from '../../lib/supabase';
import { Category } from '../../types';

export const TABLE_NAME = 'categories';

export const loadCategoriesFromCloud = async (): Promise<any[]> => {
  try {
    const res = await fetch('/api/categories');
    const json = await res.json();
    
    if (!json.success) {
      logger.error("Failed to load categories from API", json.error);
      return [];
    }
    
    logger.info("Categories loaded successfully from API", json.data.length);
    return json.data || [];
  } catch (error) {
    logger.error("Error fetching categories:", error);
    return [];
  }
};
