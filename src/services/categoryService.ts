import { supabase } from '../lib/supabase';
import { Category } from '../types';
import { createCache } from './cacheUtils';
import { updateCategory, createCategory, deleteCategory } from './categoriesMutationService';

const categoryCache = createCache<Category[]>();

export const loadCategoriesFromCloud = async (): Promise<Category[]> => {
  const cached = categoryCache.get();
  if (cached) return cached;

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error("Failed to load categories:", error);
    return [];
  }
  
  const result = data || [];
  categoryCache.set(result);
  return result;
};

export const updateCategoryInDB = async (categoryId: string, updates: Partial<Category>): Promise<boolean> => {
  await updateCategory(categoryId, updates);
  categoryCache.clear();
  return true;
};

export const deleteCategoryFromDB = async (categoryId: string): Promise<boolean> => {
  await deleteCategory(categoryId);
  categoryCache.clear();
  return true;
};

export const addCategoryToDB = async (name: string): Promise<Category | null> => {
  const data = await createCategory({ name, sortOrder: 0 } as Category);
  categoryCache.clear();
  return data;
};
