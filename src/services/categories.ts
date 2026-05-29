import { supabase } from '../lib/supabase';
import { Category } from '../types';

const TABLE_NAME = 'categories';

const ALLOWED_FIELDS = ['id', 'name', 'zh', 'en', 'ms', 'aliases', 'subcategories', 'userId', 'code', 'sortOrder'];
const NEVER_ALLOWED = ['isAnalyzing', 'exif_data', 'is_hidden', 'tempId', 'isSelected', 'isDragging', 'rawResponse'];

const FIELD_MAP: Record<string, string> = {
    userId: 'user_id',
    sortOrder: 'sort_order',
};

const mapToDb = (updates: Partial<Category> & Record<string, unknown>, isCreate = false): Record<string, unknown> => {
    const dbUpdates: Record<string, unknown> = {};

    // Filter
    for (const key of ALLOWED_FIELDS) {
        if (key in updates && !NEVER_ALLOWED.includes(key)) {
            const dbKey = FIELD_MAP[key] || key;
            dbUpdates[dbKey] = updates[key];
        }
    }

    return dbUpdates;
};

export const updateCategory = async (categoryId: string, updates: Partial<Category>) => {
    const dbUpdates = mapToDb(updates);
    const { error } = await supabase
        .from(TABLE_NAME)
        .update(dbUpdates)
        .eq('id', categoryId);

    if (error) {
        throw new Error(error.message);
    }
};

export const createCategory = async (categoryData: Omit<Category, 'id'>) => {
    const dbUpdates = mapToDb(categoryData, true);
    const { error, data } = await supabase
        .from(TABLE_NAME)
        .insert(dbUpdates)
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }
    return data;
};

export const deleteCategory = async (categoryId: string) => {
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', categoryId);
    if (error) {
        throw new Error(error.message);
    }
};

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
