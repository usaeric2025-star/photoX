import { useMutation, useQueryClient } from '@tanstack/react-query';
import { groupPhotos, ungroupPhotos, removePhotosFromGroup } from '../../services/photoMutationService';
import { useFeedback, useInvalidatePhotos } from '../';

export const useGroupPhotosMutation = () => {
  const queryClient = useQueryClient();
  const { showError } = useFeedback();
  const invalidatePhotos = useInvalidatePhotos();

  return useMutation({
    mutationFn: (photoIds: string[]) => groupPhotos(photoIds),
    onSuccess: () => {
      invalidatePhotos();
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (error: any) => {
      showError(error, '群组创建失败');
    }
  });
};

export const useRemoveFromGroupMutation = () => {
  const queryClient = useQueryClient();
  const { showError } = useFeedback();
  const invalidatePhotos = useInvalidatePhotos();

  return useMutation({
    mutationFn: ({ photoIds, groupId }: { photoIds: string[]; groupId: string }) => 
      removePhotosFromGroup(photoIds, groupId),
    onSuccess: () => {
      invalidatePhotos();
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (error: any) => {
      showError(error, '移出群组失败');
    }
  });
};

export const useUngroupMutation = () => {
  const queryClient = useQueryClient();
  const { showError } = useFeedback();
  const invalidatePhotos = useInvalidatePhotos();

  return useMutation({
    mutationFn: (groupId: string) => ungroupPhotos(groupId),
    onSuccess: () => {
      invalidatePhotos();
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (error: any) => {
      showError(error, '取消群组失败');
    }
  });
};

export const useDeleteGroupFromCloudMutation = () => {
  const queryClient = useQueryClient();
  const { showError } = useFeedback();
  const invalidatePhotos = useInvalidatePhotos();

  return useMutation({
    mutationFn: (groupId: string) => ungroupPhotos(groupId),
    onSuccess: () => {
      invalidatePhotos();
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (error: any) => {
      showError(error, '删除群组失败');
    }
  });
};
