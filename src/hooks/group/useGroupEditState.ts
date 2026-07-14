import { useCallback } from 'react';
import { useAuth } from '#lib/store/index.js';
import { queryClient } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';
import { ProductGroup, Photo } from '#src/types/index.js';
import { GroupService } from './service.js';
import { useGroupDetail } from './useGroupDetail.js';

/**
 * useGroupEditState
 * 
 * 處理群組編輯過程中的中間狀態與級聯更新邏輯。
 */
export const useGroupEditState = (
  activeGroupId: string | null,
  dbGroupPhotos: Photo[] | undefined,
  onUpdatePhoto: (id: string, data: Partial<Photo>) => Promise<unknown>
) => {
  const user = useAuth(s => s.user);
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

      if (updates.hasOwnProperty("isHidden")) {
        const isHidden = updates.isHidden;
        if (dbGroupPhotos && dbGroupPhotos.length > 0 && onUpdatePhoto) {
          await Promise.all(dbGroupPhotos.map((p) => onUpdatePhoto(p.id, { isHidden })));
        }
      }
    } catch (err) {
      throw err;
    }
  }, [activeGroupId, initialGroupData, onUpdatePhoto, dbGroupPhotos]);

  return {
    groupData: initialGroupData,
    isGroupDataPending,
    handleUpdateGroupData
  };
};
