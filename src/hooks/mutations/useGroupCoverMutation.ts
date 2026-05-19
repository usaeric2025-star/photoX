import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updatePhotosGroupInCloud } from '../../services/photoMutationService';
import { useFeedback, useInvalidatePhotos } from '../';

export const useGroupCoverMutation = () => {
  const queryClient = useQueryClient();
  const { showError } = useFeedback();
  const invalidatePhotos = useInvalidatePhotos();

  return useMutation({
    mutationFn: ({ photoId }: { photoId: string }) => updatePhotosGroupInCloud([photoId], { is_group_cover: true }),
    onSuccess: () => {
      invalidatePhotos();
    },
    onError: (error: any) => {
      showError(error, '设为封面失败');
    }
  });
};
