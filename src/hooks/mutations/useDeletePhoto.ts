import { useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { Photo, ApiResponse } from '../../types';
import { deletePhotoFromCloud } from '../../services/photoMutationService';
import { QUERY_KEYS } from '../queries/keys';
import { useErrorHandler } from '../../utils/errorHandler';

interface InfinitePhotosData {
  photos: Photo[];
  nextCursor?: string;
}

export const useDeletePhotoMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  
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
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.photos });

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
                const pGroupId = p.groupId || (p as any).group_id;
                if (pGroupId && dissolvedGroupIds.includes(pGroupId)) {
                   return { ...p, groupId: null, group_id: null, isGroupCover: false, is_group_cover: false, groupOrder: undefined, isPinned: false };
                }
                return p;
              })
            })),
          };
        });
      }
    },
    onError: (err, variables, context) => {
      if (context?.previousInfinite) {
        queryClient.setQueryData(['photos', 'infinite'], context.previousInfinite);
      }
      if (context?.previousGroups) {
        context.previousGroups.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.photos });
      handleError(err, '删除照片失败');
    },
  });
};
