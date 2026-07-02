import { ErrorFactory } from "#lib/error/ErrorFactory.js";
import { useState, useEffect, useCallback } from "react";
import { appQuery } from '#lib/query/index.js';
import { ProductGroup, Photo } from '#src/types/index.js';
import { useGroupDetail } from '#src/hooks/index.js';
import { useAuth } from '#lib/store/index.js';
import { upsertGroup } from "#src/services/group/commands.js";
import { useSessionStorage } from '#src/hooks/core/useSessionStorage.js';
import { queryKeys } from '#lib/query/keys.js';

export const useGroupDraft = (
  activeGroupId: string | null,
  dbGroupPhotos: Photo[] | undefined,
  onUpdatePhoto: (id: string, data: Partial<Photo>) => Promise<unknown>
) => {
  const { user } = useAuth();

  const [groupData, setGroupData] = useState<ProductGroup | null>(null);
  const { group: queriedGroupData, isLoading: isGroupDataPending } =
    useGroupDetail(activeGroupId, true);

  const [draftGroup, setDraftGroup, removeDraftGroup] = useSessionStorage<ProductGroup | null>({
    key: `draft_group_${activeGroupId || 'default'}`,
    defaultValue: null
  });

  useEffect(() => {
    if (activeGroupId) {
      if (draftGroup) {
        try {
          setGroupData(draftGroup);
          return;
        } catch (e) {
          // ignore
        }
      }
    }

    if (queriedGroupData) {
      setGroupData(queriedGroupData);
    } else if (activeGroupId && !isGroupDataPending) {
      setGroupData({
        id: activeGroupId,
        name: "",
        description: "",
        coverPhotoId: null,
        userId: user?.id || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'confirmed'
      });
    } else {
      setGroupData(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queriedGroupData, activeGroupId, isGroupDataPending, user]);

  useEffect(() => {
    if (activeGroupId && groupData) {
      setDraftGroup(groupData);
    }
  }, [groupData, activeGroupId, setDraftGroup]);

  const handleUpdateGroupData = useCallback(
    async (updates: Partial<ProductGroup>) => {
      if (!activeGroupId || !groupData) return;

      const nextGroupData = { ...groupData, ...updates };
      setGroupData(nextGroupData);
      setDraftGroup(nextGroupData);

      try {
        await upsertGroup(nextGroupData);
        await appQuery.mutate(queryKeys.groups.detail(activeGroupId, true));
        removeDraftGroup();

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
      dbGroupPhotos,
      setDraftGroup,
      removeDraftGroup
    ],
  );

  return {
    groupData,
    setGroupData,
    isGroupDataPending,
    handleUpdateGroupData,
    setDraftGroup,
    removeDraftGroup
  };
};
