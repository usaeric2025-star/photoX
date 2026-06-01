import { useMutation, useQueryClient } from '@tanstack/react-query';
import { movePhotosToGroup } from '@/services/photoMutationService';
import { useFeedback } from '@/hooks';
import { match } from 'ts-pattern';
import { fromThrowableAsync } from '@/lib/errorFactory';

/**
 * [HOOK-CONTRACT] useDragGrouping
 * Handle optimistic grouping updates using defensive coding patterns (ts-pattern + AppResult).
 * @contract: [DRAG-STATE-MACHINE] ensures all mutation outcomes are explicitly handled.
 */
export const useDragGrouping = (userId: string) => {
    const queryClient = useQueryClient();
    const { handleError } = useFeedback();

    return useMutation({
        mutationFn: async ({ photoIds, targetGroupId }: { photoIds: string[], targetGroupId: string | null }) => {
            return await fromThrowableAsync(
                () => movePhotosToGroup(userId, photoIds, targetGroupId),
                'movePhotosToGroup'
            );
        },
        onMutate: async ({ photoIds, targetGroupId }) => {
            // [契約] 樂觀更新前置：取消查詢並備份緩存
            await queryClient.cancelQueries({ queryKey: ['photos'] });
            const previousPhotos = queryClient.getQueryData(['photos']);
            
            // 由於 VirtualGrid 的高度穩定性契約，此處僅標記數據更新，不進行 DOM 直接操作
            return { previousPhotos };
        },
        onSuccess: (result) => {
            if (!result.ok) {
                handleError(result.cause as Error, '批量移動照片至分組失敗');
            }
        },
        onError: (err) => {
            // Handle critical mutation exceptions (e.g. network failure before mutationFn completes)
            handleError(err as Error, '分組操作發生嚴重錯誤');
        },
        onSettled: () => {
            // [契約] 數據歸一化防線：不論成功失敗，最終均觸發緩存刷新
            queryClient.invalidateQueries({ queryKey: ['photos'] });
        }
    });
};
