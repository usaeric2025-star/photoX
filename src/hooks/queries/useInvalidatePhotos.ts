import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { photoKeys } from '@/lib/queryKeys';

export const useInvalidatePhotos = () => {
  const queryClient = useQueryClient();

  const invalidatePhotos = useCallback(() => {
    // Invalidate explicitly to ensure all branches are cleared
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: photoKeys.all }),
      queryClient.invalidateQueries({ queryKey: photoKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: ['photos', 'infinite'] })
    ]);
  }, [queryClient]);

  return invalidatePhotos;
};
