import { useCategoryDelete, useTagDelete, useManufacturerDelete } from '../useAdminMutations';

export function useAdminCategory({ update }: { update?: any }) {
  const { mutateAsync: deleteCategory } = useCategoryDelete();
  const { mutateAsync: deleteTag } = useTagDelete();
  const { mutateAsync: deleteManufacturer } = useManufacturerDelete();

  return {
    deleteCategory,
    deleteTag,
    deleteManufacturer
  };
}
