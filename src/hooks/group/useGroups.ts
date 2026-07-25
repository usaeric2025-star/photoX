import { useCallback, useMemo } from 'react';
import { useAtomValue, getDefaultStore } from 'jotai';
import { userAtom } from '#src/store/index.js';
import { queryClient, useAppQuery, useAppMutation } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';
import { STALE_TIMES } from '#lib/query/config.js';
import { useOptimisticPhotoMutation } from '#lib/query/optimistic.js';
import { generateId } from '#lib/id.js';
import { feedback } from '#lib/feedback.js';
import { ProductGroup, Photo } from '#src/types/index.js';
import { api } from '#lib/api.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
/**
 * GroupService
 * 
 * 處理群組與照片關係的 API 呼叫。
 */
const GroupService = {
  list: async () => {
    return ErrorFactory.unwrap<ProductGroup[]>(
      api.groups.$get(),
      '獲取群組列表失敗'
    );
  },

  create: async (data: { name: string; userId: string }) => {
    return ErrorFactory.unwrap<ProductGroup>(
      api.groups.$post({ json: { groupData: { name: data.name }, userId: data.userId } }),
      '創建群組失敗'
    );
  },

  update: async (id: string, updates: Partial<ProductGroup>) => {
    return ErrorFactory.unwrap<ProductGroup>(
      api.groups[':id'].$put({ param: { id }, json: { updates } }),
      '更新群組失敗'
    );
  },

  delete: async (id: string) => {
    return ErrorFactory.unwrap<unknown>(
      api.groups[':id'].$delete({ param: { id } }),
      '刪除群組失敗'
    );
  },

  setCover: async (groupId: string, photoId: string | null) => {
    return ErrorFactory.unwrap<unknown>(
      api.groups['set-cover'].$post({ json: { photoId, groupId } }),
      '設置封面失敗'
    );
  },

  movePhotos: async (photoIds: string[], groupId: string) => {
    const store = getDefaultStore();
    const currentUser = store.get(userAtom);
    const userId = currentUser?.id || 'admin';
    return ErrorFactory.unwrap<unknown>(
      api.groups['move-photos'].$post({ json: { photoIds, targetGroupId: groupId, userId, groupData: {} } }),
      '移動照片失敗'
    );
  },

  removePhotos: async (photoIds: string[], groupId: string) => {
    return ErrorFactory.unwrap<unknown>(
      api.groups['remove-photos'].$post({ json: { photoIds, groupId } }),
      '從群組移除照片失敗'
    );
  },

  ungroup: async (groupId: string) => {
    return ErrorFactory.unwrap<unknown>(
      api.groups['ungroup'].$post({ json: { groupId } }),
      '解散群組失敗'
    );
  },

  getById: async (id: string, mode: 'admin' | 'public' = 'public') => {
    return ErrorFactory.unwrap<ProductGroup>(
      api.groups[':id'].$get({ param: { id }, query: { isAdminMode: mode === 'admin' ? 'true' : 'false' } }),
      '獲取群組詳情失敗'
    );
  },

  upsert: async (group: Partial<ProductGroup> & { id: string }) => {
    return ErrorFactory.unwrap<ProductGroup>(
      api.groups.upsert.$post({ json: group }),
      '更新或創建群組失敗'
    );
  },

  groupPhotos: async (photoIds: string[], targetGroupId?: string) => {
    const store = getDefaultStore();
    const currentUser = store.get(userAtom);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const userId = (currentUser?.id && uuidRegex.test(currentUser.id)) ? currentUser.id : '8ec53131-a589-4b50-beb4-6b5308541e1b';
    return ErrorFactory.unwrap<{ targetGroupId: string }>(
      api.groups['group-photos'].$post({ json: { photoIds, targetGroupId, userId, groupData: {} } }),
      '組合照片失敗'
    );
  }
};
import { useFilters } from '../ui/useUI.js';
import { usePhotos, useInvalidatePhotos } from '../photo/index.js';
import { useSelectionActions } from '#src/hooks/index.js';
import { useTranslation } from '../core/index.js';

/**
 * useGroupDetail
 * 獲取單個群組的詳細信息。
 */
function useGroupDetail(id: string | null, isAdmin = false) {
  const { data: group, isLoading, error } = useAppQuery(
    id ? queryKeys.groups.detail(id, isAdmin) : null,
    async () => {
      if (!id) return null;
      return GroupService.getById(id, isAdmin ? 'admin' : 'public');
    },
    {
      staleTime: STALE_TIMES.LONG,
    }
  );
  return { group, isLoading, error };
}

/**
 * useGroupData
 * 獲取群組及其照片列表。
 */
interface UseGroupDataOptions {
  groupId: string | null;
  isAdmin?: boolean;
}

