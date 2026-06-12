import { api } from '@/lib/api';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
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
    const res = await api.categories['clear-photos'].$post({
      json: { categoryId }
    });
    if (!res.ok) throw ErrorFactory.wrap(new Error('Clear photos request failed'), 'commands');
    const { data } = await res.json();
    return data || [];
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

export const updateCategory = async (categoryId: string, updates: Partial<Category>): Promise<AppResult<void>> => {
    return withErrorHandling(async () => {
        const dbUpdates = mapToDb(updates);
        const res = await api.categories[':id'].$put({
          param: { id: categoryId },
          json: { updates: dbUpdates }
        });
        if (!res.ok) throw ErrorFactory.wrap(new Error('Update category failed'), 'commands');
    }, 'updateCategory');
};

export const createCategory = async (categoryData: Omit<Category, 'id'>): Promise<AppResult<Category>> => {
    return withErrorHandling(async () => {
        const dbUpdates = mapToDb(categoryData as any);
        const res = await api.categories.$post({
          json: { categoryData: dbUpdates }
        });
        if (!res.ok) throw ErrorFactory.wrap(new Error('Create category failed'), 'commands');
        const { data } = await res.json();
        return data as Category;
    }, 'createCategory');
};

export const deleteCategory = async (categoryId: string): Promise<AppResult<void>> => {
    return withErrorHandling(async () => {
        const res = await api.categories[':id'].$delete({
          param: { id: categoryId }
        });
        if (!res.ok) throw ErrorFactory.wrap(new Error('Delete category failed'), 'commands');
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
