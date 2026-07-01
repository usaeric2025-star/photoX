import { useCategoryCreate, useCategoryEdit, useCategoryDelete } from '#src/hooks/category';
import { useTagCreate, useTagEdit, useTagDelete } from '#src/hooks/tag';
import { useManufacturerCreate, useManufacturerEdit, useManufacturerDelete } from '#src/hooks/manufacturer';

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
