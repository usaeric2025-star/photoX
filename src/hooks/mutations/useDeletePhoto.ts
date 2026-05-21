import { useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { Photo } from '@/types';
import { deletePhotoFromCloud } from '@/services/photoMutationService';
import { useFeedback, useInvalidatePhotos } from '@/hooks';
import { opsCache } from '@/utils/indexedDB';

interface InfinitePhotosData {
  photos: Photo[];
  nextCursor?: string;
}

export const useDeletePhotoMutation = () => {
  const queryClient = useQueryClient();
  const { handleError, showSuccess } = useFeedback();
  const invalidatePhotos = useInvalidatePhotos();
  
  return useMutation({
    mutationFn: async ({ userId, photos }: { userId: string; photos: Photo[] }) => {
      let dissolvedGroupIds: string[] = [];
      for (const photo of photos) {
        const { dissolvedGroupId } = await deletePhotoFromCloud(userId, photo);
        if (dissolvedGroupId) {
          dissolvedGroupIds.push(dissolvedGroupId);
        }
      }
      return { dissolvedGroupIds };
    },
    onMutate: async ({ photos }) => {
      const photoIds = photos.map(p => p.id);
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['photos'] });

      // Snapshot
      const previousInfinite = queryClient.getQueryData<InfiniteData<InfinitePhotosData>>(['photos', 'infinite']);
      const previousGroups = queryClient.getQueriesData<Photo[]>({ queryKey: ['photos', 'group'] });

      // Optimistically remove from cache
      queryClient.setQueriesData<InfiniteData<InfinitePhotosData>>({ queryKey: ['photos', 'infinite'] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            photos: page.photos.filter((photo: Photo) => !photoIds.includes(photo.id)),
          })),
        };
      });

      // Update group queries too
      queryClient.setQueriesData<Photo[]>({ queryKey: ['photos', 'group'] }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.filter((photo: Photo) => !photoIds.includes(photo.id));
      });

      return { previousInfinite, previousGroups };
    },
    onSuccess: (data) => {
      const { dissolvedGroupIds } = data;
      // Also optimistically clear groupIds for dissolved groups
      if (dissolvedGroupIds && dissolvedGroupIds.length > 0) {
        queryClient.setQueriesData<InfiniteData<InfinitePhotosData>>({ queryKey: ['photos', 'infinite'] }, (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              photos: page.photos.map(p => {
                if (p.group_id && dissolvedGroupIds.includes(p.group_id)) {
                   return { 
                     ...p, 
                     group_id: null, 
                     is_group_cover: false, 
                     group_order: undefined, 
                     is_pinned: false 
                   };
                }
                return p;
              })
            })),
          };
        });
      }
    },
    onError: (err: any, variables, context) => {
      const isNetworkError = !navigator.onLine || err.message?.includes('fetch') || err.message?.includes('Network');
      
      if (isNetworkError) {
        opsCache.addPendingOp({
          type: 'delete',
          photoId: variables.photos.map(p => p.id)
        });
        showSuccess('已删除（离线模式下，稍后自动同步）');
        return;
      }

      if (context?.previousInfinite) {
        queryClient.setQueryData(['photos', 'infinite'], context.previousInfinite);
      }
      if (context?.previousGroups) {
        context.previousGroups.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      invalidatePhotos();
      handleError(err, '删除照片失败');
    },
  });
};
