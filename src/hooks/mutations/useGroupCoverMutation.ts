import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updatePhotosGroupInCloud } from '../../services/photoMutationService';
import { toast } from 'sonner';

export const useGroupCoverMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ photoId }: { photoId: string }) => updatePhotosGroupInCloud([photoId], { is_group_cover: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] });
      toast.success('已设为封面');
    },
    onError: (error: any) => {
      toast.error(`设为封面失败: ${error.message}`);
    }
  });
};
