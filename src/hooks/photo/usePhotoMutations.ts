import { useAppMutation, useQueryClient, useAppQuery } from '#lib/query/index.js';
import { api } from '#lib/api.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { queryKeys } from '#lib/query/keys.js';
import { useTranslation } from '#src/hooks/core/index.js';
import { useInvalidatePhotos } from './usePhotos.js';
import { createTask } from '#lib/task-queue/index.js';
import { executeBatchUpload } from '#lib/task-queue/adapters/upload.js';
import { generateId } from '#lib/id.js';
import { PhotoEditFormData } from '#lib/valibot/schemas/photo.js';
import { queryClient as globalQueryClient } from '#lib/query/index.js';
import { useAtomValue } from 'jotai';
import { userAtom } from '#src/store/index.js';
import { STALE_TIMES } from '#lib/query/config.js';
import { runBatchAnalysis } from '#src/features/ai/orchestration.js';
import { feedback } from '#src/lib/feedback.js';

export type UploadInput = 
  | FileList 
  | File[] 
  | { files: FileList | File[]; asGroup?: boolean; groupId?: string };

/**
 * updatePhoto (Standalone)
 * 用於非組件環境（如 AI Orchestration）直接調用 API。
 */
export async function updatePhoto(id: string, updates: any) {
  const res = await api.admin.photos[':id'].$patch({
    param: { id },
    // @ts-ignore
    json: updates
  });
  const data = await ErrorFactory.unwrap<any>(res, 'Update Failed');
  globalQueryClient.invalidateQueries({ queryKey: queryKeys.photos.detail(id) });
  globalQueryClient.invalidateQueries({ queryKey: queryKeys.photos.lists() });
  return data;
}

/**
 * usePhotoUpload (Standalone alias)
 */
export function usePhotoUpload() {
  const { uploadMutation } = usePhotoMutations();
  return {
    ...uploadMutation,
    uploadFiles: uploadMutation.mutate
  };
}

/**
 * usePhotoMutations
 */
