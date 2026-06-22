import { ErrorFactory } from "@/lib/error/ErrorFactory";
import { useState, useEffect, useCallback } from "react";
import { useAppQueryClient as useQueryClient } from '@/lib/query';
import { ProductGroup, Photo } from "@/types";
import { useGroupDetail } from "@/hooks";
import { useAuth } from '@/lib/store';
import { upsertGroup } from "@/services/group/commands";
import { useSessionStorage } from '@/hooks/core/useSessionStorage';
import { queryKeys } from '@/lib/query/keys';

export const useGroupDraft = (
  activeGroupId: string | null,
  dbGroupPhotos: Photo[] | undefined,
  onUpdatePhoto: (id: string, data: Partial<Photo>) => Promise<unknown>
) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [groupData, setGroupData] = useState<ProductGroup | null>(null);
  const { data: queriedGroupData, isPending: isGroupDataPending } =
    useGroupDetail({ groupId: activeGroupId, isAdmin: true });

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
        cover_photo_id: null,
        user_id: user?.id || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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
        queryClient.invalidateQueries({
          queryKey: queryKeys.groups.detail(activeGroupId, true),
        });
        removeDraftGroup();

        if (updates.hasOwnProperty("is_hidden")) {
          const is_hidden = updates.is_hidden;
          if (dbGroupPhotos && dbGroupPhotos.length > 0 && onUpdatePhoto) {
            await Promise.all(
              dbGroupPhotos.map((p) => onUpdatePhoto(p.id, { is_hidden })),
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
      queryClient,
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
