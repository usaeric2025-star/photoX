import { useMutation, useQueryClient } from '@tanstack/react-query';
import { groupPhotos, ungroupPhotos } from '../../services/photoMutationService';
import { toast } from 'sonner';
import { QUERY_KEYS } from '../queries/keys';

export const useGroupPhotosMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (photoIds: string[]) => groupPhotos(photoIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.photos });
      toast.success('群组创建成功');
    },
    onError: (error: any) => {
      toast.error(`群组创建失败: ${error.message}`);
    }
  });
};

export const useUngroupMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => ungroupPhotos(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.photos });
      toast.success('已取消群组');
    },
    onError: (error: any) => {
      toast.error(`取消群组失败: ${error.message}`);
    }
  });
};

export const useDeleteGroupFromCloudMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => ungroupPhotos(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.photos });
      toast.success('群组已成功删除');
    },
    onError: (error: any) => {
      toast.error(`删除群组失败: ${error.message}`);
    }
  });
};
