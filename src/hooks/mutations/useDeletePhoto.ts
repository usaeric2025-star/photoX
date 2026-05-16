import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Photo } from '../../types';
import { deletePhotoFromCloud } from '../../services/photoMutationService';
import { QUERY_KEYS } from '../queries/keys';

export const useDeletePhotoMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, photos }: { userId: string; photos: Photo[] }) => {
      for (const photo of photos) {
        await deletePhotoFromCloud(userId, photo);
      }
    },
    onSuccess: () => {
      // Invalidate all photo related queries
      queryClient.invalidateQueries({ queryKey: ['photos'] });
    },
  });
};
