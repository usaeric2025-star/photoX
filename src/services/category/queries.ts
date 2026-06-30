import { Category } from '@/types';
import { logger } from '@/lib/logger';
import { api } from '@/lib/api';

const TABLE_NAME = 'categories';

export const loadCategoriesFromCloud = async (): Promise<Category[]> => {
  const res = await api.categories.$get();
  if (!res.ok) {
    throw new Error(`Failed to fetch categories: ${res.statusText}`);
  }
  const json = await res.json();
  
  if (!json.success) {
    logger.error("Failed to load categories from API", json.error);
    throw new Error(`Failed to load categories from API: ${json.error || 'Unknown error'}`);
  }
  
  logger.info("Categories loaded successfully from API", json.data.length);
  return json.data || [];
};
