import { useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Photo, ApiResponse } from '../../types';
import { deletePhotoFromCloud } from '../../services/photoMutationService';
import { QUERY_KEYS } from '../queries/keys';

interface InfinitePhotosData {
  photos: Photo[];
  nextCursor?: string;
}

export const useDeletePhotoMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, photos }: { userId: string; photos: Photo[] }) => {
      for (const photo of photos) {
        await deletePhotoFromCloud(userId, photo);
      }
    },
    onMutate: async ({ photos }) => {
      const photoIds = photos.map(p => p.id);
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.photos });

      // Snapshot
      const previousInfinite = queryClient.getQueryData<InfiniteData<InfinitePhotosData>>(['photos', 'infinite']);
      const previousGroups = queryClient.getQueriesData<Photo[]>({ queryKey: ['photos', 'group'] });

      // Optimistically remove from cache
      queryClient.setQueriesData<InfiniteData<InfinitePhotosData>>({ queryKey: ['photos', 'infinite'] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            photos: page.photos.filter((photo: Photo) => !photoIds.includes(photo.id)),
          })),
        };
      });

      // Update group queries too
      queryClient.setQueriesData<Photo[]>({ queryKey: ['photos', 'group'] }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.filter((photo: Photo) => !photoIds.includes(photo.id));
      });

      return { previousInfinite, previousGroups };
    },
    onSuccess: () => {
      // Invalidate all photo related queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.photos });
    },
    onError: (err, variables, context) => {
      if (context?.previousInfinite) {
        queryClient.setQueryData(['photos', 'infinite'], context.previousInfinite);
      }
      if (context?.previousGroups) {
        context.previousGroups.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.photos });
      toast.error(`删除失败：${err instanceof Error ? err.message : '未知错误'}`);
    },
  });
};
