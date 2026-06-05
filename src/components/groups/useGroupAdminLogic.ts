import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Photo, ProductGroup, Dimension, DialogData } from "../../types";
import { filterPhotosByMode } from "@/lib/filters/photoVisibility";
import { useAdminActions } from "@/features/admin/useAdminActions";
import { saveGroup as saveGroupToCloud } from "@/services/group/commands";
import { updatePhotosGroup as updatePhotosGroupInCloud } from "@/services/photo/commands";
import { isErr } from "@/lib/errorFactory";
import {
  useGroupCoverMutation,
  useRemoveFromGroupMutation,
  useAdminMode,
  useErrorHandler,
  useGroupDetail,
  useAuth,
  useGroupPhotos,
  useUrlFilters
} from "@/hooks";
import { useUIStore, useShallow } from "@/store/useUIStore";
import { groupKeys } from "@/lib/queryKeys";
import { useDisclosure } from "@mantine/hooks";

export const useGroupAdminLogic = ({
  initialPhotoId,
}: {
  initialPhotoId?: string | null;
}) => {
  const { user } = useAuth();
  const isAdminMode = useAdminMode();
  const queryClient = useQueryClient();
  const { filters, setGroupId } = useUrlFilters();
  const activeGroupId = filters.groupId;
  
  const { appLang, isMultiSelect, selectedIds, groupSettingsOpen, batchEditingIds, focusedGroupPhotoId, draggedPhotoId, processingIds, update } = useUIStore(
    useShallow((s) => ({ 
        appLang: s.appLang, 
        isMultiSelect: s.isMultiSelect, 
        selectedIds: s.selectedIds, 
        groupSettingsOpen: s.groupSettingsOpen, 
        batchEditingIds: s.batchEditingIds, 
        focusedGroupPhotoId: s.focusedGroupPhotoId, 
        draggedPhotoId: s.draggedPhotoId,
        processingIds: s.processingIds,
        update: s.update
    })),
  );

  const adminActions = useAdminActions();
  const onUpdatePhoto = (id: string, data: any) =>
    adminActions.updatePhoto(id, data);
  const onUpdatePhotosBulk = (ids: string[], data: any) =>
    adminActions.batchUpdate.mutateAsync({ ids, updates: data });
  const onBatchAiAnalyze = (photos: Photo[]) => {};
  const onBatchEdit = (ids: string[]) => update({ batchEditingIds: ids });

  const { handleError } = useErrorHandler();

  const { mutate: mutateSetCover } = useGroupCoverMutation();
  const { mutateAsync: removePhotosBatch } = useRemoveFromGroupMutation();

  const [groupData, setGroupData] = useState<ProductGroup | null>(null);
  const { data: queriedGroupData, isLoading: isGroupDataLoading } =
    useGroupDetail(activeGroupId);

  const setCover = useCallback(
    async (photoId: string) => {
      const isAlreadyCover = groupData?.cover_photo_id === photoId;
      const targetPhotoId = isAlreadyCover ? null : photoId;
      mutateSetCover({
        photoId: targetPhotoId,
        groupId: activeGroupId || undefined,
      });
      setGroupData((prev) =>
        prev
          ? {
              ...prev,
              cover_photo_id: targetPhotoId,
            }
          : prev,
      );
    },
    [mutateSetCover, activeGroupId, groupData?.cover_photo_id],
  );

  // const [isMultiSelectMode, update] = useState(false);
  // const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [showGroupSettings, { open, close }] = useDisclosure(false);
  const setShowGroupSettings = (show: boolean) => show ? open() : close();
  const [currentHighlightId, setCurrentHighlightId] = useState<string | null>(
    null,
  );
  const virtualGridRef = useRef<any>(null);

  const { data: dbGroupPhotosPages, isLoading: isGroupPhotosLoading } =
    useGroupPhotos(activeGroupId, isAdminMode);
  const dbGroupPhotos = useMemo(
    () => dbGroupPhotosPages?.pages.flatMap(p => p.photos) ?? [],
    [dbGroupPhotosPages],
  );

  const activeGroupPhotos = useMemo(() => {
    if (!activeGroupId) return [];
    let groupPhotos = dbGroupPhotos;
    
    // Filter out processing if any
    if (processingIds && processingIds.length > 0) {
        groupPhotos = groupPhotos.filter(p => !processingIds.includes(p.id));
    }

    return filterPhotosByMode(groupPhotos, isAdminMode).sort((a, b) => {
      if (a.is_group_cover) return -1;
      if (b.is_group_cover) return 1;
      if (a.group_order !== undefined && b.group_order !== undefined) {
        return a.group_order - b.group_order;
      }
      if (a.group_order !== undefined) return -1;
      if (b.group_order !== undefined) return 1;
      return (a.item_code || "").localeCompare(b.item_code || "");
    });
  }, [activeGroupId, dbGroupPhotos, isAdminMode]);

  const groupCover = useMemo(
    () =>
      activeGroupPhotos.find((p) => p.is_group_cover) || activeGroupPhotos[0],
    [activeGroupPhotos],
  );

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeGroupId && initialPhotoId) {
      setCurrentHighlightId(initialPhotoId);
      const timer = setTimeout(() => setCurrentHighlightId(null), 5000);

      const index = activeGroupPhotos.findIndex((p) => p.id === initialPhotoId);
      if (index !== -1) {
        setTimeout(() => {
          virtualGridRef.current?.scrollToIndex({
            index,
            align: "center",
            behavior: "auto",
          });
        }, 100);
      }
      return () => clearTimeout(timer);
    }
  }, [activeGroupId, initialPhotoId, activeGroupPhotos]);

  useEffect(() => {
    if (activeGroupId && containerRef.current) {
      const saved = sessionStorage.getItem(`group_scroll_${activeGroupId}`);
      if (saved && !initialPhotoId) {
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop = parseInt(saved, 10);
          }
        }, 50);
      }
    }
  }, [activeGroupId, initialPhotoId]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (activeGroupId) {
      sessionStorage.setItem(
        `group_scroll_${activeGroupId}`,
        e.currentTarget.scrollTop.toString(),
      );
    }
  };

  useEffect(() => {
    if (activeGroupId) {
      const draft = sessionStorage.getItem(`draft_group_${activeGroupId}`);
      if (draft) {
        try {
          setGroupData(JSON.parse(draft));
          return;
        } catch (e) {
          // ignore
        }
      }
    }

    if (queriedGroupData) {
      setGroupData(queriedGroupData);
    } else if (activeGroupId && !isGroupDataLoading) {
      setGroupData({
        id: activeGroupId,
        name: "",
        description: "",
        colors: [],
        materials: [],
        cover_photo_id: null,
        user_id: user?.id || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()});
    } else {
      setGroupData(null);
    }
  }, [queriedGroupData, activeGroupId, isGroupDataLoading, user]);

  useEffect(() => {
    if (activeGroupId && groupData) {
      sessionStorage.setItem(
        `draft_group_${activeGroupId}`,
        JSON.stringify(groupData),
      );
    }
  }, [groupData, activeGroupId]);

  useEffect(() => {
    if (isMultiSelect && selectedIds.length === 0) {
      update({ isMultiSelect: false });
    }
  }, [selectedIds.length, isMultiSelect]);

  const performBulkRemove = useCallback(
    async (ids: string[]) => {
      const allGroupPhotos = dbGroupPhotos;
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
          sessionStorage.removeItem(`draft_group_${activeGroupId}`);

          if (isDissolving) {
            setGroupId(null);
          }
        }
      } catch (err: any) {
        handleError(err, "操作失败");
      }
    },
    [
      handleError,
      dbGroupPhotos,
      activeGroupId,
      removePhotosBatch,
      setGroupId,
      update
    ],
  );

  const getBulkRemoveInfo = useCallback(
    (ids: string[]) => {
      const allGroupPhotos = dbGroupPhotos;
      const remainingCount = allGroupPhotos.length - ids.length;
      const isDissolving = remainingCount <= 1;

      return {
        isDissolving,
        title: isDissolving ? "确认解散群组" : "确认批量移出",
        message: isDissolving
          ? `移出后该组将只剩 ${remainingCount} 张照片。系统会自动将剩余照片也移出并解散群组。确定继续吗？`
          : `确定要将选中的 ${ids.length} 张照片移出群组吗？`,
      };
    },
    [dbGroupPhotos],
  );

  const persistPhotoChange = useCallback(
    async (photoId: string, updates: Partial<Photo>) => {
      try {
        if (onUpdatePhoto) {
          await onUpdatePhoto(photoId, updates);
        } else {
          const { updatePhoto: serviceUpdatePhoto } =
            await import("@/services/photo/commands");
          await serviceUpdatePhoto(photoId, updates);
        }
      } catch (err: any) {
        handleError(err, "保存照片修改失败");
      }
    },
    [handleError, onUpdatePhoto],
  );

  const handleUpdateGroupData = useCallback(
    async (updates: Partial<ProductGroup>) => {
      if (!activeGroupId || !groupData) return;

      const nextGroupData = { ...groupData, ...updates };
      setGroupData(nextGroupData);
      sessionStorage.setItem(
        `draft_group_${activeGroupId}`,
        JSON.stringify(nextGroupData),
      );

      try {
        const result = await saveGroupToCloud(nextGroupData);
        if (isErr(result)) {
          handleError(result.error, "更新群組資料失敗");
          return;
        }
        queryClient.invalidateQueries({
          queryKey: groupKeys.detail(activeGroupId),
        });
        sessionStorage.removeItem(`draft_group_${activeGroupId}`);

        if (updates.hasOwnProperty("is_hidden")) {
          const is_hidden = updates.is_hidden;
          const groupPhotos = dbGroupPhotos;
          if (groupPhotos.length > 0 && onUpdatePhoto) {
            await Promise.all(
              groupPhotos.map((p) => onUpdatePhoto(p.id, { is_hidden })),
            );
          }
        }
      } catch (err: any) {
        handleError(err, "更新群組資料失敗");
        throw err;
      }
    },
    [
      activeGroupId,
      groupData,
      handleError,
      onUpdatePhoto,
      onUpdatePhotosBulk,
      dbGroupPhotos,
      queryClient,
    ],
  );

  const handleToggleTag = useCallback(
    (photo: Photo, tagId: string) => {
      const currentTags = Array.isArray(photo.tag_ids) ? photo.tag_ids : [];
      const nextTags = currentTags.includes(tagId)
        ? currentTags.filter((id) => id !== tagId)
        : [...currentTags, tagId];

      persistPhotoChange(photo.id, { tag_ids: nextTags });
    },
    [persistPhotoChange],
  );

  const handleBatchUpdateDimensions = useCallback(
    async (newDims: Dimension[]) => {
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
            await import("@/services/photo/commands");
          await Promise.all(
            activeGroupPhotos.map((p) =>
              serviceUpdatePhoto(p.id, { dimensions: newDims }),
            ),
          );
        }
      } catch (err: any) {
        handleError(err, "批量更新尺寸失败");
        throw err;
      }
    },
    [
      activeGroupId,
      activeGroupPhotos,
      handleError,
      onUpdatePhoto,
      onUpdatePhotosBulk,
    ],
  );

  const handleReorder = useCallback(
    async (draggedId: string, targetId: string) => {
      if (draggedId === targetId) return;

      const dragIdx = activeGroupPhotos.findIndex((p) => p.id === draggedId);
      const hoverIdx = activeGroupPhotos.findIndex((p) => p.id === targetId);

      if (dragIdx === -1 || hoverIdx === -1) return;

      const nextGroupPhotos = [...activeGroupPhotos];
      const [draggedPhoto] = nextGroupPhotos.splice(dragIdx, 1);
      nextGroupPhotos.splice(hoverIdx, 0, draggedPhoto);

      const updatedPhotosWithOrder = nextGroupPhotos.map((p, index) => ({
        ...p,
        group_order: index}));

      try {
        const { updatePhoto: serviceUpdatePhoto } =
          await import("@/services/photo/commands");
        await Promise.all(
          updatedPhotosWithOrder.map((p) =>
            serviceUpdatePhoto(p.id, { group_order: p.group_order }),
          ),
        );
      } catch (err: any) {
        handleError(err, "保存排序失败");
        throw err;
      }
    },
    [activeGroupPhotos, handleError],
  );

  const handleBulkAction = useCallback(
    async (action: "ai" | "remove" | "batch") => {
      if (selectedIds.length === 0) return;

      if (action === "ai") {
        const targetPhotos = activeGroupPhotos.filter((p) =>
          selectedIds.includes(p.id),
        );
        onBatchAiAnalyze?.(targetPhotos);
        update({ isMultiSelect: false, selectedIds: [] });
      } else if (action === "remove") {
        // Handled by component layer via confirmBulkRemove callback
      } else if (action === "batch") {
        onBatchEdit?.(selectedIds);
        update({ isMultiSelect: false, selectedIds: [] });
      }
    },
    [
      activeGroupPhotos,
      onBatchAiAnalyze,
      onBatchEdit,
      selectedIds,
      update
    ],
  );

  return {
    focusedGroupPhotoId, isMultiSelect, selectedIds, draggedPhotoId, showGroupSettings, setShowGroupSettings, groupSettingsOpen, batchEditingIds,
    groupData,
    setGroupData,
    isGroupDataLoading,
    activeGroupPhotos,
    containerRef,
    virtualGridRef,
    currentHighlightId,
    handleScroll,
    confirmBulkRemove: getBulkRemoveInfo,
    performBulkRemove,
    persistPhotoChange,
    handleUpdateGroupData,
    handleToggleTag,
    handleBatchUpdateDimensions,
    handleReorder,
    handleBulkAction,
    setCover,
    handleError,
    isGroupPhotosLoading};
};