export function useGroupData({ groupId, isAdmin }: UseGroupDataOptions) {
  const { search, category, tags, sort } = useFilters();
  const { group, isLoading: isGroupPending, error: groupError } = useGroupDetail(groupId, !!isAdmin);
  
  const {
    data,
    isPending: isPhotosPending,
    error: photosError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = usePhotos({
    groupId: groupId || undefined,
    mode: isAdmin ? 'admin' : 'public',
    categoryId: category,
    tagId: tags?.[0],
    searchQuery: search,
    sortOrder: sort,
    onlyGroupsCover: false,
  });

  const photos = data?.pages.flatMap(p => p.items) || [];
  const totalCount = data?.pages[0]?.total || 0;
  const loading = isGroupPending || isPhotosPending;
  const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));
  const error = (groupError || photosError) ? (getErrorMessage(groupError || photosError)) : null;

  return {
    group,
    photos,
    totalCount,
    loading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  };
}

/**
 * useGroupEditState
 * 處理群組編輯過程中的中間狀態與級聯更新邏輯。
 */
export const useGroupEditState = (
  activeGroupId: string | null,
  dbGroupPhotos: Photo[] | undefined,
  onUpdatePhoto: (id: string, data: Partial<Photo>) => Promise<unknown>
) => {
  const user = useAtomValue(userAtom);
  const { group: queriedGroupData, isLoading: isGroupDataPending } = useGroupDetail(activeGroupId, true);

  const initialGroupData = queriedGroupData || (activeGroupId && !isGroupDataPending ? {
    id: activeGroupId,
    name: "GROUP",
    description: { zh: "" },
    coverPhotoId: null,
    userId: user?.id || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'active' as const
  } : null) as ProductGroup | null;

  const handleUpdateGroupData = useCallback(async (updates: Partial<ProductGroup>) => {
    if (!activeGroupId || !initialGroupData) return;
    const nextGroupData = { ...initialGroupData, ...updates };
    try {
      await GroupService.upsert(nextGroupData);
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(activeGroupId, true) });
    } catch (err) {
      throw err;
    }
  }, [activeGroupId, initialGroupData]);

  return {
    groupData: initialGroupData,
    isGroupDataPending,
    handleUpdateGroupData
  };
};

/**
 * useGroupMutations
 * 整合所有群組相關的寫操作。
 */
