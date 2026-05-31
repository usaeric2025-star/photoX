import { createMutationHook } from './factory';
import { groupPhotos } from '@/services/photo/commands';

export const useGroupCreate = createMutationHook({
  entity: 'Group',
  action: 'Create',
  mutationFn: async ({ photoIds, targetGroupId }: { photoIds: string[], targetGroupId?: string }) => {
    const finalGroupId = targetGroupId || crypto.randomUUID();
    await groupPhotos(photoIds, finalGroupId);
    return { photoIds, newGroupId: finalGroupId };
  },
  invalidateKeys: [['photos'], ['groups']],
  onSuccessMessage: '合组成功',
});
