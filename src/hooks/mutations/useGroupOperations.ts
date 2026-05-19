import { useMutation, useQueryClient } from '@tanstack/react-query';
import { groupPhotos, ungroupPhotos, removePhotosFromGroup } from '../../services/photoMutationService';
import { useErrorHandler } from '../../utils/errorHandler';
import { QUERY_KEYS } from '../queries/keys';

export const useGroupPhotosMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: (photoIds: string[]) => groupPhotos(photoIds),
    onSuccess: () => {
      (() => { const currentFilters = 'infinite' as any; queryClient.invalidateQueries({ queryKey: ['photos', currentFilters] }); queryClient.invalidateQueries({ queryKey: ['photos', 'group'] }); })();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups });
    },
    onError: (error: any) => {
      handleError(error, '群组创建失败');
    }
  });
};

export const useRemoveFromGroupMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: ({ photoIds, groupId }: { photoIds: string[]; groupId: string }) => 
      removePhotosFromGroup(photoIds, groupId),
    onSuccess: () => {
      // Smallest invalidation scope
      (() => { const currentFilters = 'infinite' as any; queryClient.invalidateQueries({ queryKey: ['photos', currentFilters] }); queryClient.invalidateQueries({ queryKey: ['photos', 'group'] }); })();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups });
    },
    onError: (error: any) => {
      handleError(error, '移出群组失败');
    }
  });
};

export const useUngroupMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: (groupId: string) => ungroupPhotos(groupId),
    onSuccess: () => {
      (() => { const currentFilters = 'infinite' as any; queryClient.invalidateQueries({ queryKey: ['photos', currentFilters] }); queryClient.invalidateQueries({ queryKey: ['photos', 'group'] }); })();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups });
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
      (() => { const currentFilters = 'infinite' as any; queryClient.invalidateQueries({ queryKey: ['photos', currentFilters] }); queryClient.invalidateQueries({ queryKey: ['photos', 'group'] }); })();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups });
    },
    onError: (error: any) => {
      handleError(error, '删除群组失败');
    }
  });
};