export function useGroupMutations() {
  const { clearSelection } = useSelectionActions();
  const { invalidateList, invalidateAll } = useInvalidatePhotos();
  const invalidateGroups = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
  }, [queryClient]);
  const { t } = useTranslation();

  const createMutation = useAppMutation({
    mutationFn: (args: { name: string; userId: string }) => GroupService.create({ name: args.name, userId: args.userId }),
    onSuccess: () => {
      feedback.success(t('groupCreated'));
      invalidateList();
    },
  });

  const updateMutation = useAppMutation({
    mutationFn: (args: { id: string; updates: Partial<ProductGroup> }) => GroupService.update(args.id, args.updates),
    onSuccess: () => {
      feedback.success(t('groupUpdated'));
      invalidateList();
    },
  });

  const deleteMutation = useAppMutation({
    mutationFn: (id: string) => GroupService.delete(id),
    onSuccess: () => {
      feedback.success(t('groupDeleted'));
      invalidateList();
    },
  });

  const setCoverMutation = useAppMutation({
    mutationFn: (args: { groupId: string; photoId: string | null }) => GroupService.setCover(args.groupId, args.photoId),
    onMutate: async (args) => {
      if (args.photoId) {
        queryClient.setQueryData(queryKeys.photos.detail(args.photoId), (oldData: import('#src/types/index.js').Photo | undefined) => {
           if (!oldData) return oldData;
           return { ...oldData, isGroupCover: true };
        });
        
        // Optimitically update photo list
        queryClient.setQueriesData({ queryKey: queryKeys.photos.lists() }, (oldData: unknown) => {
          const data = oldData as { pages?: Array<{ items: Photo[] }> };
          if (!data?.pages) return oldData;
          return {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              items: page.items.map((item) => {
                if (item.groupId === args.groupId) {
                  return { ...item, isGroupCover: item.id === args.photoId };
                }
                return item;
              })
            }))
          };
        });
      }
    },
    onSuccess: () => {
      feedback.success(t('setAsCoverSuccess') || 'Set as cover');
      invalidateList();
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
    }
  });

  const movePhotosMutation = useAppMutation({
    mutationFn: (args: { groupId: string; photoIds: string[] }) => GroupService.movePhotos(args.photoIds, args.groupId),
    onMutate: async (args) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.photos.lists() });
      const previousPhotosData = queryClient.getQueriesData({ queryKey: queryKeys.photos.lists() });

      queryClient.setQueriesData({ queryKey: queryKeys.photos.lists() }, (oldData: unknown) => {
        const data = oldData as { pages?: Array<{ items: Photo[] }> };
        if (!data?.pages) return oldData;
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => {
              if (args.photoIds.includes(item.id)) {
                return { ...item, groupId: args.groupId, isGroupCover: false };
              }
              return item;
            })
          }))
        };
      });

      clearSelection();
      return { previousPhotosData };
    },
    onError: (_err, _vars, context: { previousPhotosData?: Array<[import('@tanstack/react-query').QueryKey, unknown]> } | undefined) => {
      if (context?.previousPhotosData) {
        context.previousPhotosData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      feedback.error(t('mutationFailed') || '移動失敗，請重試');
    },
    onSuccess: (_, variables) => {
      feedback.success(t('addPhotosSuccess', variables.photoIds.length));
    },
    onSettled: () => {
      invalidateList();
      invalidateGroups();
    }
  });

  const dissolveMutation = useAppMutation({
    mutationFn: (groupId: string) => GroupService.ungroup(groupId),
    onSuccess: () => {
      feedback.success(t('groupDissolved'));
      invalidateList();
    },
  });

  const combineMutation = useAppMutation({
    mutationFn: async (args: { photoIds: string[]; targetGroupId?: string }) => {
      return GroupService.groupPhotos(args.photoIds, args.targetGroupId);
    },
    onMutate: async (args) => {
      // 1. Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.photos.lists() });

      // 2. Snapshot previous value
      const previousPhotosData = queryClient.getQueriesData({ queryKey: queryKeys.photos.lists() });

      // 3. Compute target group ID
      const targetGroupId = args.targetGroupId;

      // 4. Optimistically update photo list cache
      if (targetGroupId) {
        queryClient.setQueriesData({ queryKey: queryKeys.photos.lists() }, (oldData: unknown) => {
          const data = oldData as { pages?: Array<{ items: Photo[] }> };
          if (!data?.pages) return oldData;
          let hasAssignedCover = false;
          return {
            ...data,
            pages: data.pages.map((page) => {
              const newItems: any[] = [];
              for (const item of page.items) {
                if (args.photoIds.includes(item.id)) {
                  if (!hasAssignedCover) {
                    hasAssignedCover = true;
                    newItems.push({ 
                      ...item, 
                      groupId: targetGroupId, 
                      isGroupCover: true,
                      memberCount: args.photoIds.length
                    });
                  }
                } else {
                  newItems.push(item);
                }
              }
              return { ...page, items: newItems };
            })
          };
        });
      }

      // 5. Instantly clear selection and close toolbar
      clearSelection();

      return { previousPhotosData };
    },
    onError: (_err, _variables, context: { previousPhotosData?: Array<[import('@tanstack/react-query').QueryKey, unknown]> } | undefined) => {
      if (context?.previousPhotosData) {
        context.previousPhotosData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      invalidateList();
      invalidateGroups();
    }
  });

  const removePhotosMutation = useAppMutation({
    mutationFn: (args: { photoIds: string[]; groupId: string }) => GroupService.removePhotos(args.photoIds, args.groupId),
    onMutate: async (args) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.photos.lists() });
      const previousPhotosData = queryClient.getQueriesData({ queryKey: queryKeys.photos.lists() });

      queryClient.setQueriesData({ queryKey: queryKeys.photos.lists() }, (oldData: unknown) => {
        const data = oldData as { pages?: Array<{ items: Photo[] }> };
        if (!data?.pages) return oldData;
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => {
              if (args.photoIds.includes(item.id)) {
                return { ...item, groupId: null, isGroupCover: false };
              }
              return item;
            })
          }))
        };
      });

      clearSelection();
      return { previousPhotosData };
    },
    onError: (_err, _vars, context: { previousPhotosData?: Array<[import('@tanstack/react-query').QueryKey, unknown]> } | undefined) => {
      if (context?.previousPhotosData) {
        context.previousPhotosData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      feedback.error(t('mutationFailed') || '移出失敗，請重試');
    },
    onSuccess: () => {
      feedback.success(t('removedFromGroup') || '已成功移出照片群組');
    },
    onSettled: () => {
      invalidateList();
      invalidateGroups();
    }
  });

  return {
    create: createMutation,
    update: updateMutation,
    remove: deleteMutation,
    setCover: setCoverMutation,
    combine: combineMutation,
    movePhotos: movePhotosMutation,
    dissolve: dissolveMutation,
    removePhotos: removePhotosMutation,
    isPending: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || 
               setCoverMutation.isPending || combineMutation.isPending || movePhotosMutation.isPending || 
               dissolveMutation.isPending || removePhotosMutation.isPending,
  };
}


