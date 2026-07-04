import { Category } from '#src/types/index.js';
import { createCategory, updateCategory, deleteCategory } from '#src/services/category/commands.js';
import { useAppMutation } from '#lib/query/index.js';
import { useInvalidatePhotos } from '#src/hooks/photo/useInvalidatePhotos.js';

export const useCategoryCreate = () => {
  const { invalidateCategories, invalidateList } = useInvalidatePhotos();
  return useAppMutation({
    mutationFn: async (variables: string | Partial<Category>) => {
      const name = typeof variables === 'string' ? variables : (variables.name || '');
      const res = await createCategory({ name });
      if (!res) throw new Error('分类创建失败');
      return res;
    },
    onSuccess: () => {
      invalidateCategories();
      invalidateList();
    }
  });
};

export const useCategoryEdit = () => {
  const { invalidateCategories, invalidateList } = useInvalidatePhotos();
  return useAppMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Category> }) => {
      await updateCategory(id, updates);
      return true;
    },
    onSuccess: () => {
      invalidateCategories();
      invalidateList();
    }
  });
};

export const useCategoryDelete = () => {
  const { invalidateCategories, invalidateList } = useInvalidatePhotos();
  return useAppMutation({
    mutationFn: async (id: number) => {
      await deleteCategory(id);
      return true;
    },
    onSuccess: () => {
      invalidateCategories();
      invalidateList();
    }
  });
};
