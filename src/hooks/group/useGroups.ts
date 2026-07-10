import { useCallback, useMemo } from 'react';
import { useAppQuery, useAppMutation, queryClient } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';
import { STALE_TIMES } from '#lib/query/config.js';
import { ProductGroup, Photo } from '#src/types/index.js';
import { 
  createGroup, 
  updateGroup, 
  deleteGroup, 
  setPhotoAsGroupCover, 
  groupPhotos,
  movePhotosToGroup,
  removePhotosFromGroup,
  ungroupPhotos,
  upsertGroup 
} from './commands.js';
import { getGroupById } from './queries.js';
import { useSelectionActions } from '../../hooks/selection/useSelection.js';
import { usePhotos, useInvalidatePhotos } from '../photo/usePhotos.js';
import { useTranslation } from '../core/index.js';
import { showToast } from '#lib/ui/toast.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { useAuth } from '#lib/store/index.js';
import { useFilters } from '#src/features/filters/index.js';

// --- Detail Hook ---

function useGroupDetail(id: string | null, isAdmin = false) {
  const { data: group, isLoading, error } = useAppQuery(
    id ? queryKeys.groups.detail(id, isAdmin) : null,
    async () => {
      if (!id) return null;
      return getGroupById(id, isAdmin ? 'admin' : 'public');
    },
    {
      staleTime: STALE_TIMES.LONG,
    }
  );

  return {
    group,
    isLoading,
    error
  };
}

// --- List/Data Hook ---

interface UseGroupDataOptions {
  groupId: string | null;
  isAdmin: boolean;
}

export function useGroupData({ groupId, isAdmin }: UseGroupDataOptions) {
  const { search, category, tags, sort } = useFilters();
  
  const { 
    group, 
    isLoading: isGroupPending, 
    error: groupError 
  } = useGroupDetail(groupId, isAdmin);

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
    onlyGroupsCover: false, // Ensure we see all photos in the group
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

// --- Mutations Hook ---

export function useGroupMutations() {
  const { clearSelection } = useSelectionActions();
  const { invalidateList } = useInvalidatePhotos();
  const { t, uiTranslations: labels } = useTranslation();

  const createMutation = useAppMutation({
    mutationFn: (args: { name: string; userId: string }) => 
      createGroup({ name: args.name, userId: args.userId }),
    onSuccess: () => {
      showToast.success(t('groupCreated'));
      invalidateList();
    },
  });

  const updateMutation = useAppMutation({
    mutationFn: (args: { id: string; updates: Partial<ProductGroup> }) => 
      updateGroup(args.id, args.updates),
    onSuccess: () => {
      showToast.success(t('groupUpdated'));
      invalidateList();
    },
  });

  const deleteMutation = useAppMutation({
    mutationFn: deleteGroup,
    onSuccess: () => {
      showToast.success(t('groupDeleted'));
      invalidateList();
    },
  });

  const setCoverMutation = useAppMutation({
    mutationFn: (args: { groupId: string; photoId: string }) => {
      return setPhotoAsGroupCover(args.photoId, args.groupId);
    },
    onSuccess: () => {
      showToast.success(t('setCoverSuccess'));
      invalidateList();
    },    onError: () => { invalidateList(); }
  });

  const movePhotosMutation = useAppMutation({
    mutationFn: (args: { groupId: string; photoIds: string[] }) => {
      return movePhotosToGroup(args.photoIds, args.groupId);
    },
    onSuccess: (_, variables) => {
      showToast.success(t('addPhotosSuccess', variables.photoIds.length));
      clearSelection();
      invalidateList();
    },    onError: () => { invalidateList(); }
  });

  const dissolveMutation = useAppMutation({
    mutationFn: async (groupId: string) => {
      return ungroupPhotos(groupId);
    },
    onSuccess: () => {
      showToast.success(t('groupDissolved'));
      invalidateList();
    },
  });

  const combineMutation = useAppMutation({
    mutationFn: async (args: { photoIds: string[]; targetGroupId?: string }) => {
      return await groupPhotos(args.photoIds, args.targetGroupId);
    },
    onSuccess: (data: { newGroupId: string }, variables) => {
      const count = variables.photoIds.length;
      showToast.success(t('mergePhotosSuccess', count));
      clearSelection();
      invalidateList();
    },    onError: () => { invalidateList(); }
  });

  return {
    create: createMutation,
    update: updateMutation,
    remove: deleteMutation,
    setCover: setCoverMutation,
    combine: combineMutation,
    movePhotos: movePhotosMutation,
    dissolve: dissolveMutation,
    isPending: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || 
                setCoverMutation.isPending || combineMutation.isPending || movePhotosMutation.isPending || 
                dissolveMutation.isPending,
  };
}

/**
 * Hook to manage local editing state for a group, with auto-save to cloud
 */
export const useGroupEditState = (
  activeGroupId: string | null,
  dbGroupPhotos: Photo[] | undefined,
  onUpdatePhoto: (id: string, data: Partial<Photo>) => Promise<unknown>
) => {
  const user = useAuth(s => s.user);

  const { group: queriedGroupData, isLoading: isGroupDataPending } =
    useGroupDetail(activeGroupId, true);

  const initialGroupData = queriedGroupData || (activeGroupId && !isGroupDataPending ? {
    id: activeGroupId,
    name: "GROUP",
    description: "",
    coverPhotoId: null,
    userId: user?.id || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'active'
  } : null) as ProductGroup | null;

  const handleUpdateGroupData = useCallback(
    async (updates: Partial<ProductGroup>) => {
      if (!activeGroupId || !initialGroupData) return;

      const nextGroupData = { ...initialGroupData, ...updates };

      try {
        await upsertGroup(nextGroupData);
        await queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(activeGroupId, true) });

        if (updates.hasOwnProperty("isHidden")) {
          const isHidden = updates.isHidden;
          if (dbGroupPhotos && dbGroupPhotos.length > 0 && onUpdatePhoto) {
            await Promise.all(
              dbGroupPhotos.map((p) => onUpdatePhoto(p.id, { isHidden })),
            );
          }
        }
      } catch (err: unknown) {
        throw err;
      }
    },
    [
      activeGroupId,
      initialGroupData,
      onUpdatePhoto,
      dbGroupPhotos
    ],
  );

  return {
    groupData: initialGroupData,
    isGroupDataPending,
    handleUpdateGroupData
  };
};

/**
 * Legacy/Component aliases for SelectionToolbar
 */
export const useGroupPhotosMutation = () => {
  const { combine, isPending } = useGroupMutations();
  return { 
    mutateAsync: combine.mutateAsync,
    isPending 
  };
};

/**
 * Legacy/Component aliases for SelectionToolbar
 */
export const useRemoveFromGroupMutation = () => {
  const { isPending } = useGroupMutations();
  const { invalidateList } = useInvalidatePhotos();
  const { t } = useTranslation();

  return { 
    mutateAsync: (args: { photoIds: string[]; groupId?: string }) => {
      if (!args.groupId) throw new Error('groupId is required to remove photos from group');
      
      return removePhotosFromGroup(args.photoIds, args.groupId).then((res) => {
          showToast.success(t('removePhotosSuccess', args.photoIds.length));
          invalidateList();
          return res;
      }).catch(err => {
          invalidateList();
          throw err;
      });
    },
    isPending 
  };
};
