import { ErrorFactory } from "#lib/error/ErrorFactory.js";
import { useCallback } from "react";
import { queryClient } from '#lib/query/index.js';
import { ProductGroup, Photo } from '#src/types/index.js';
import { useGroupDetail } from './useGroups.js';
import { useAuth } from '#lib/store/index.js';
import { upsertGroup } from "#src/services/group/commands.js";
import { queryKeys } from '#lib/query/keys.js';

/**
 * Hook to manage local editing state for a group, with auto-save to cloud
 * but NO session storage temporary persistence as per user requirement.
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
        ErrorFactory.handleError(err, "更新群組資料失敗");
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
