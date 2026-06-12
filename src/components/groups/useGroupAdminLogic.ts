import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { useState, useRef, useEffect, useMemo } from "react";
import { Photo } from "../../types";
import { filterPhotosByMode } from "@/lib/filters/photoVisibility";
import { useAdminMaintenance } from "@/hooks/admin/useAdminMaintenance";
import {
  useAdminMode,
  useGroupPhotos,
  useUrlFilters
} from "@/hooks";
import { useUIStore, useShallow } from "@/store/useUIStore";
import { useDisclosure } from '@/hooks/core/useDisclosure';
import { useSessionStorage } from '@/hooks/core/useSessionStorage';
import { useGroupDraft } from "./useGroupDraft";
import { useGroupActions } from "./useGroupActions";

export const useGroupAdminLogic = () => {
  const isAdminMode = useAdminMode();
  const { filters, setGroupId } = useUrlFilters();
  const activeGroupId = filters.groupId;
  const initialPhotoId = filters.photoId;
  
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

  const adminActions = useAdminMaintenance();
  const onUpdatePhoto = async (id: string, data: any) =>
    adminActions.updatePhoto.mutateAsync({ id, updates: data });
  const onUpdatePhotosBulk = async (ids: string[], data: any) =>
    adminActions.batchUpdate.mutateAsync({ ids, updates: data });
  const onBatchAiAnalyze = (photos: Photo[]) => {};
  const onBatchEdit = (ids: string[]) => update({ batchEditingIds: ids });

  

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
  
  const dbGroupPhotos = useMemo(() => 
    dbGroupPhotosPages?.pages.flatMap((p: any) => p.photos) ?? [],
    [dbGroupPhotosPages]
  );

  const {
    groupData,
    setGroupData,
    isGroupDataLoading,
    handleUpdateGroupData,
    removeDraftGroup
  } = useGroupDraft(activeGroupId, dbGroupPhotos, onUpdatePhoto);

  const activeGroupPhotos = useMemo(() => {
    if (!activeGroupId) return [];
    let groupPhotos = dbGroupPhotos;
    
    if (processingIds && processingIds.length > 0) {
        groupPhotos = groupPhotos.filter((p: any) => !processingIds.includes(p.id));
    }

    return filterPhotosByMode(groupPhotos, isAdminMode)
      .map(p => ({
        ...p,
        is_group_cover: groupData?.cover_photo_id === p.id || !!p.is_group_cover
      }))
      .sort((a, b) => {
      const isACover = a.is_group_cover;
      const isBCover = b.is_group_cover;
      if (isACover && !isBCover) return -1;
      if (!isACover && isBCover) return 1;
      if (a.group_order !== undefined && b.group_order !== undefined) {
        return a.group_order - b.group_order;
      }
      if (a.group_order !== undefined) return -1;
      if (b.group_order !== undefined) return 1;
      return (a.item_code || "").localeCompare(b.item_code || "");
    });
  }, [activeGroupId, dbGroupPhotos, processingIds, isAdminMode, groupData?.cover_photo_id]);

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
    onBatchEdit
  );

  const hasScrolledRef = useRef<{ id: string | null; groupId: string | null }>({ id: null, groupId: null });

  useEffect(() => {
    if (activeGroupId && initialPhotoId) {
      // Prevent scrolling multiple times for the same initialPhotoId within the same group
      if (hasScrolledRef.current.id === initialPhotoId && hasScrolledRef.current.groupId === activeGroupId) {
          return;
      }

      const index = activeGroupPhotos.findIndex((p) => p.id === initialPhotoId);
      if (index !== -1) {
        hasScrolledRef.current = { id: initialPhotoId, groupId: activeGroupId };
        setCurrentHighlightId(initialPhotoId);
        const timer = setTimeout(() => setCurrentHighlightId(null), 5000);

        setTimeout(() => {
          virtualGridRef.current?.scrollToIndex({
            index,
            align: "center",
            behavior: "auto",
        });
        }, 100);

        return () => clearTimeout(timer);
      }
    } else {
        hasScrolledRef.current = { id: null, groupId: null };
    }
  }, [activeGroupId, initialPhotoId, activeGroupPhotos.length]);

  const isScrollRestoredRef = useRef(false);

  useEffect(() => {
    if (activeGroupId && containerRef.current && !isScrollRestoredRef.current) {
      if (groupScrollStr !== '0' && !initialPhotoId) {
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop = parseInt(groupScrollStr, 10);
            isScrollRestoredRef.current = true;
          }
        }, 50);
      } else {
        isScrollRestoredRef.current = true;
      }
    }
  }, [activeGroupId, initialPhotoId]);

  useEffect(() => {
    // Reset scroll restored flag when group changes
    isScrollRestoredRef.current = false;
  }, [activeGroupId]);

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
        isGroupPhotosLoading
  };
};
