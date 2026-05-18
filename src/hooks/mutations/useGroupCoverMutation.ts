import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updatePhotosGroupInCloud } from '../../services/photoMutationService';
import { useErrorHandler } from '../../utils/errorHandler';
import { QUERY_KEYS } from '../queries/keys';

export const useGroupCoverMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: ({ photoId }: { photoId: string }) => updatePhotosGroupInCloud([photoId], { is_group_cover: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.photos });
    },
    onError: (error: any) => {
      handleError(error, '设为封面失败');
    }
  });
};
