import { useMutation, useQueryClient } from '@tanstack/react-query';
import { movePhotosToGroup } from '@/services/photoMutationService';
import { useFeedback } from '@/hooks/uiFeedback';

/**
 * [HOOK-CONTRACT] useDragGrouping
 * Handle optimistic grouping updates.
 */
export const useDragGrouping = (userId: string) => {
    const queryClient = useQueryClient();
    const { handleError } = useFeedback();

    return useMutation({
        mutationFn: ({ photoIds, targetGroupId }: { photoIds: string[], targetGroupId: string | null }) =>
            movePhotosToGroup(userId, photoIds, targetGroupId),
        onMutate: async ({ photoIds, targetGroupId }) => {
            // Optimistic update logic stub
            return { previousPhotos: [] };
        },
        onError: (err, variables, context) => {
            handleError(err as Error, 'Failed to move photos');
            // Rollback
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['photos'] });
        }
    });
};
