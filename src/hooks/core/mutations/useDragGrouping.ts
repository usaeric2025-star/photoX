import { createMutation } from './factory';
import { movePhotosToGroup } from '@/services/photoMutationService';
import { photoKeys } from '@/lib/queryKeys';

/**
 * [HOOK-CONTRACT] useDragGrouping
 * Handle optimistic grouping updates using factory pattern.
 */
export const useDragGrouping = () => {
    return createMutation({
        mutationFn: async ({ photoIds, targetGroupId, userId }: { photoIds: string[], targetGroupId: string | null, userId: string }) => {
            return await movePhotosToGroup(userId, photoIds, targetGroupId);
        },
        queryKey: photoKeys.all,
        // Optional: Add optimistic update if needed, but based on the original 
        // code, it wasn't really doing a true optimistic object update.
        // I will keep it simple as requested by architectural rules (setQueryData preference).
        entity: 'photos',
        action: 'movePhotosToGroup',
        errorTitle: '批量移动照片至分組失败',
    });
};
