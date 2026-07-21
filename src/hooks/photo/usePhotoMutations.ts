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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.photos.detail(data.id) });
      invalidateList();
    }
  });

  const uploadMutation = useAppMutation({
    mutationFn: async (files: FileList | File[]) => {
      const fileList = Array.from(files);
      const taskId = generateId();
      
      createTask({
        id: taskId,
        type: 'upload',
        label: t('uploadingPhotos', fileList.length),
        execute: async (signal, onProgress) => {
           return executeBatchUpload(fileList, user?.id || '')(signal, onProgress);
        },
        onComplete: () => {
          invalidateAll();
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
      const { createTask } = await import('#lib/task-queue/index.js');
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
