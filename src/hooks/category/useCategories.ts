import { Category } from '#src/types/index.js';
import { useAppQuery, useAppMutation } from '#lib/query/index.js';
import { api } from '#lib/api.js';
import { queryKeys } from '#lib/query/keys.js';
import { STALE_TIMES } from '#lib/query/config.js';
import { useInvalidatePhotos } from '#src/hooks/photo/usePhotos.js';
import type { ApiResponse } from '#shared/apiContractSchema.js';
import { useTranslation } from '#src/hooks/index.js';

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
  const { t } = useTranslation();
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
      throw new Error(json.error || t('categoryCreateFailed'));
    },
    invalidateKeys,
    errorContext: 'category-create',
    successMessage: t('categoryCreated'),
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
      throw new Error(json.error || t('categoryUpdateFailed'));
    },
    invalidateKeys,
    errorContext: 'category-edit',
    successMessage: t('categoryUpdated'),
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
      throw new Error(json.error || t('categoryDeleteFailed'));
    },
    invalidateKeys,
    errorContext: 'category-delete',
    successMessage: t('categoryDeleted'),
    onSuccess: () => {
      invalidateCategories();
      invalidateList();
    }
  });

  return { create, edit, remove };
}
