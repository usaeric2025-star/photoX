import { useAppMutation } from '#lib/query/index.js';
import { api } from '#lib/api.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { showToast } from '#lib/ui/toast.js';
import { useTranslation } from '../core/index.js';
import { useInvalidatePhotos } from '#src/hooks/photo/useInvalidatePhotos.js';

type Domain = 'categories' | 'tags' | 'manufacturers';

/**
 * useMetadataMutations
 * 
 * 處理元數據的增刪改。
 */
function useMetadataMutations() {
  const { t } = useTranslation();
  const { invalidateCategories, invalidateTags, invalidateManufacturers } = useInvalidatePhotos();

  const invalidate = (domain: Domain) => {
    if (domain === 'categories') invalidateCategories();
    if (domain === 'tags') invalidateTags();
    if (domain === 'manufacturers') invalidateManufacturers();
  };

  const createMutation = useAppMutation({
    mutationFn: async ({ domain, data }: { domain: Domain; data: any }) => {
      return ErrorFactory.unwrap(api[domain].$post({ json: data }), t('createFailed'));
    },
    onSuccess: (_, variables) => {
      showToast.success(t('createSuccess'));
      invalidate(variables.domain);
    }
  });

  const updateMutation = useAppMutation({
    mutationFn: async ({ domain, id, updates }: { domain: Domain; id: string | number; updates: any }) => {
      return ErrorFactory.unwrap((api[domain] as any)[':id'].$put({ param: { id }, json: { updates } }), t('updateFailed'));
    },
    onSuccess: (_, variables) => {
      showToast.success(t('updateSuccess'));
      invalidate(variables.domain);
    }
  });

  const deleteMutation = useAppMutation({
    mutationFn: async ({ domain, id }: { domain: Domain; id: string | number }) => {
      return ErrorFactory.unwrap((api[domain] as any)[':id'].$delete({ param: { id } }), t('deleteFailed'));
    },
    onSuccess: (_, variables) => {
      showToast.success(t('deleteSuccess'));
      invalidate(variables.domain);
    }
  });

  return {
    create: createMutation,
    update: updateMutation,
    remove: deleteMutation,
    isPending: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
}

// --- Specific Domain Hooks ---

export function useCategoryMutations() {
  const { create, update, remove } = useMetadataMutations();
  return {
    create: { mutateAsync: (data: any) => create.mutateAsync({ domain: 'categories', data }) },
    edit: { mutateAsync: (args: { id: string | number; updates: any }) => update.mutateAsync({ domain: 'categories', ...args }) },
    remove: { mutateAsync: (id: string | number) => remove.mutateAsync({ domain: 'categories', id }) },
    isPending: create.isPending || update.isPending || remove.isPending
  };
}

export function useTagMutations() {
  const { create, update, remove } = useMetadataMutations();
  return {
    create: { mutateAsync: (data: any) => create.mutateAsync({ domain: 'tags', data }) },
    edit: { mutateAsync: (args: { id: string | number; updates: any }) => update.mutateAsync({ domain: 'tags', ...args }) },
    remove: { mutateAsync: (id: string | number) => remove.mutateAsync({ domain: 'tags', id }) },
    isPending: create.isPending || update.isPending || remove.isPending
  };
}

export function useManufacturerMutations() {
  const { create, update, remove } = useMetadataMutations();
  return {
    create: { mutateAsync: (data: any) => create.mutateAsync({ domain: 'manufacturers', data }) },
    edit: { mutateAsync: (args: { id: string | number; updates: any }) => update.mutateAsync({ domain: 'manufacturers', ...args }) },
    remove: { mutateAsync: (id: string | number) => remove.mutateAsync({ domain: 'manufacturers', id }) },
    isPending: create.isPending || update.isPending || remove.isPending
  };
}
