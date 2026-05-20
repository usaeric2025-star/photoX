import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updatePhotosGroupInCloud } from '../../services/photoMutationService';
import { useFeedback, useInvalidatePhotos } from '../';

export const useGroupCoverMutation = () => {
  const queryClient = useQueryClient();
  const { showError } = useFeedback();
  const invalidatePhotos = useInvalidatePhotos();

  return useMutation({
    mutationFn: ({ photoId }: { photoId: string }) => updatePhotosGroupInCloud([photoId], { is_group_cover: true }),
    onMutate: async ({ photoId }) => {
      await queryClient.cancelQueries({ queryKey: ['photos'] });
      
      const previousInfinite = queryClient.getQueriesData({ queryKey: ['photos', 'infinite'] });
      
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
              // Ideally unset others in the same group, but setting false recursively is complex locally.
              // Just setting this one to true will suffice for display.
              return photo;
            })
          }))
        };
      });
      return { previousInfinite };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
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
