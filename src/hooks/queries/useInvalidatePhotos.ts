import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { photoKeys } from '@/lib/queryKeys';

export const useInvalidatePhotos = () => {
  const queryClient = useQueryClient();

  const invalidatePhotos = useCallback(() => {
    // Invalidate all photo queries using prefix matching
    return queryClient.invalidateQueries({ 
      queryKey: photoKeys.all
    });
  }, [queryClient]);

  return invalidatePhotos;
};
