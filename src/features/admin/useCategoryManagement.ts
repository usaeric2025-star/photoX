import { useMemo } from 'react';
import { 
  useTagCreate, useTagEdit, useTagDelete,
  useCategoryCreate, useCategoryEdit, useCategoryDelete,
  useManufacturerCreate, useManufacturerEdit, useManufacturerDelete
} from '@/hooks';

export function useAdminCategory({ setAlertDialog }: { setAlertDialog: (d: any) => void }) {
  const tagCreate = useTagCreate();
  const tagEdit = useTagEdit();
  const tagDelete = useTagDelete();
  
  const categoryCreate = useCategoryCreate();
  const categoryEdit = useCategoryEdit();
  const categoryDelete = useCategoryDelete();

  const manufacturerCreate = useManufacturerCreate();
  const manufacturerEdit = useManufacturerEdit();
  const manufacturerDelete = useManufacturerDelete();

  return useMemo(() => ({
    addTag: (name: string) => tagCreate.execute(name),
    updateTag: (id: string, updates: any) => tagEdit.execute({ id, updates }),
    deleteTag: (id: string) => tagDelete.execute(id),
    
    addCategory: (name: string) => categoryCreate.execute(name),
    updateCategory: (id: string, updates: any) => categoryEdit.execute({ id, updates }),
    deleteCategory: (id: string) => categoryDelete.execute(id),

    addManufacturer: (name: string) => manufacturerCreate.execute(name),
    updateManufacturer: (id: string, updates: any) => manufacturerEdit.execute({ id, updates }),
    deleteManufacturer: (id: string) => manufacturerDelete.execute(id),
  }), [tagCreate, tagEdit, tagDelete, categoryCreate, categoryEdit, categoryDelete, manufacturerCreate, manufacturerEdit, manufacturerDelete]);
}
