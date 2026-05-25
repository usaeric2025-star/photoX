import { createMutationHook } from '@/hooks/_factory/createMutationHook';
import { updatePhotosBatch } from '@/services/photoService';
import { Photo } from '@/types';
import { InfiniteData } from '@tanstack/react-query';

interface InfinitePhotosData {
  photos: Photo[];
  nextCursor?: string;
}

export const useBatchEditMutation = (userId: string) =>  createMutationHook({
  entity: 'Photo',
  action: 'BatchUpdate',
  mutationFn: ({ ids, updates }: { ids: string[]; updates: Partial<Photo> }) => 
    updatePhotosBatch(userId, ids, updates),
  invalidateKeys: [['photos', 'infinite'], ['photos', 'group'], ['groups']],
  onSuccessMessage: '批量编辑成功',
  // Optimistic update logic would move here if needed
});
