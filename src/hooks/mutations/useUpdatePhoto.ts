import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Photo } from '../../types';
import { updatePhoto as updatePhotoFn, updatePhotosBatch } from '../../services/photoMutationService';
import { QUERY_KEYS } from '../queries/keys';

export const useUpdatePhotoMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Photo> }) => updatePhotoFn(id, updates),
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
      queryClient.invalidateQueries({ queryKey: ['photos'] });
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
      queryClient.invalidateQueries({ queryKey: ['photos'] });
    },
  });
};

export const useBatchUpdatePhotosMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, ids, updates, onProgress, signal }: { 
      userId: string; 
      ids: string[]; 
      updates: Partial<Photo>; 
      onProgress?: (current: number, total: number) => void;
      signal?: AbortSignal;
    }) => updatePhotosBatch(userId, ids, updates, onProgress, signal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] });
    },
  });
};
