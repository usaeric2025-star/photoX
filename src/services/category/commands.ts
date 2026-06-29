import { api } from '@/lib/api';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { supabase } from '@/lib/supabase';
import { Category } from '@/types';
import { DB_CONFIG } from '@/constants/config';

const TABLE_NAME = 'categories';

/**
 * Clears category reference from photos.
 * @postcondition Photo category_id cleared.
 */
const clearCategoryFromPhotos = async (categoryId: number): Promise<string[]> => {
  const res = await api.categories['clear-photos'].$post({
    json: { categoryId: String(categoryId) }
  });
  if (!res.ok) throw ErrorFactory.fatal('Clear photos request failed', { context: 'clearCategoryFromPhotos' });
  const { data } = await res.json() as { data: string[] };
  return data || [];
};

const ALLOWED_FIELDS = ['id', 'name', 'zh', 'en', 'ms', 'aliases', 'subcategories', 'userId', 'code'];
const NEVER_ALLOWED = ['isAnalyzing', 'exif_data', 'is_hidden', 'tempId', 'isSelected', 'isDragging', 'rawResponse'];

const FIELD_MAP: Record<string, string> = {
    userId: 'user_id',
};

const mapToDb = (updates: Partial<Category> & Record<string, unknown>): Record<string, unknown> => {
    const dbUpdates: Record<string, unknown> = {};

    for (const key of ALLOWED_FIELDS) {
        if (key in updates && !NEVER_ALLOWED.includes(key)) {
            const dbKey = FIELD_MAP[key] || key;
            dbUpdates[dbKey] = updates[key];
        }
    }

    return dbUpdates;
};

export const updateCategory = async (categoryId: number, updates: Partial<Category>): Promise<void> => {
  const dbUpdates = mapToDb(updates);
  const res = await api.categories[':id'].$put({
    param: { id: String(categoryId) },
    json: { updates: dbUpdates }
  });
  if (!res.ok) throw ErrorFactory.fatal('Update category failed', { context: 'updateCategory' });
};

export const createCategory = async (categoryData: Partial<Category> & { name: string }): Promise<Category> => {
  const dbUpdates = mapToDb(categoryData as unknown as Partial<Category> & Record<string, unknown>);
  const res = await api.categories.$post({
    json: { categoryData: dbUpdates }
  });
  if (!res.ok) throw ErrorFactory.fatal('Create category failed', { context: 'createCategory' });
  const { data } = await res.json() as { data: Category };
  return data;
};

export const deleteCategory = async (categoryId: number): Promise<void> => {
  const res = await api.categories[':id'].$delete({
    param: { id: String(categoryId) }
  });
  if (!res.ok) throw ErrorFactory.fatal('Delete category failed', { context: 'deleteCategory' });
};

const addCategoryToDB = async (name: string): Promise<Category | null> => {
  try {
    return await createCategory({ name, code: '', aliases: [], subcategories: [] } as unknown as Omit<Category, 'id'>);
  } catch(e) {
    return null;
  }
};

const updateCategoryInDB = async (categoryId: number, updates: Partial<Category>): Promise<boolean> => {
  try {
    await updateCategory(categoryId, updates);
    return true;
  } catch(e) {
    return false;
  }
};

const deleteCategoryFromDB = async (categoryId: number): Promise<boolean> => {
  try {
    await deleteCategory(categoryId);
    return true;
  } catch(e) {
    return false;
  }
};
