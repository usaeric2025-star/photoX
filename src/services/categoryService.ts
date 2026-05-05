import { supabase } from '../lib/supabase';
import { Category } from '../types';
import { createCache } from './cacheUtils';

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
  const { error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', categoryId);
  
  if (error) {
    console.error("Failed to update category:", error);
    return false;
  }
  categoryCache.clear();
  return true;
};

export const deleteCategoryFromDB = async (categoryId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId);
  
  if (error) {
    console.error("Failed to delete category:", error);
    return false;
  }
  categoryCache.clear();
  return true;
};

export const addCategoryToDB = async (name: string): Promise<Category | null> => {
  const { data, error } = await supabase
    .from('categories')
    .insert([{ name, sort_order: 0 }])
    .select()
    .single();
  
  if (error) {
    console.error("Failed to add category:", error);
    return null;
  }
  categoryCache.clear();
  return data;
};
