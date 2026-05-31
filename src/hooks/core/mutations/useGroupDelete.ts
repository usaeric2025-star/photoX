import { createMutationHook } from './factory';
import { ungroupPhotos } from '@/services/photo/photoMaintenanceService';

export const useGroupDelete = createMutationHook({
  entity: 'Group',
  action: 'Delete',
  mutationFn: (groupId: string) => ungroupPhotos(groupId),
  invalidateKeys: [['groups'], ['photos']],
  onSuccessMessage: '群组已解散',
});
