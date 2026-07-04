import { Tag } from '#src/types/index.js';
import { addTagToDB, updateTagInDB, deleteTagFromDB } from '#src/services/tag/commands.js';
import { useAppMutation } from '#lib/query/index.js';
import { useInvalidatePhotos } from '#src/hooks/photo/useInvalidatePhotos.js';

// 1. 创建标签
export const useTagCreate = () => {
  const { invalidateTags, invalidateList } = useInvalidatePhotos();
  return useAppMutation({
    mutationFn: async (variables: string | Partial<Tag>) => {
      const name = typeof variables === 'string' ? variables : (variables.name || '');
      const res = await addTagToDB(name);
      if (!res || (typeof res === 'object' && 'ok' in res && !res.ok)) {
        throw new Error('标签创建失败');
      }
      return res as Tag;
    },
    onSuccess: () => {
      invalidateTags();
      invalidateList();
    }
  });
};

// 2. 编辑标签
export const useTagEdit = () => {
  const { invalidateTags, invalidateList } = useInvalidatePhotos();
  return useAppMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Tag> }) => {
      const res = await updateTagInDB(id, updates);
      if (!res) throw new Error('标签更新失败');
      return true;
    },
    onSuccess: () => {
      invalidateTags();
      invalidateList();
    }
  });
};

// 3. 删除标签
export const useTagDelete = () => {
  const { invalidateTags, invalidateList } = useInvalidatePhotos();
  return useAppMutation({
    mutationFn: async (id: number) => {
      const res = await deleteTagFromDB(id);
      if (!res) throw new Error('标签删除失败');
      return true;
    },
    onSuccess: () => {
      invalidateTags();
      invalidateList();
    }
  });
};
