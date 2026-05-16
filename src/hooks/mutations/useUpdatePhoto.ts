import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Photo } from '../../types';
import { updatePhoto as updatePhotoFn, updatePhotosBatch } from '../../services/photoMutationService';
import { QUERY_KEYS } from '../queries/keys';

export const useUpdatePhotoMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Photo> }) => updatePhotoFn(id, updates),
    onSuccess: () => {
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
