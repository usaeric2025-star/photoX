import { Category } from '#src/types/index.js';
import { useAppQuery, useAppMutation } from '#lib/query/index.js';
import { api } from '#lib/api.js';
import { queryKeys } from '#lib/query/keys.js';
import { STALE_TIMES } from '#lib/query/config.js';
import { useInvalidatePhotos } from '#src/hooks/photo/usePhotos.js';
import type { ApiResponse } from '#shared/apiContractSchema.js';

export function useCategories(options?: { enabled?: boolean }) {
  const isEnabled = options?.enabled ?? true;
  const { data, isLoading, error, refetch } = useAppQuery<Category[]>(
    isEnabled ? queryKeys.categories.list() : null,
    async () => {
      const res = await api.categories.$get();
      const json = await res.json() as unknown as ApiResponse<Category[]>;
      if (json.success && json.data) return json.data;
      throw new Error(json.error || 'Failed to load categories');
    },
    {
      staleTime: STALE_TIMES.MEDIUM,
    }
  );

  return {
    categories: data || [],
    isLoading,
    error,
    mutate: refetch,
  };
}

export function useCategoryMutations() {
  const { invalidateCategories, invalidateList } = useInvalidatePhotos();
  const invalidateKeys = [queryKeys.categories.list()];
  
  const create = useAppMutation({
    mutationFn: async (variables: string | Partial<Category>) => {
      const name = typeof variables === 'string' ? variables : (variables.name || '');
      const res = await api.categories.$post({
        json: {
          categoryData: {
            nameZh: name,
            code: name.toLowerCase().replace(/\s+/g, '-'),
            sortOrder: 0
          }
        }
      });
      const json = await res.json() as unknown as ApiResponse<Category>;
      if (json.success && json.data) return json.data;
      throw new Error(json.error || '分類創建失敗');
    },
    invalidateKeys,
    errorContext: 'category-create',
    successMessage: '分類已創建',
    onSuccess: () => {
      invalidateCategories();
      invalidateList();
    }
  });

  const edit = useAppMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Category> }) => {
      const res = await api.categories[':id'].$put({
        param: { id: String(id) },
        json: { updates }
      });
      const json = await res.json() as ApiResponse<boolean>;
      if (json.success) return true;
      throw new Error(json.error || '分類更新失敗');
    },
    invalidateKeys,
    errorContext: 'category-edit',
    successMessage: '分類已更新',
    onSuccess: () => {
      invalidateCategories();
      invalidateList();
    }
  });

  const remove = useAppMutation({
    mutationFn: async (id: number) => {
      const res = await api.categories[':id'].$delete({
        param: { id: String(id) }
      });
      const json = await res.json() as ApiResponse<boolean>;
      if (json.success) return true;
      throw new Error(json.error || '分類刪除失敗');
    },
    invalidateKeys,
    errorContext: 'category-delete',
    successMessage: '分類已刪除',
    onSuccess: () => {
      invalidateCategories();
      invalidateList();
    }
  });

  return { create, edit, remove };
}
