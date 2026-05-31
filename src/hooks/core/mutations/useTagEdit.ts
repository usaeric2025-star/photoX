import { createMutationHook } from './factory';
import { Tag } from '@/types';
import { updateTagInDB } from '@/services/tag/commands';
import { photoKeys } from '@/lib/queryKeys';

export const useTagEdit = createMutationHook({
  entity: 'Tag',
  action: 'Update',
  mutationFn: ({ id, updates }: { id: string; updates: Partial<Tag> }) => updateTagInDB(id, updates),
  invalidateKeys: [photoKeys.tags()],
  onSuccessMessage: '标签更新成功',
});
