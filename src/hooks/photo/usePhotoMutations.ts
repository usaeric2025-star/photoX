import { useAppMutation, useQueryClient, useAppQuery } from '#lib/query/index.js';
import { QueryKey } from '@tanstack/react-query';
import { api } from '#lib/api.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { queryKeys } from '#lib/query/keys.js';
import { useTranslation } from '#src/hooks/core/index.js';
import { useInvalidatePhotos } from './usePhotos.js';
import { createTask } from '#lib/task-queue/index.js';
import { executeBatchUpload } from '#lib/task-queue/adapters/upload.js';
import { generateId } from '#lib/id.js';
import { Photo } from '#src/types/index.js';
import { PhotoEditFormData } from '#lib/valibot/schemas/photo.js';
import { queryClient as globalQueryClient } from '#lib/query/index.js';
import { useAtomValue } from 'jotai';
import { userAtom } from '#src/store/index.js';
import { STALE_TIMES } from '#lib/query/config.js';
import { runBatchAnalysis } from '#src/features/ai/orchestration.js';
import { feedback } from '#src/lib/feedback.js';
export { updatePhoto } from './api.js';

export type UploadInput = 
  | FileList 
  | File[] 
  | { files: FileList | File[]; asGroup?: boolean; groupId?: string };

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
  const invalidateGroups = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
  };

  const editMutation = useAppMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Record<string, unknown> }) => {
      const res = await api.admin.photos[':id'].$patch({
        param: { id },
        // @ts-ignore
        json: updates
      });
      return ErrorFactory.unwrap<{ id: string }>(res, labels.mutationFailed);
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
      return ErrorFactory.unwrap<{ success: boolean }>(res, labels.mutationFailed);
    },
    onMutate: async (ids: string[]) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.photos.lists() });
      const previousPhotosData = queryClient.getQueriesData({ queryKey: queryKeys.photos.lists() });

      queryClient.setQueriesData({ queryKey: queryKeys.photos.lists() }, (oldData: unknown) => {
        if (!oldData) return oldData;
        const filterItem = (item: { id: string }) => item && !ids.includes(item.id);

        const data = oldData as { pages?: Array<unknown>; items?: Array<unknown>; data?: Array<unknown> };

        if (Array.isArray(data.pages)) {
          return {
            ...data,
            pages: data.pages.map((page: unknown) => {
              if (Array.isArray(page)) return page.filter(filterItem);
              const p = page as Record<string, unknown>;
              if (p && typeof p === 'object' && Array.isArray(p.items)) return { ...p, items: p.items.filter(filterItem) };
              if (p && typeof p === 'object' && Array.isArray(p.data)) return { ...p, data: p.data.filter(filterItem) };
              return page;
            })
          };
        }
        if (Array.isArray(data)) return data.filter(filterItem);
        if (Array.isArray(data.items)) return { ...data, items: data.items.filter(filterItem) };
        if (Array.isArray(data.data)) return { ...data, data: data.data.filter(filterItem) };
        return oldData;
      });

      return { previousPhotosData };
    },
    onError: (_err, _ids, context: { previousPhotosData?: Array<[QueryKey, unknown]> } | undefined) => {
      if (context?.previousPhotosData) {
        context.previousPhotosData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      feedback.error(labels.mutationFailed || '刪除失敗');
    },
    onSuccess: (_, ids) => {
      feedback.success(t('deleteSuccessCount', ids.length) || `已成功刪除 ${ids.length} 張照片`);
    },
    onSettled: () => {
      invalidateList();
    }
  });

  const batchEditMutation = useAppMutation({
    mutationFn: async ({ ids, updates }: { ids: string[], updates: Record<string, unknown> }) => {
      // @ts-ignore - Hono client indexing
      const res = await api.admin.photos.batch.edit.$patch({
        json: { ids, updates }
      });
      return ErrorFactory.unwrap<{ success: boolean }>(res, labels.mutationFailed);
    },
    onMutate: async ({ ids, updates }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.photos.lists() });
      const previousPhotosData = queryClient.getQueriesData({ queryKey: queryKeys.photos.lists() });

      queryClient.setQueriesData({ queryKey: queryKeys.photos.lists() }, (oldData: unknown) => {
        if (!oldData) return oldData;
        const updateItem = (item: { id: string }) => (item && ids.includes(item.id) ? { ...item, ...updates } : item);

        const data = oldData as { pages?: Array<unknown>; items?: Array<unknown>; data?: Array<unknown> };

        if (Array.isArray(data.pages)) {
          return {
            ...data,
            pages: data.pages.map((page: unknown) => {
              if (Array.isArray(page)) return page.map(updateItem);
              const p = page as Record<string, unknown>;
              if (p && typeof p === 'object' && Array.isArray(p.items)) return { ...p, items: p.items.map(updateItem) };
              if (p && typeof p === 'object' && Array.isArray(p.data)) return { ...p, data: p.data.map(updateItem) };
              return page;
            })
          };
        }
        if (Array.isArray(data)) return data.map(updateItem);
        if (Array.isArray(data.items)) return { ...data, items: data.items.map(updateItem) };
        if (Array.isArray(data.data)) return { ...data, data: data.data.map(updateItem) };
        return oldData;
      });

      return { previousPhotosData };
    },
    onError: (_err, _vars, context: { previousPhotosData?: Array<[QueryKey, unknown]> } | undefined) => {
      if (context?.previousPhotosData) {
        context.previousPhotosData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      feedback.error(labels.mutationFailed || '修改失敗');
    },
    onSuccess: () => {
      feedback.success(t('batchUpdateSuccess') || '批量修改成功');
    },
    onSettled: () => {
      invalidateList();
    }
  });

  const manualGroupMutation = useAppMutation({
    mutationFn: async ({ photoIds, groupId }: { photoIds: string[], groupId: string }) => {
      // @ts-ignore - Hono client indexing for group-photos
      const res = await api.groups['group-photos'].$post({
        json: { 
          photoIds, 
          targetGroupId: groupId 
        }
      });
      return ErrorFactory.unwrap<Record<string, unknown>>(res, labels.mutationFailed);
    },
    onMutate: async ({ photoIds, groupId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.photos.lists() });
      const previousPhotosData = queryClient.getQueriesData({ queryKey: queryKeys.photos.lists() });

      queryClient.setQueriesData({ queryKey: queryKeys.photos.lists() }, (oldData: unknown) => {
        if (!oldData) return oldData;
        
        // 乐观更新：将选中照片合并，保留第一张作为封面，其余移除（以实现立即收起的视觉效果）
        let hasAssignedCover = false;
        const updatePageItems = (items: Array<any>) => {
          const newItems: any[] = [];
          for (const item of items) {
            if (photoIds.includes(item.id)) {
              if (!hasAssignedCover) {
                hasAssignedCover = true;
                newItems.push({ ...item, groupId, isGroupCover: true, memberCount: photoIds.length });
              }
              // Skip adding the other photos to simulate collapsing
            } else {
              newItems.push(item);
            }
          }
          return newItems;
        };

        const data = oldData as { pages?: Array<{ items?: unknown[]; data?: unknown[] }>; items?: unknown[]; data?: unknown[] };

        if (Array.isArray(data.pages)) {
          return {
            ...data,
            pages: data.pages.map((page) => {
              const items = (page.items || page.data || (Array.isArray(page) ? page : null)) as Array<any>;
              if (Array.isArray(items)) {
                const updatedItems = updatePageItems(items);
                if (page.items) return { ...page, items: updatedItems };
                if (page.data) return { ...page, data: updatedItems };
                return updatedItems;
              }
              return page;
            })
          };
        }
        if (Array.isArray(data)) return updatePageItems(data);
        if (Array.isArray(data.items)) return { ...data, items: updatePageItems(data.items) };
        if (Array.isArray(data.data)) return { ...data, data: updatePageItems(data.data) };
        return oldData;
      });

      return { previousPhotosData };
    },
    onError: (_err, _vars, context: { previousPhotosData?: Array<[QueryKey, unknown]> } | undefined) => {
      if (context?.previousPhotosData) {
        context.previousPhotosData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      feedback.error(labels.mutationFailed || '合組失敗');
    },
    onSuccess: () => {
      feedback.success('合併分組成功');
    },
    onSettled: () => {
      invalidateList();
      invalidateGroups();
    }
  });

  const togglePinMutation = useAppMutation({
    mutationFn: async ({ id, isPinned }: { id: string, isPinned: boolean }) => {
      const res = await api.admin.photos[':id'].pin.$post({
        param: { id },
        // @ts-ignore
        json: { isPinned }
      });
      return ErrorFactory.unwrap<{ id: string; isPinned: boolean }>(res, labels.mutationFailed);
    },
    onMutate: async ({ id, isPinned }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.photos.all });
      const previousDetail = queryClient.getQueryData(queryKeys.photos.detail(id));

      if (previousDetail) {
        queryClient.setQueryData(queryKeys.photos.detail(id), (old: { id: string; isPinned?: boolean } | undefined) => 
          old ? { ...old, isPinned } : old
        );
      }

      queryClient.setQueriesData({ queryKey: queryKeys.photos.lists() }, (oldData: unknown) => {
        if (!oldData) return oldData;

        const updateItem = (item: { id: string; isPinned?: boolean }) => (item && item.id === id ? { ...item, isPinned } : item);

        const data = oldData as { pages?: Array<unknown>; items?: Array<unknown>; data?: Array<unknown> };

        if (Array.isArray(data.pages)) {
          return {
            ...data,
            pages: data.pages.map((page: unknown) => {
              if (Array.isArray(page)) {
                return page.map(updateItem);
              }
              const p = page as Record<string, unknown>;
              if (p && Array.isArray(p.items)) {
                return { ...p, items: p.items.map(updateItem) };
              }
              if (p && Array.isArray(p.data)) {
                return { ...p, data: p.data.map(updateItem) };
              }
              return page;
            })
          };
        }

        if (Array.isArray(data)) {
          return data.map(updateItem);
        }

        if (Array.isArray(data.items)) {
          return { ...data, items: data.items.map(updateItem) };
        }
        if (Array.isArray(data.data)) {
          return { ...data, data: data.data.map(updateItem) };
        }

        return oldData;
      });

      return { previousDetail };
    },
    onError: (err, { id }, context: { previousDetail?: unknown } | undefined) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(queryKeys.photos.detail(id), context.previousDetail);
      }
      invalidateList();
      feedback.error(labels.mutationFailed);
    },
    onSuccess: (_data, { isPinned }) => {
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
        onComplete: (results: unknown) => {
          invalidateAll();
          
          if (Array.isArray(results)) {
            const typedResults = results as { success?: boolean; duplicate?: boolean; id?: string }[];
            // Trigger AI analysis for successful new uploads
            const successfulIds = typedResults
              .filter((r) => r.success && !r.duplicate && r.id)
              .map((r) => r.id as string);
            
            if (successfulIds.length > 0) {
              createTask({
                id: generateId(),
                type: 'ai-analyze',
                label: t('aiAnalyze') || 'AI 識別中',
                userId: user?.id,
                execute: async (signal, onProgress) => {
                  return runBatchAnalysis({
                    targetPhotos: successfulIds.map(id => ({ id } as any)),
                    onProgress,
                    signal
                  });
                }
              });
            }

            const total = fileList.length;
            const successes = typedResults.filter((r) => r.success && !r.duplicate);
            const duplicates = typedResults.filter((r) => r.duplicate);
            const failures = typedResults.filter((r) => !r.success);

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
    manualGroupMutation,
    togglePinMutation,
    uploadMutation,
    // Aliases for convenience
    togglePin: togglePinMutation.mutate,
    updatePhoto: editMutation.mutate,
    editPhotoAsync: editMutation.mutateAsync,
    deletePhotoAsync: deleteMutation.mutateAsync,
    batchEditAsync: batchEditMutation.mutateAsync,
    manualGroupAsync: manualGroupMutation.mutateAsync,
    togglePinAsync: togglePinMutation.mutateAsync,
    usePhotoUpload: () => uploadMutation,
    isEditing: editMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isBatchEditing: batchEditMutation.isPending,
    isGrouping: manualGroupMutation.isPending,
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
    mutationFn: async (photos: Photo[]) => {
      const photoIds = photos.map(p => p.id);
      return createTask({
        label: t('aiAnalyze') || 'AI 識別中',
        type: 'ai-analyze',
        userId: user?.id,
        meta: { photoIds },
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
export function usePhotoAIResult(photoId: string, options: { enabled?: boolean } = {}) {
  const { t } = useTranslation();
  
  return useAppQuery(
    ['photos', 'ai-result', photoId],
    async () => {
      if (!photoId) return null;
      // @ts-ignore
      const res = await api.admin.photos[':id']['ai-result'].$get({ param: { id: photoId } });
      return ErrorFactory.unwrap<Record<string, unknown>>(res, t('aiAnalyzeFailed') || 'AI Analysis Failed');
    },
    { 
      enabled: !!photoId && options.enabled !== false,
      staleTime: STALE_TIMES.LONG,
      ...options
    }
  );
}
