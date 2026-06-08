import { supabase } from '../../lib/supabase';
import { Category } from '../../types';
import { success } from '@/lib/error/ErrorFactory';
import { withErrorHandling } from '@/lib/error/wrapper';
import { DB_CONFIG } from '../../constants/config';
import type { AppResult } from '@/types/api';

const TABLE_NAME = 'categories';

/**
 * Clears category reference from photos.
 * @postcondition Photo category_id cleared.
 */
export const clearCategoryFromPhotos = async (categoryId: string): Promise<AppResult<string[]>> => {
  return withErrorHandling(async () => {
    const { data, error } = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .update({ category_id: null })
      .eq('category_id', categoryId)
      .select('id');
    if (error) throw error;
    return data?.map(i => i.id) || [];
  }, 'clearCategoryFromPhotos');
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

/**
 * Updates a category.
 * @precondition Category exists.
 * @postcondition Category record updated.
 */
export const updateCategory = async (categoryId: string, updates: Partial<Category>): Promise<AppResult<void>> => {
    return withErrorHandling(async () => {
        const dbUpdates = mapToDb(updates);
        const { error } = await supabase
            .from(TABLE_NAME)
            .update(dbUpdates)
            .eq('id', categoryId);
        if (error) throw error;
    }, 'updateCategory');
};

/**
 * Creates a new category.
 * @postcondition Category record created.
 */
export const createCategory = async (categoryData: Omit<Category, 'id'>): Promise<AppResult<Category>> => {
    return withErrorHandling(async () => {
        const dbUpdates = mapToDb(categoryData as any);
        const { error, data } = await supabase
            .from(TABLE_NAME)
            .insert(dbUpdates)
            .select()
            .single();
        if (error) throw error;
        return data as Category;
    }, 'createCategory');
};

/**
 * Deletes a category.
 * @precondition Category exists.
 * @postcondition Category record deleted.
 */
export const deleteCategory = async (categoryId: string): Promise<AppResult<void>> => {
    return withErrorHandling(async () => {
        const { error } = await supabase
            .from(TABLE_NAME)
            .delete()
            .eq('id', categoryId);
        if (error) throw error;
    }, 'deleteCategory');
};

export const addCategoryToDB = async (name: string): Promise<Category | null> => {
    const result = await createCategory({ name, aliases: [], subcategories: [] } as any);
    return result.ok ? result.data : null;
};

export const updateCategoryInDB = async (categoryId: string, updates: Partial<Category>): Promise<boolean> => {
    const result = await updateCategory(categoryId, updates);
    return result.ok;
};

export const deleteCategoryFromDB = async (categoryId: string): Promise<boolean> => {
    const result = await deleteCategory(categoryId);
    return result.ok;
};
