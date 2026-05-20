import { supabase } from '../lib/supabase';
import { Category } from '../types';
import { updateCategory, createCategory, deleteCategory } from './categoriesMutationService';

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
  await updateCategory(categoryId, updates);
  return true;
};

export const deleteCategoryFromDB = async (categoryId: string): Promise<boolean> => {
  await deleteCategory(categoryId);
  return true;
};

export const addCategoryToDB = async (name: string): Promise<Category | null> => {
  const data = await createCategory({ name, sortOrder: 0, aliases: [], subcategories: [] } as unknown as Omit<Category, 'id'>);
  return data;
};
