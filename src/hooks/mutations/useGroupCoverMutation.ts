import { useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { updatePhotosGroupInCloud, setPhotoAsGroupCoverInCloud } from '../../services/photoMutationService';
import { useFeedback, useInvalidatePhotos } from '../';
import { Photo } from '../../types/photo';
import { reportError } from '@/lib/errorReporter';

export const useGroupCoverMutation = () => {
  const queryClient = useQueryClient();
  const { showError } = useFeedback();
  const invalidatePhotos = useInvalidatePhotos();

  return useMutation({
    mutationFn: async ({ photoId, groupId }: { photoId: string, groupId?: string }) => {
      let resolvedGroupId = groupId;
      if (!resolvedGroupId) {
        const cachedPages = queryClient.getQueryData<InfiniteData<{ photos: Photo[] }>>(['photos', 'infinite']);
        if (cachedPages?.pages) {
          for (const page of cachedPages.pages) {
            const photo = page.photos.find((p) => p.id === photoId);
            if (photo && photo.group_id) {
              resolvedGroupId = photo.group_id;
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
      
      const previousInfinite = queryClient.getQueriesData<InfiniteData<{ photos: Photo[] }>>({ queryKey: ['photos', 'infinite'] });

      let resolvedGroupId = groupId;
      if (!resolvedGroupId) {
        for (const [, cacheValue] of previousInfinite) {
          if (cacheValue?.pages) {
            for (const page of cacheValue.pages) {
              const p = page.photos.find((x) => x.id === photoId);
              if (p && p.group_id) {
                resolvedGroupId = p.group_id;
                break;
              }
            }
          }
          if (resolvedGroupId) break;
        }
      }
      
      queryClient.setQueriesData({ queryKey: ['photos', 'group', resolvedGroupId] }, (old: Photo[] | undefined) => {
        if (!old) return old;
        return old.map(photo => ({
          ...photo,
          is_group_cover: photo.id === photoId
        }));
      });

      queryClient.setQueriesData({ queryKey: ['photos', 'infinite'] }, (old: any) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: (old as InfiniteData<{ photos: Photo[] }>).pages.map((page) => ({
            ...page,
            photos: page.photos.map((photo) => {
              if (photo.id === photoId) {
                return { ...photo, is_group_cover: true };
              }
              if (resolvedGroupId && photo.group_id === resolvedGroupId) {
                return { ...photo, is_group_cover: false };
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
    onError: (error: Error, _variables, context: any) => {
      if (context?.previousInfinite) {
        context.previousInfinite.forEach(([queryKey, value]: any) => {
          queryClient.setQueryData(queryKey, value);
        });
      }
      reportError(error, '设为封面失败');
    }
  });
};
