import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updatePhotosGroupInCloud, setPhotoAsGroupCoverInCloud } from '../../services/photoMutationService';
import { useFeedback, useInvalidatePhotos } from '../';

export const useGroupCoverMutation = () => {
  const queryClient = useQueryClient();
  const { showError } = useFeedback();
  const invalidatePhotos = useInvalidatePhotos();

  return useMutation({
    mutationFn: async ({ photoId, groupId }: { photoId: string, groupId?: string }) => {
      let resolvedGroupId = groupId;
      if (!resolvedGroupId) {
        const cachedPages = queryClient.getQueryData<any>(['photos', 'infinite']);
        if (cachedPages?.pages) {
          for (const page of cachedPages.pages) {
            const photo = page.photos.find((p: any) => p.id === photoId);
            if (photo && photo.groupId) {
              resolvedGroupId = photo.groupId;
              break;
            }
          }
        }
      }

      if (resolvedGroupId) {
        await setPhotoAsGroupCoverInCloud(photoId, resolvedGroupId);
      } else {
        await updatePhotosGroupInCloud([photoId], { is_group_cover: true });
      }
    },
    onMutate: async ({ photoId, groupId }) => {
      await queryClient.cancelQueries({ queryKey: ['photos'] });
      
      const previousInfinite = queryClient.getQueriesData({ queryKey: ['photos', 'infinite'] });

      let resolvedGroupId = groupId;
      if (!resolvedGroupId) {
        for (const [, cacheValue] of previousInfinite) {
          const typedValue = cacheValue as any;
          if (typedValue?.pages) {
            for (const page of typedValue.pages) {
              const p = page.photos.find((x: any) => x.id === photoId);
              if (p && p.groupId) {
                resolvedGroupId = p.groupId;
                break;
              }
            }
          }
          if (resolvedGroupId) break;
        }
      }
      
      queryClient.setQueriesData({ queryKey: ['photos', 'infinite'] }, (old: any) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            photos: page.photos.map((photo: any) => {
              if (photo.id === photoId) {
                return { ...photo, isGroupCover: true, is_group_cover: true };
              }
              if (resolvedGroupId && photo.groupId === resolvedGroupId) {
                return { ...photo, isGroupCover: false, is_group_cover: false };
              }
              return photo;
            })
          }))
        };
      });
      return { previousInfinite };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      invalidatePhotos();
    },
    onError: (error: any, variables, context: any) => {
      if (context?.previousInfinite) {
        context.previousInfinite.forEach(([queryKey, value]: any) => {
          queryClient.setQueryData(queryKey, value);
        });
      }
      showError(error, '设为封面失败');
    }
  });
};
