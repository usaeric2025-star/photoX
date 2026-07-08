import { Manufacturer } from '#src/types/index.js';
import { useAppQuery, useAppMutation } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';
import { STALE_TIMES } from '#lib/query/config.js';
import { api } from '#lib/api.js';
import type { ApiResponse } from '#shared/apiContractSchema.js';
import { useTranslation } from '#src/hooks/index.js';

export function useManufacturers() {
  const { data, isLoading, error } = useAppQuery<Manufacturer[]>(
    queryKeys.manufacturers.list(),
    async () => {
      const res = await api.manufacturers.$get();
      const json = await res.json() as unknown as ApiResponse<Manufacturer[]>;
      if (!json.success || !json.data) throw new Error(json.error || 'Failed to load manufacturers');
      return json.data;
    },
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
      const res = await api.manufacturers.$post({
        json: {
          manufacturerData: { name }
        }
      });
      const json = await res.json() as unknown as ApiResponse<Manufacturer>;
      if (!json.success || !json.data) throw new Error(json.error || t('mfrCreateFailed'));
      return json.data;
    },
    invalidateKeys,
    errorContext: 'manufacturer-create',
    successMessage: t('mfrCreated')
  });

  const edit = useAppMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Manufacturer> }) => {
      const res = await api.manufacturers[':id'].$put({
        param: { id },
        json: { updates }
      });
      const json = await res.json() as ApiResponse<boolean>;
      if (!json.success) throw new Error(json.error || t('mfrUpdateFailed'));
      return true;
    },
    invalidateKeys,
    errorContext: 'manufacturer-edit',
    successMessage: t('mfrUpdated')
  });

  const remove = useAppMutation({
    mutationFn: async (id: string) => {
      const res = await api.manufacturers[':id'].$delete({
        param: { id }
      });
      const json = await res.json() as ApiResponse<boolean>;
      if (!json.success) throw new Error(json.error || t('mfrDeleteFailed'));
      return true;
    },
    invalidateKeys,
    errorContext: 'manufacturer-delete',
    successMessage: t('mfrDeleted')
  });

  return { create, edit, remove };
}
