import { 
  useCategoryDelete, useTagDelete, useManufacturerDelete,
  useCategoryCreate, useCategoryEdit,
  useTagCreate, useTagEdit,
  useManufacturerCreate, useManufacturerEdit
} from '.';

export function useAdminCategory({ update }: { update?: any }) {
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
