import { Category } from '#src/types/index.js';
import { useAppQuery, useAppMutation } from '#lib/query/index.js';
import { api } from '#lib/api.js';
import { queryKeys } from '#lib/query/keys.js';
import { STALE_TIMES } from '#lib/query/config.js';
import { useInvalidatePhotos } from '#src/hooks/photo/usePhotos.js';
import type { ApiResponse } from '#shared/apiContractSchema.js';
import { useTranslation } from '#src/hooks/index.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';

export function useCategories(options?: { enabled?: boolean }) {
  const isEnabled = options?.enabled ?? true;
  const { data, isLoading, error, refetch } = useAppQuery<Category[]>(
    isEnabled ? queryKeys.categories.list() : null,
    async () => ErrorFactory.unwrap<Category[]>(api.categories.$get(), 'Failed to load categories'),
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
      return ErrorFactory.unwrap<Category>(
        api.categories.$post({
          json: {
            categoryData: {
              name: name,
              description: { zh: name, en: name, ms: name },
              code: name.toLowerCase().replace(/\s+/g, '-'),
              sortOrder: 0
            }
          }
        }),
        t('categoryCreateFailed')
      );
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
      return ErrorFactory.unwrap<boolean>(
        api.categories[':id'].$put({
          param: { id: String(id) },
          json: { updates }
        }),
        t('categoryUpdateFailed')
      );
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
      return ErrorFactory.unwrap<boolean>(
        api.categories[':id'].$delete({
          param: { id: String(id) }
        }),
        t('categoryDeleteFailed')
      );
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
