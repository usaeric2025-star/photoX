import { useMemo } from 'react';
import { 
  useTagCreate, useTagEdit, useTagDelete,
  useCategoryCreate, useCategoryEdit, useCategoryDelete,
  useManufacturerCreate, useManufacturerEdit, useManufacturerDelete
} from '@/hooks';

export function useAdminCategory({ update }: { update: (d: any) => void }) {
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
    deleteTag: (id: string) => {
      update({
        alertDialog: {
          title: '确定要删除此标签吗？',
          message: '此操作将从所有已关联的产品中移除此标签。',
          type: 'danger',
          onConfirm: () => tagDelete.execute(id),
          confirmLabel: '删除',
        }
      });
    },
    
    addCategory: (name: string) => categoryCreate.execute(name),
    updateCategory: (id: string, updates: any) => categoryEdit.execute({ id, updates }),
    deleteCategory: (id: string) => {
      update({
        alertDialog: {
          title: '确定要删除此分类吗？',
          message: '这将导致该分类下的产品失去分类关联。',
          type: 'danger',
          onConfirm: () => categoryDelete.execute(id),
          confirmLabel: '删除',
        }
      });
    },

    addManufacturer: (name: string) => manufacturerCreate.execute(name),
    updateManufacturer: (id: string, updates: any) => manufacturerEdit.execute({ id, updates }),
    deleteManufacturer: (id: string) => {
      update({
        alertDialog: {
          title: '确定要删除此生产商吗？',
          message: '确定要删除此生产商吗？',
          type: 'danger',
          onConfirm: () => manufacturerDelete.execute(id),
          confirmLabel: '删除',
        }
      });
    },
  }), [tagCreate, tagEdit, tagDelete, categoryCreate, categoryEdit, categoryDelete, manufacturerCreate, manufacturerEdit, manufacturerDelete]);
}
