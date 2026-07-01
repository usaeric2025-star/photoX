import { Category } from '@/types';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { api } from '@/lib/api';

const TABLE_NAME = 'categories';

export const loadCategoriesFromCloud = async (): Promise<Category[]> => {
  const res = await api.categories.$get();
  if (!res.ok) {
    throw new Error(`Failed to fetch categories: ${res.statusText}`);
  }
  const json = await res.json();
  
  if (!json.success) {
    ErrorFactory.handle(new Error(json.error), { context: 'loadCategoriesFromCloud' });
    throw new Error(`Failed to load categories from API: ${json.error || 'Unknown error'}`);
  }
  
  return json.data || [];
};
