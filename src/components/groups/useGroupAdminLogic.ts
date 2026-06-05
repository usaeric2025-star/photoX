import { useState, useMemo, useRef, useEffect } from "react";
import { Photo } from "../../types";
import { filterPhotosByMode } from "@/lib/filters/photoVisibility";
import { useAdminActions } from "@/features/admin/useAdminActions";
import {
  useAdminMode,
  useErrorHandler,
  useGroupPhotos,
  useUrlFilters
} from "@/hooks";
import { useUIStore, useShallow } from "@/store/useUIStore";
import { useDisclosure, useSessionStorage } from "@mantine/hooks";
import { useGroupDraft } from "./useGroupDraft";
import { useGroupActions } from "./useGroupActions";

export const useGroupAdminLogic = ({
  initialPhotoId,
}: {
  initialPhotoId?: string | null;
}) => {
  const isAdminMode = useAdminMode();
  const { filters, setGroupId } = useUrlFilters();
  const activeGroupId = filters.groupId;
  
  const { isMultiSelect, selectedIds, groupSettingsOpen, batchEditingIds, focusedGroupPhotoId, draggedPhotoId, processingIds, update } = useUIStore(
    useShallow((s) => ({ 
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
  const onUpdatePhoto = async (id: string, data: any) =>
    adminActions.updatePhoto(id, data);
  const onUpdatePhotosBulk = async (ids: string[], data: any) =>
    adminActions.batchUpdate.mutateAsync({ ids, updates: data });
  const onBatchAiAnalyze = (photos: Photo[]) => {};
  const onBatchEdit = (ids: string[]) => update({ batchEditingIds: ids });

  const { handleError } = useErrorHandler();

  const [groupScrollStr, setGroupScrollStr] = useSessionStorage<string>({
    key: `group_scroll_${activeGroupId || 'default'}`,
    defaultValue: '0'
  });

  const [showGroupSettings, { open, close }] = useDisclosure(false);
  const setShowGroupSettings = (show: boolean) => show ? open() : close();
  const [currentHighlightId, setCurrentHighlightId] = useState<string | null>(null);
  const virtualGridRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: dbGroupPhotosPages, isLoading: isGroupPhotosLoading } =
    useGroupPhotos(activeGroupId, isAdminMode);
  
  const dbGroupPhotos = useMemo(
    () => dbGroupPhotosPages?.pages.flatMap(p => p.photos) ?? [],
    [dbGroupPhotosPages],
  );

  const activeGroupPhotos = useMemo(() => {
    if (!activeGroupId) return [];
    let groupPhotos = dbGroupPhotos;
    
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
  }, [activeGroupId, dbGroupPhotos, processingIds, isAdminMode]);

  const {
    groupData,
    setGroupData,
    isGroupDataLoading,
    handleUpdateGroupData,
    removeDraftGroup
  } = useGroupDraft(activeGroupId, dbGroupPhotos, onUpdatePhoto, handleError);

  const {
    setCover,
    getBulkRemoveInfo,
    performBulkRemove,
    persistPhotoChange,
    handleToggleTag,
    handleBatchUpdateDimensions,
    handleReorder,
    handleBulkAction
  } = useGroupActions(
    activeGroupId,
    groupData,
    setGroupData,
    activeGroupPhotos,
    dbGroupPhotos,
    selectedIds,
    update,
    setGroupId,
    removeDraftGroup,
    onUpdatePhoto,
    onUpdatePhotosBulk,
    onBatchAiAnalyze,
    onBatchEdit,
    handleError
  );

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
      if (groupScrollStr !== '0' && !initialPhotoId) {
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop = parseInt(groupScrollStr, 10);
          }
        }, 50);
      }
    }
  }, [activeGroupId, initialPhotoId, groupScrollStr]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (activeGroupId) {
      setGroupScrollStr(e.currentTarget.scrollTop.toString());
    }
  };

  useEffect(() => {
    if (isMultiSelect && selectedIds.length === 0) {
      update({ isMultiSelect: false });
    }
  }, [selectedIds.length, isMultiSelect, update]);

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
    isGroupPhotosLoading
  };
};
