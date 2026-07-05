import { ErrorFactory } from "#lib/error/ErrorFactory.js";
import { useState, useEffect, useCallback } from "react";
import { queryClient } from '#lib/query/index.js';
import { ProductGroup, Photo } from '#src/types/index.js';
import { useGroupDetail } from '#src/hooks/index.js';
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
  const { user } = useAuth();

  const [groupData, setGroupData] = useState<ProductGroup | null>(null);
  const { group: queriedGroupData, isLoading: isGroupDataPending } =
    useGroupDetail(activeGroupId, true);

  // Sync with cloud data when it changes
  useEffect(() => {
    if (queriedGroupData) {
      setGroupData(queriedGroupData);
    } else if (activeGroupId && !isGroupDataPending) {
      setGroupData({
        id: activeGroupId,
        name: "GROUP",
        description: "",
        coverPhotoId: null,
        userId: user?.id || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active'
      });
    } else {
      setGroupData(null);
    }
  }, [queriedGroupData, activeGroupId, isGroupDataPending, user]);

  const handleUpdateGroupData = useCallback(
    async (updates: Partial<ProductGroup>) => {
      if (!activeGroupId || !groupData) return;

      const nextGroupData = { ...groupData, ...updates };
      setGroupData(nextGroupData);

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
      groupData,
      onUpdatePhoto,
      dbGroupPhotos
    ],
  );

  return {
    groupData,
    setGroupData,
    isGroupDataPending,
    handleUpdateGroupData
  };
};
