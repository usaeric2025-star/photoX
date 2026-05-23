import { useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { updatePhotosBatch } from '@/services/photoService';
import { useFeedback, useInvalidatePhotos } from '@/hooks';
import { Photo } from '@/types';

interface InfinitePhotosData {
  photos: Photo[];
  nextCursor?: string;
}

export const useBatchEditMutation = (userId: string) => {
  const queryClient = useQueryClient();
  const { showError } = useFeedback();
  const invalidatePhotos = useInvalidatePhotos();

  return useMutation({
    mutationFn: ({ ids, updates }: { ids: string[]; updates: Partial<Photo> }) => 
      updatePhotosBatch(userId, ids, updates),
    onMutate: async ({ ids, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['photos'] });

      // Snapshot
      const previousInfinite = queryClient.getQueryData<InfiniteData<InfinitePhotosData>>(['photos', 'infinite']);
      const previousGroups = queryClient.getQueriesData<Photo[]>({ queryKey: ['photos', 'group'] });

      // Optimistically update all infinite photo queries
      queryClient.setQueriesData<InfiniteData<InfinitePhotosData>>({ queryKey: ['photos', 'infinite'] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            photos: page.photos.map((photo) =>
              ids.includes(photo.id) ? { ...photo, ...updates } : photo
            ),
          })),
        };
      });

      // Update group queries too
      queryClient.setQueriesData<Photo[]>({ queryKey: ['photos', 'group'] }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((photo) => 
          ids.includes(photo.id) ? { ...photo, ...updates } : photo
        );
      });

      return { previousInfinite, previousGroups };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (err: unknown, variables, context: { previousInfinite?: InfiniteData<InfinitePhotosData>; previousGroups?: [any, Photo[]][] } = {}) => {
      if (context?.previousInfinite) {
        queryClient.setQueryData(['photos', 'infinite'], context.previousInfinite);
      }
      if (context?.previousGroups) {
        context.previousGroups.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      invalidatePhotos();
      showError(err, '批量编辑失败');
    },
  });
};
