import { useMemo } from 'react';
import { 
  useAddTagMutation, useUpdateTagMutation, useDeleteTagMutation,
  useAddCategoryMutation, useUpdateCategoryMutation, useDeleteCategoryMutation,
  useAddManufacturerMutation, useUpdateManufacturerMutation, useDeleteManufacturerMutation
} from '../core/mutations/useAdminMutations';

export function useAdminCategory({ setAlertDialog }: { setAlertDialog: (d: any) => void }) {
  const addTag = useAddTagMutation();
  const updateTag = useUpdateTagMutation();
  const deleteTag = useDeleteTagMutation();
  
  const addCategory = useAddCategoryMutation();
  const updateCategory = useUpdateCategoryMutation();
  const deleteCategory = useDeleteCategoryMutation();

  const addManufacturer = useAddManufacturerMutation();
  const updateManufacturer = useUpdateManufacturerMutation();
  const deleteManufacturer = useDeleteManufacturerMutation();

  return useMemo(() => ({
    addTag: (name: string) => addTag.execute(name),
    updateTag: (id: string, updates: any) => updateTag.execute({ id, updates }),
    deleteTag: (id: string) => deleteTag.execute(id),
    
    addCategory: (name: string) => addCategory.execute(name),
    updateCategory: (id: string, updates: any) => updateCategory.execute({ id, updates }),
    deleteCategory: (id: string) => deleteCategory.execute(id),

    addManufacturer: (name: string) => addManufacturer.execute(name),
    updateManufacturer: (id: string, updates: any) => updateManufacturer.execute({ id, updates }),
    deleteManufacturer: (id: string) => deleteManufacturer.execute(id),
  }), [addTag, updateTag, deleteTag, addCategory, updateCategory, deleteCategory, addManufacturer, updateManufacturer, deleteManufacturer]);
}
