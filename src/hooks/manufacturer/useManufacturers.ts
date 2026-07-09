import { Manufacturer } from '#src/types/index.js';
import { useAppQuery, useAppMutation } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';
import { STALE_TIMES } from '#lib/query/config.js';
import { api } from '#lib/api.js';
import type { ApiResponse } from '#shared/apiContractSchema.js';
import { useTranslation } from '#src/hooks/index.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';

export function useManufacturers() {
  const { data, isLoading, error } = useAppQuery<Manufacturer[]>(
    queryKeys.manufacturers.list(),
    async () => ErrorFactory.unwrap<Manufacturer[]>(api.manufacturers.$get(), 'Failed to load manufacturers'),
    {
      staleTime: STALE_TIMES.LONG,
    }
  );

  return {
    manufacturers: data || [],
    isLoading,
    error,
  };
}

export function useManufacturerMutations() {
  const { t } = useTranslation();
  const invalidateKeys = [
    queryKeys.manufacturers.all,
    queryKeys.photos.all
  ];

  const create = useAppMutation({
    mutationFn: async (variables: string | Partial<Manufacturer>) => {
      const name = typeof variables === 'string' ? variables : (variables.name || '');
      return ErrorFactory.unwrap<Manufacturer>(
        api.manufacturers.$post({
          json: {
            manufacturerData: { name }
          }
        }),
        t('mfrCreateFailed')
      );
    },
    invalidateKeys,
    errorContext: 'manufacturer-create',
    successMessage: t('mfrCreated')
  });

  const edit = useAppMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Manufacturer> }) => {
      return ErrorFactory.unwrap<boolean>(
        api.manufacturers[':id'].$put({
          param: { id },
          json: { updates }
        }),
        t('mfrUpdateFailed')
      );
    },
    invalidateKeys,
    errorContext: 'manufacturer-edit',
    successMessage: t('mfrUpdated')
  });

  const remove = useAppMutation({
    mutationFn: async (id: string) => {
      return ErrorFactory.unwrap<boolean>(
        api.manufacturers[':id'].$delete({
          param: { id }
        }),
        t('mfrDeleteFailed')
      );
    },
    invalidateKeys,
    errorContext: 'manufacturer-delete',
    successMessage: t('mfrDeleted')
  });

  return { create, edit, remove };
}
