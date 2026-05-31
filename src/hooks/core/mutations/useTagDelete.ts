import { createMutationHook } from './factory';
import { deleteTagFromDB } from '@/services/tag/commands';
import { photoKeys } from '@/lib/queryKeys';

export const useTagDelete = createMutationHook({
  entity: 'Tag',
  action: 'Delete',
  mutationFn: deleteTagFromDB,
  invalidateKeys: [photoKeys.tags()],
  onSuccessMessage: '标签删除成功',
});
