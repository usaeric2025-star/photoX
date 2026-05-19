import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updatePhotosBatch } from '../../services/photoMutationService';
import { QUERY_KEYS } from '../queries/keys';
import { useErrorHandler } from '../../utils/errorHandler';

export const useBatchEditMutation = (userId: string) => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  return useMutation({
    mutationFn: ({ ids, updates }: { ids: string[]; updates: any }) => 
      updatePhotosBatch(userId, ids, updates),
    onMutate: async ({ ids, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['photos'] });

      // Snapshot
      const previousInfinite = queryClient.getQueryData(['photos', 'infinite']);
      const previousGroups = queryClient.getQueriesData({ queryKey: ['photos', 'group'] });

      // Optimistically update all infinite photo queries
      queryClient.setQueriesData({ queryKey: ['photos', 'infinite'] }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            photos: page.photos.map((photo: any) =>
              ids.includes(photo.id) ? { ...photo, ...updates } : photo
            ),
          })),
        };
      });

      // Update group queries too
      queryClient.setQueriesData({ queryKey: ['photos', 'group'] }, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((photo: any) => 
          ids.includes(photo.id) ? { ...photo, ...updates } : photo
        );
      });

      toast.success('批量更新成功');
      return { previousInfinite, previousGroups };
    },
    onSuccess: () => {
      (() => { const currentFilters = 'infinite' as any; queryClient.invalidateQueries({ queryKey: ['photos', currentFilters] }); queryClient.invalidateQueries({ queryKey: ['photos', 'group'] }); })();
    },
    onError: (err, variables, context: any) => {
      if (context?.previousInfinite) {
        queryClient.setQueryData(['photos', 'infinite'], context.previousInfinite);
      }
      if (context?.previousGroups) {
        context.previousGroups.forEach(([queryKey, data]: [any, any]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      (() => { const currentFilters = 'infinite' as any; queryClient.invalidateQueries({ queryKey: ['photos', currentFilters] }); queryClient.invalidateQueries({ queryKey: ['photos', 'group'] }); })();
      handleError(err, '批量编辑失败');
    },
  });
};
