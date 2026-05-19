import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Photo } from '../../types';
import { updatePhoto as updatePhotoFn, updatePhotosBatch } from '../../services/photoMutationService';
import { useFeedback, useInvalidatePhotos } from '../../hooks';

export const useUpdatePhotoMutation = () => {
  const queryClient = useQueryClient();
  const { showError } = useFeedback();
  const invalidatePhotos = useInvalidatePhotos();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Photo> }) => {
      if (!id || id.startsWith('temp-')) {
        throw new Error('无效的照片ID，请刷新页面');
      }
      return updatePhotoFn(id, updates);
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['photos'] });

      // Snapshot the previous values
      const previousInfinite = queryClient.getQueryData<any>(['photos', 'infinite']);
      const previousGroups = queryClient.getQueriesData<Photo[]>({ queryKey: ['photos', 'group'] });

      // Optimistically update all infinite photo queries
      queryClient.setQueriesData({ queryKey: ['photos', 'infinite'] }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: { photos: Photo[] }) => ({
            ...page,
            photos: page.photos.map((photo: Photo) =>
              photo.id === id ? { ...photo, ...updates } : photo
            ),
          })),
        };
      });

      // Also update any specific group queries
      queryClient.setQueriesData({ queryKey: ['photos', 'group'] }, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((photo: Photo) => 
          photo.id === id ? { ...photo, ...updates } : photo
        );
      });

      return { previousInfinite, previousGroups };
    },
    onSuccess: () => {
      // Intentionally avoid full invalidate, rely on optimistic updates
    },
    onError: (err, variables, context: { previousInfinite?: any; previousGroups?: [any, Photo[]][] }) => {
      // If mutation fails, use the context returned from onMutate to roll back
      if (context?.previousInfinite) {
        queryClient.setQueryData(['photos', 'infinite'], context.previousInfinite);
      }
      if (context?.previousGroups) {
        context.previousGroups.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      invalidatePhotos();
      showError(err, '更新照片失败');
    },
  });
};

export const useBatchUpdatePhotosMutation = () => {
  const queryClient = useQueryClient();
  const { showError } = useFeedback();
  
  return useMutation({
    mutationFn: ({ userId, ids, updates, onProgress, signal }: { 
      userId: string; 
      ids: string[]; 
      updates: Partial<Photo>; 
      onProgress?: (current: number, total: number) => void;
      signal?: AbortSignal;
    }) => updatePhotosBatch(userId, ids, updates, onProgress, signal),
    onSuccess: (data, { ids, updates }) => {
      queryClient.setQueriesData({ queryKey: ['photos', 'infinite'] }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            photos: page.photos.map((photo: Photo) =>
              ids.includes(photo.id) ? { ...photo, ...updates } : photo
            ),
          })),
        };
      });
      queryClient.setQueriesData({ queryKey: ['photos', 'group'] }, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((photo: Photo) => 
          ids.includes(photo.id) ? { ...photo, ...updates } : photo
        );
      });
    },
    onError: (err, variables, context) => {
      showError(err, '批量操作失败');
    },
  });
};
