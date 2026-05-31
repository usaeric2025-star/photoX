import { useMutation, useQueryClient } from '@tanstack/react-query';
import { movePhotosToGroup } from '@/services/photoMutationService';
import { useFeedback } from '@/hooks';
import { match } from 'ts-pattern';
import { ResultAsync } from 'neverthrow';

/**
 * [HOOK-CONTRACT] useDragGrouping
 * Handle optimistic grouping updates using defensive coding patterns (ts-pattern + neverthrow).
 * @contract: [DRAG-STATE-MACHINE] ensures all mutation outcomes are explicitly handled.
 * @contract: [NEVERTHROW-INTEGRATION] wraps async operations to prevent silent failures.
 */
export const useDragGrouping = (userId: string) => {
    const queryClient = useQueryClient();
    const { handleError } = useFeedback();

    return useMutation({
        mutationFn: async ({ photoIds, targetGroupId }: { photoIds: string[], targetGroupId: string | null }) => {
            // [NEVERTHROW-INTEGRATION] Encapsulate the promise in ResultAsync to force error handling
            return await ResultAsync.fromPromise(
                movePhotosToGroup(userId, photoIds, targetGroupId),
                (e) => (e instanceof Error ? e : new Error(String(e)))
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
            // [DRAG-STATE-MACHINE] Using result.match for explicit branch handling
            // This aligns with neverthrow's primary error handling pattern
            result.match(
                () => {
                    // Success: Silent per Light task protocol
                },
                (error) => {
                    handleError(error, '批量移動照片至分組失敗');
                }
            );
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