export function usePhotoMutations() {
  const user = useAtomValue(userAtom);
  const { t, uiTranslations: labels } = useTranslation();
  const { invalidateList, invalidateAll } = useInvalidatePhotos();
  const queryClient = useQueryClient();

  const editMutation = useAppMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
      const res = await api.admin.photos[':id'].$patch({
        param: { id },
        // @ts-ignore
        json: updates
      });
      return ErrorFactory.unwrap<any>(res, labels.mutationFailed);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.photos.detail(data.id) });
      invalidateList();
    }
  });

  const deleteMutation = useAppMutation({
    mutationFn: async (ids: string[]) => {
      // @ts-ignore - Hono client indexing
      const res = await api.admin.photos.batch.delete.$post({
        json: { ids }
      });
      return ErrorFactory.unwrap<any>(res, labels.mutationFailed);
    },
    onSuccess: () => {
      invalidateAll();
    }
  });

  const batchEditMutation = useAppMutation({
    mutationFn: async ({ ids, updates }: { ids: string[], updates: any }) => {
      // @ts-ignore - Hono client indexing
      const res = await api.admin.photos.batch.edit.$patch({
        json: { ids, updates }
      });
      return ErrorFactory.unwrap<any>(res, labels.mutationFailed);
    },
    onSuccess: () => {
      invalidateAll();
    }
  });

  const togglePinMutation = useAppMutation({
    mutationFn: async ({ id, isPinned }: { id: string, isPinned: boolean }) => {
      const res = await api.admin.photos[':id'].pin.$post({
        param: { id },
        // @ts-ignore
        json: { isPinned }
      });
      return ErrorFactory.unwrap<any>(res, labels.mutationFailed);
    },
    onMutate: async ({ id, isPinned }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.photos.all });
      const previousDetail = queryClient.getQueryData(queryKeys.photos.detail(id));

      if (previousDetail) {
        queryClient.setQueryData(queryKeys.photos.detail(id), (old: any) => 
          old ? { ...old, isPinned } : old
        );
      }

      queryClient.setQueriesData({ queryKey: queryKeys.photos.lists() }, (oldData: any) => {
        if (!oldData) return oldData;

        const updateItem = (item: any) => (item && item.id === id ? { ...item, isPinned } : item);

        if (Array.isArray(oldData.pages)) {
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => {
              if (Array.isArray(page)) {
                return page.map(updateItem);
              }
              if (page && Array.isArray(page.items)) {
                return { ...page, items: page.items.map(updateItem) };
              }
              if (page && Array.isArray(page.data)) {
                return { ...page, data: page.data.map(updateItem) };
              }
              return page;
            })
          };
        }

        if (Array.isArray(oldData)) {
          return oldData.map(updateItem);
        }

        if (Array.isArray(oldData.items)) {
          return { ...oldData, items: oldData.items.map(updateItem) };
        }
        if (Array.isArray(oldData.data)) {
          return { ...oldData, data: oldData.data.map(updateItem) };
        }

        return oldData;
      });

      return { previousDetail };
    },
    onError: (err, { id }, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(queryKeys.photos.detail(id), context.previousDetail);
      }
      invalidateList();
      feedback.error(labels.mutationFailed);
    },
    onSuccess: (data, { isPinned }) => {
      const msg = isPinned ? '已置頂' : '已取消置頂';
      feedback.success(msg);
    },
    onSettled: (data) => {
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.photos.detail(data.id) });
      }
      invalidateList();
    }
  });

  const uploadMutation = useAppMutation({
    mutationFn: async (input: UploadInput) => {
      let rawFiles: FileList | File[];
      let asGroup = false;
      let targetGroupId: string | undefined = undefined;

      if (input && typeof input === 'object' && 'files' in input && !Array.isArray(input)) {
        rawFiles = input.files;
        asGroup = !!input.asGroup;
        targetGroupId = input.groupId;
      } else {
        rawFiles = input as FileList | File[];
      }

      const fileList = Array.from(rawFiles || []);
      if (fileList.length === 0) return '';

      if (asGroup && !targetGroupId) {
        targetGroupId = generateId();
      }

      const taskId = generateId();
      
      createTask({
        id: taskId,
        type: 'upload',
        label: t('uploadingPhotos', fileList.length),
        execute: async (signal, onProgress) => {
           return executeBatchUpload(fileList, user?.id || '', { groupId: targetGroupId })(signal, onProgress);
        },
        onComplete: (results: any) => {
          invalidateAll();
          
          if (Array.isArray(results)) {
            // Trigger AI analysis for successful new uploads
            const successfulIds = results
              .filter((r: any) => r.success && !r.duplicate && r.id)
              .map((r: any) => r.id);
            
            if (successfulIds.length > 0) {
              createTask({
                id: generateId(),
                type: 'ai-analyze',
                label: t('aiAnalyze') || 'AI 識別中',
                userId: user?.id,
                execute: async (signal, onProgress) => {
                  return runBatchAnalysis({
                    targetPhotos: successfulIds.map(id => ({ id })) as any,
                    onProgress,
                    signal
                  });
                }
              });
            }

            const total = fileList.length;
            const successes = results.filter((r: any) => r.success && !r.duplicate);
            const duplicates = results.filter((r: any) => r.duplicate);
            const failures = results.filter((r: any) => !r.success);

            if (duplicates.length === total) {
              feedback.info(t('allPhotosDuplicated') || '所選照片在庫中均已存在（已自動排重跳過）');
            } else if (failures.length === total) {
              feedback.error(t('uploadFailed') || '照片上傳失敗');
            } else {
              let msg = `已完成 ${successes.length}/${total} 張照片上傳`;
              if (duplicates.length > 0) {
                msg += `（其中 ${duplicates.length} 張已有照片已自動排重）`;
              }
              feedback.success(msg);
            }
          } else {
            feedback.success('照片上傳完成');
          }
        }
      });
      return taskId;
    }
  });

  return {
    editMutation,
    deleteMutation,
    batchEditMutation,
    togglePinMutation,
    uploadMutation,
    // Aliases for convenience
    togglePin: togglePinMutation.mutate,
    updatePhoto: editMutation.mutate,
    editPhotoAsync: editMutation.mutateAsync,
    deletePhotoAsync: deleteMutation.mutateAsync,
    batchEditAsync: batchEditMutation.mutateAsync,
    togglePinAsync: togglePinMutation.mutateAsync,
    usePhotoUpload: () => uploadMutation,
    isEditing: editMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isBatchEditing: batchEditMutation.isPending,
    isUploading: uploadMutation.isPending
  };
}

/**
 * useAIBatchAnalysis
 */
export function useAIBatchAnalysis() {
  const { t } = useTranslation();
  const user = useAtomValue(userAtom);

  const aiAnalyzeMutation = useAppMutation({
    mutationFn: async (photos: any[]) => {
      return createTask({
        label: t('aiAnalyze') || 'AI 識別中',
        type: 'ai-analyze',
        userId: user?.id,
        execute: async (signal, onProgress) => {
          return runBatchAnalysis({
            targetPhotos: photos,
            onProgress,
            signal
          });
        }
      });
    }
  });

  return {
    aiAnalyzeMutation,
    handleBatchAiAnalyze: aiAnalyzeMutation.mutateAsync,
    isAiAnalyzing: aiAnalyzeMutation.isPending
  };
}

/**
 * usePhotoAIResult
 */
export function usePhotoAIResult(photoId: string, options: any = {}) {
  const { t } = useTranslation();
  
  return useAppQuery(
    ['photos', 'ai-result', photoId],
    async () => {
      if (!photoId) return null;
      // @ts-ignore
      const res = await api.admin.photos[':id']['ai-result'].$get({ param: { id: photoId } });
      return ErrorFactory.unwrap<any>(res, t('aiAnalyzeFailed') || 'AI Analysis Failed');
    },
    { 
      enabled: !!photoId && options.enabled !== false,
      staleTime: STALE_TIMES.LONG,
      ...options
    }
  );
}
