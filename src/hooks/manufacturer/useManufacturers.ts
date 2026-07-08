import { Manufacturer } from '#src/types/index.js';
import { useAppQuery, useAppMutation } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';
import { STALE_TIMES } from '#lib/query/config.js';
import { api } from '#lib/api.js';
import type { ApiResponse } from '#shared/apiContractSchema.js';

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
      if (!json.success || !json.data) throw new Error(json.error || '廠商創建失敗');
      return json.data;
    },
    invalidateKeys,
    errorContext: 'manufacturer-create',
    successMessage: '廠商已創建'
  });

  const edit = useAppMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Manufacturer> }) => {
      const res = await api.manufacturers[':id'].$put({
        param: { id },
        json: { updates }
      });
      const json = await res.json() as ApiResponse<boolean>;
      if (!json.success) throw new Error(json.error || '廠商更新失敗');
      return true;
    },
    invalidateKeys,
    errorContext: 'manufacturer-edit',
    successMessage: '廠商已更新'
  });

  const remove = useAppMutation({
    mutationFn: async (id: string) => {
      const res = await api.manufacturers[':id'].$delete({
        param: { id }
      });
      const json = await res.json() as ApiResponse<boolean>;
      if (!json.success) throw new Error(json.error || '廠商刪除失敗');
      return true;
    },
    invalidateKeys,
    errorContext: 'manufacturer-delete',
    successMessage: '廠商已刪除'
  });

  return { create, edit, remove };
}
