import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const useInvalidatePhotos = () => {
  const queryClient = useQueryClient();

  const invalidatePhotos = useCallback(() => {
    // Invalidate infinite list (all filters) - still more specific than ['photos']
    queryClient.invalidateQueries({ queryKey: ['photos', 'infinite'] });
    
    // Invalidate group photos
    queryClient.invalidateQueries({ queryKey: ['photos', 'group'] });
    
    // Invalidate counts
    queryClient.invalidateQueries({ queryKey: ['photos', 'count'] });
  }, [queryClient]);

  return invalidatePhotos;
};
