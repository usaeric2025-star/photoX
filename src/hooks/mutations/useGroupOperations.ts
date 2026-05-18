import { useMutation, useQueryClient } from '@tanstack/react-query';
import { groupPhotos, ungroupPhotos } from '../../services/photoMutationService';
import { useErrorHandler } from '../../utils/errorHandler';
import { QUERY_KEYS } from '../queries/keys';

export const useGroupPhotosMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: (photoIds: string[]) => groupPhotos(photoIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.photos });
    },
    onError: (error: any) => {
      handleError(error, '群组创建失败');
    }
  });
};

export const useUngroupMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: (groupId: string) => ungroupPhotos(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.photos });
    },
    onError: (error: any) => {
      handleError(error, '取消群组失败');
    }
  });
};

export const useDeleteGroupFromCloudMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: (groupId: string) => ungroupPhotos(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.photos });
    },
    onError: (error: any) => {
      handleError(error, '删除群组失败');
    }
  });
};
