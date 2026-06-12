import { ErrorFactory } from "@/lib/error/ErrorFactory";
import { Photo, Dimension } from "@/types";
import { useGroupCoverMutation, useRemoveFromGroupMutation } from "@/hooks";
import { showToast } from '@/lib/ui/toast';

export const useGroupActions = (
  activeGroupId: string | null,
  groupData: any,
  setGroupData: (data: any) => void,
  activeGroupPhotos: Photo[],
  dbGroupPhotos: Photo[] | undefined,
  selectedIds: string[],
  update: (state: any) => void,
  setGroupId: (id: string | null) => void,
  removeDraftGroup: () => void,
  onUpdatePhoto: (id: string, data: any) => Promise<any>,
  onUpdatePhotosBulk: (ids: string[], data: any) => Promise<any>,
  onBatchAiAnalyze: (photos: Photo[]) => void,
  onBatchEdit: (ids: string[]) => void
) => {
  const { mutate: mutateSetCover } = useGroupCoverMutation();
  const { mutateAsync: removePhotosBatch } = useRemoveFromGroupMutation();

  const setCover = async (photoId: string) => {
      const isAlreadyCover = groupData?.cover_photo_id === photoId;
      const targetPhotoId = isAlreadyCover ? null : photoId;
      
      mutateSetCover({
        photoId: targetPhotoId,
        groupId: activeGroupId || undefined,
      });

      if (!isAlreadyCover) {
        showToast.success(groupData?.name?.zh ? `已将照片设为 "${groupData.name.zh}" 的封面` : '已成功设置合组封面');
      } else {
        showToast.info('已取消合组封面');
      }

      setGroupData((prev: any) =>
        prev
          ? {
              ...prev,
              cover_photo_id: targetPhotoId,
            }
          : prev,
      );
    };

  const getBulkRemoveInfo = (ids: string[]) => {
      const allGroupPhotos = dbGroupPhotos || [];
      const remainingCount = allGroupPhotos.length - ids.length;
      const isDissolving = remainingCount <= 1;

      return {
        isDissolving,
        title: isDissolving ? "确认解散群组" : "确认批量移出",
        message: isDissolving
          ? `移出后该组将只剩 ${remainingCount} 张照片。系统会自动将剩余照片也移出并解散群组。确定继续吗？`
          : `确定要将选中的 ${ids.length} 张照片移出群组吗？`,
      };
    };

  const performBulkRemove = async (ids: string[]) => {
      const allGroupPhotos = dbGroupPhotos || [];
      const remainingCount = allGroupPhotos.length - ids.length;
      const isDissolving = remainingCount <= 1;

      try {
        update({ isMultiSelect: false, selectedIds: [] });

        if (activeGroupId) {
          const targetIds = isDissolving
            ? allGroupPhotos.map((p) => p.id)
            : ids;
          await removePhotosBatch({
            photoIds: targetIds,
            groupId: activeGroupId,
          });
          removeDraftGroup();

          if (isDissolving) {
            setGroupId(null);
          }
        }
      } catch (err: unknown) {
        // Handled by mutation
      }
    };

  const persistPhotoChange = async (photoId: string, updates: Partial<Photo>) => {
      try {
        if (onUpdatePhoto) {
          await onUpdatePhoto(photoId, updates);
        } else {
          const { updatePhoto: serviceUpdatePhoto } =
            await import("@/services/photo");
          await serviceUpdatePhoto(photoId, updates);
        }
      } catch (err: unknown) {
        ErrorFactory.handle(err, "保存照片修改失败");
      }
    };

  const handleToggleTag = (photo: Photo, tagId: string) => {
      const currentTags = Array.isArray(photo.tags) ? photo.tags : [];
      const nextTags = currentTags.some(t => String(t.id) === tagId)
        ? currentTags.filter((t) => String(t.id) !== tagId)
        : [...currentTags, { id: tagId, name: '', aliases: [] }];

      persistPhotoChange(photo.id, { tags: nextTags });
    };

  const handleBatchUpdateDimensions = async (newDims: Dimension[]) => {
      if (!activeGroupId || newDims.length === 0) return;

      try {
        if (onUpdatePhotosBulk) {
          await onUpdatePhotosBulk(
            activeGroupPhotos.map((p) => p.id),
            { dimensions: newDims },
          );
        } else if (onUpdatePhoto) {
          await Promise.all(
            activeGroupPhotos.map((p) =>
              onUpdatePhoto(p.id, { dimensions: newDims }),
            ),
          );
        } else {
          const { updatePhoto: serviceUpdatePhoto } =
            await import("@/services/photo");
          await Promise.all(
            activeGroupPhotos.map((p) =>
              serviceUpdatePhoto(p.id, { dimensions: newDims }),
            ),
          );
        }
      } catch (err: unknown) {
        ErrorFactory.handle(err, "批量更新尺寸失败");
        throw err;
      }
    };

  const handleReorder = async (draggedId: string, targetId: string) => {
      if (draggedId === targetId) return;

      const dragIdx = activeGroupPhotos.findIndex((p) => p.id === draggedId);
      const hoverIdx = activeGroupPhotos.findIndex((p) => p.id === targetId);

      if (dragIdx === -1 || hoverIdx === -1) return;

      const nextGroupPhotos = [...activeGroupPhotos];
      const [draggedPhoto] = nextGroupPhotos.splice(dragIdx, 1);
      nextGroupPhotos.splice(hoverIdx, 0, draggedPhoto);

      const updatedPhotosWithOrder = nextGroupPhotos.map((p, index) => ({
        ...p,
        group_order: index
      }));

      try {
        const { updatePhoto: serviceUpdatePhoto } =
          await import("@/services/photo");
        await Promise.all(
          updatedPhotosWithOrder.map((p) =>
            serviceUpdatePhoto(p.id, { group_order: p.group_order }),
          ),
        );
      } catch (err: unknown) {
        ErrorFactory.handle(err, "保存排序失败");
        throw err;
      }
    };

  const handleBulkAction = async (action: "ai" | "remove" | "batch") => {
      if (selectedIds.length === 0) return;

      if (action === "ai") {
        const targetPhotos = activeGroupPhotos.filter((p) =>
          selectedIds.includes(p.id),
        );
        onBatchAiAnalyze?.(targetPhotos);
        update({ isMultiSelect: false, selectedIds: [] });
      } else if (action === "remove") {
        // Handled by confirmBulkRemove
      } else if (action === "batch") {
        onBatchEdit?.(selectedIds);
        update({ isMultiSelect: false, selectedIds: [] });
      }
    };

  return {
    setCover,
    getBulkRemoveInfo,
    performBulkRemove,
    persistPhotoChange,
    handleToggleTag,
    handleBatchUpdateDimensions,
    handleReorder,
    handleBulkAction
  };
};
