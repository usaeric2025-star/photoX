import { useCategoryCreate, useCategoryEdit, useCategoryDelete } from '@/hooks/category';
import { useTagCreate, useTagEdit, useTagDelete } from '@/hooks/tag';
import { useManufacturerCreate, useManufacturerEdit, useManufacturerDelete } from '@/hooks/manufacturer';

export function useAdminCategory() {
  const { mutateAsync: deleteCategory } = useCategoryDelete();
  const { mutateAsync: deleteTag } = useTagDelete();
  const { mutateAsync: deleteManufacturer } = useManufacturerDelete();
  
  const { mutateAsync: addCategory } = useCategoryCreate();
  const { mutateAsync: updateCategory } = useCategoryEdit();
  
  const { mutateAsync: addTag } = useTagCreate();
  const { mutateAsync: updateTag } = useTagEdit();
  
  const { mutateAsync: addManufacturer } = useManufacturerCreate();
  const { mutateAsync: updateManufacturer } = useManufacturerEdit();

  return {
    deleteCategory,
    deleteTag,
    deleteManufacturer,
    addCategory,
    updateCategory,
    addTag,
    updateTag,
    addManufacturer,
    updateManufacturer
  };
}
