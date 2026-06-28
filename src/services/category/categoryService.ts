import useSWR, { useSWRConfig } from 'swr';
import { useState } from 'react';
import { loadCategoriesFromCloud } from './queries';
import { createCategory, updateCategory, deleteCategory } from './commands';
import { queryKeys } from '@/lib/query/keys';
import { errorService } from '@/services/error';
import { Category } from '@/types';

export function useCategories() {
  const { data, error, isLoading, mutate } = useSWR<Category[], any>(
    queryKeys.categories.all,
    loadCategoriesFromCloud,
    {}
  );

  return {
    categories: data || [],
    isLoading,
    error,
    mutate,
  };
}

export function useCategoryMutations() {
  const { mutate } = useSWRConfig();
  const [isMutating, setIsMutating] = useState(false);

  const create = async (categoryData: Omit<Category, 'id'>) => {
    setIsMutating(true);
    try {
      await createCategory(categoryData);
      mutate(queryKeys.categories.all);
    } catch (e) {
      errorService.handle(e, { context: 'category.create' });
      throw e;
    } finally {
      setIsMutating(false);
    }
  };

  const update = async (id: number, updates: Partial<Category>) => {
    setIsMutating(true);
    try {
      await updateCategory(id, updates);
      mutate(queryKeys.categories.all);
    } catch (e) {
      errorService.handle(e, { context: 'category.update' });
      throw e;
    } finally {
      setIsMutating(false);
    }
  };

  const remove = async (id: number) => {
    setIsMutating(true);
    try {
      await deleteCategory(id);
      mutate(queryKeys.categories.all);
    } catch (e) {
      errorService.handle(e, { context: 'category.delete' });
      throw e;
    } finally {
      setIsMutating(false);
    }
  };

  return {
    create,
    update,
    remove,
    isMutating,
  };
}
