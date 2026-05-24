import { useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { Photo } from '@/types';
import { updatePhoto as updatePhotoFn } from '@/services/photoService';
import { useFeedback, useInvalidatePhotos } from '@/hooks';
import { opsCache } from '@/utils/indexedDB';

interface InfinitePhotosData {
  photos: Photo[];
  nextCursor?: string;
}

export const useUpdatePhotoMutation = () => {
  const queryClient = useQueryClient();
  const { handleError, showSuccess } = useFeedback();
  const invalidatePhotos = useInvalidatePhotos();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Photo> }) => {
      if (!id || id.startsWith('temp-')) {
        throw new Error('无效的照片ID，请刷新页面');
      }
      return updatePhotoFn(id, updates);
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['photos'] });

      // Snapshot the previous values
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
              photo.id === id ? { ...photo, ...updates } : photo
            ),
          })),
        };
      });

      // Also update any specific group queries
      queryClient.setQueriesData<Photo[]>({ queryKey: ['photos', 'group'] }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((photo) => 
          photo.id === id ? { ...photo, ...updates } : photo
        );
      });

      // Optimistically update group infinite photo queries
      queryClient.setQueriesData<InfiniteData<InfinitePhotosData>>({ queryKey: ['photos', 'group', 'infinite'] }, (old) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            photos: page.photos.map((photo: Photo) =>
              photo.id === id ? { ...photo, ...updates } : photo
            ),
          })),
        };
      });

      return { previousInfinite, previousGroups };
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['photos', 'group'] });
    },
    onError: (err: unknown, variables, context: { previousInfinite?: InfiniteData<InfinitePhotosData>; previousGroups?: [any, Photo[]][] } = {}) => {
      // Check if it's a network error
      const errorMsg = err instanceof Error ? err.message : '';
      const isNetworkError = !navigator.onLine || errorMsg.includes('fetch') || errorMsg.includes('Network');
      
      if (isNetworkError) {
        opsCache.addPendingOp({
          type: 'update',
          photoId: variables.id,
          payload: variables.updates
        });
        showSuccess('已保存（离线中，稍后自动同步）');
        return; // Don't rollback if we queued it
      }

      // If mutation fails due to other reasons, use the context returned from onMutate to roll back
      if (context?.previousInfinite) {
        queryClient.setQueryData(['photos', 'infinite'], context.previousInfinite);
      }
      if (context?.previousGroups) {
        context.previousGroups.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      invalidatePhotos();
      handleError(err, '更新照片失败');
    },
  });
};
