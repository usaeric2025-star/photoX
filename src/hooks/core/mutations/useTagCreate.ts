import { createMutationHook } from './factory';
import { Tag } from '@/types';
import { addTagToDB } from '@/services/tag/commands';
import { photoKeys } from '@/lib/queryKeys';

export const useTagCreate = createMutationHook({
  entity: 'Tag', 
  action: 'Add',
  mutationFn: addTagToDB,
  invalidateKeys: [photoKeys.tags()],
  onSuccessMessage: '标签添加成功',
});
