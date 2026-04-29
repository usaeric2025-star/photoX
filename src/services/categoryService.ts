import { supabase } from './client';
import { Category } from '../types';

export const loadCategoriesFromCloud = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error("Failed to load categories:", error);
    return [];
  }
  return data || [];
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
  return data;
};
