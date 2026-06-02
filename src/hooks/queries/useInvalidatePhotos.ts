import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { photoKeys } from '@/lib/queryKeys';

export const useInvalidatePhotos = () => {
  const queryClient = useQueryClient();

  const invalidatePhotos = useCallback(() => {
    // Invalidate all photo queries using prefix matching
    // refetchType: 'active' ensures we only trigger re-fetch for queries currently mounted/visible
    return queryClient.invalidateQueries({ 
      queryKey: photoKeys.all,
      refetchType: 'active'
    });
  }, [queryClient]);

  return invalidatePhotos;
};
