import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Photo, ProductGroup, Dimension, DialogData } from '../../types';
import { filterPhotosByMode } from '../../utils/photoVisibility';
import { usePhotoActions } from '@/contexts/PhotoActionsContext';
import { saveGroupToCloud } from '../../services/groupService';
import { updatePhotosGroupInCloud } from '../../services/photoService';
import { useGroupCoverMutation, useRemoveFromGroupMutation, useAdminMode, useFeedback, useGroupPhotosQuery, useGroupDetailQuery } from '@/hooks';
import { useGalleryStore, useShallow } from '@/store';


export const useGroupAdminLogic = ({
  initialPhotoId,
  photos,
}: { initialPhotoId?: string | null, photos: Photo[] }) => {
  const isAdminMode = useAdminMode();
  const { 
    activeGroupId, setActiveGroupId, appLang,
    setAlertDialog: contextSetAlertDialog, 
    setPromptDialog,
    isMultiSelect, setIsMultiSelect,
    selectedIds, setSelectedIds,
    groupSettingsOpen, setGroupSettingsOpen,
    batchEditingIds, setBatchEditingIds,
  } = useGalleryStore(useShallow(s => ({
    activeGroupId: s.activeGroupId,
    setActiveGroupId: s.setActiveGroupId,
    appLang: s.appLang,
    setAlertDialog: s.setAlertDialog,
    setPromptDialog: s.setPromptDialog,
    isMultiSelect: s.isMultiSelect,
    setIsMultiSelect: s.setIsMultiSelect,
    selectedIds: s.selectedIds,
    setSelectedIds: s.setSelectedIds,
    groupSettingsOpen: s.groupSettingsOpen,
    setGroupSettingsOpen: s.setGroupSettingsOpen,
    batchEditingIds: s.batchEditingIds,
    setBatchEditingIds: s.setBatchEditingIds
  })));

  const {
    onTogglePinned, onDeletePhoto, onUpdatePhoto, onToggleHidden,
    onGroupPhotos, onUngroup, onBatchAiAnalyze, onBatchEdit
  } = usePhotoActions();
  
  const setAlertDialog = contextSetAlertDialog;
  const { showError, showSuccess } = useFeedback();

  const { mutate: mutateSetCover } = useGroupCoverMutation();
  const { mutateAsync: removePhotosBatch } = useRemoveFromGroupMutation();
  
  const [groupData, setGroupData] = useState<ProductGroup | null>(null);
  const { data: queriedGroupData, isLoading: isGroupDataLoading } = useGroupDetailQuery(activeGroupId);

  const setCover = useCallback(async (photoId: string) => {
      const isAlreadyCover = groupData?.cover_photo_id === photoId;
      const targetPhotoId = isAlreadyCover ? null : photoId;
      mutateSetCover({ photoId: targetPhotoId, groupId: activeGroupId || undefined });
      setGroupData(prev => prev ? {
        ...prev,
        cover_photo_id: targetPhotoId
      } : prev);
  }, [mutateSetCover, activeGroupId, groupData?.cover_photo_id]);

  const [focusedGroupPhotoId, setFocusedGroupPhotoId] = useState<string | null>(null);
  // const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  // const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [currentHighlightId, setCurrentHighlightId] = useState<string | null>(null);
  const virtuosoRef = useRef<any>(null);

  const { data: dbGroupPhotos = [], isLoading: isGroupPhotosLoading } = useGroupPhotosQuery(activeGroupId || '', isAdminMode);

  const activeGroupPhotos = useMemo(() => {
    if (!activeGroupId) return [];
    const groupPhotos = dbGroupPhotos;
    return filterPhotosByMode(groupPhotos, isAdminMode)
      .sort((a, b) => {
        if (a.is_group_cover) return -1;
        if (b.is_group_cover) return 1;
        if (a.group_order !== undefined && b.group_order !== undefined) {
          return a.group_order - b.group_order;
        }
        if (a.group_order !== undefined) return -1;
        if (b.group_order !== undefined) return 1;
        return (a.item_code || '').localeCompare(b.item_code || '');
      });
  }, [activeGroupId, photos, dbGroupPhotos, isAdminMode]);

  const groupCover = useMemo(() => activeGroupPhotos.find(p => p.is_group_cover) || activeGroupPhotos[0], [activeGroupPhotos]);
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeGroupId && initialPhotoId) {
      setCurrentHighlightId(initialPhotoId);
      const timer = setTimeout(() => setCurrentHighlightId(null), 5000);
      
      const index = activeGroupPhotos.findIndex(p => p.id === initialPhotoId);
      if (index !== -1) {
        setTimeout(() => {
          virtuosoRef.current?.scrollToIndex({
            index,
            align: 'center',
            behavior: 'auto'
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
      sessionStorage.setItem(`group_scroll_${activeGroupId}`, e.currentTarget.scrollTop.toString());
    }
  };
  
  useEffect(() => {
    if (queriedGroupData) {
      setGroupData(queriedGroupData);
    } else if (activeGroupId && !isGroupDataLoading) {
      setGroupData({
        id: activeGroupId,
        name: '',
        description: '',
        colors: [],
        materials: [],
        cover_photo_id: null,
        user_id: 'default',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } else {
      setGroupData(null);
    }
  }, [queriedGroupData, activeGroupId, isGroupDataLoading]);

  useEffect(() => {
    if (isMultiSelect && selectedIds.length === 0) {
      setIsMultiSelect(false);
    }
  }, [selectedIds.length, isMultiSelect]);

  const confirmBulkRemove = useCallback((ids: string[]) => {
    // Determine the true remaining count (including hidden photos)
    const allGroupPhotos = dbGroupPhotos.length > 0
      ? dbGroupPhotos
      : photos.filter(p => p && p.group_id === activeGroupId);
    const remainingCount = allGroupPhotos.length - ids.length;
    const isDissolving = remainingCount <= 1;
    
    setAlertDialog({
      title: isDissolving ? '确认解散群组' : '确认批量移出',
      message: isDissolving 
        ? `移出后该组将只剩 ${remainingCount} 张照片。系统会自动将剩余照片也移出并解散群组。确定继续吗？` 
        : `确定要将选中的 ${ids.length} 张照片移出群组吗？`,
      onConfirm: async () => {
        try {
          setIsMultiSelect(false);
          setSelectedIds([]);
          
          if (activeGroupId) {
             const targetIds = isDissolving ? allGroupPhotos.map(p => p.id) : ids;
             await removePhotosBatch({ photoIds: targetIds, groupId: activeGroupId });
             
             if (isDissolving) {
               setActiveGroupId?.(null);
             }
          }
        } catch (err: any) {
          showError(err, '操作失败');
        }
        setAlertDialog(null);
      }
    });
  }, [showError, setAlertDialog, photos, dbGroupPhotos, activeGroupId, removePhotosBatch, setActiveGroupId]);

  const persistPhotoChange = useCallback(async (photoId: string, updates: Partial<Photo>) => {
    try {
      if (onUpdatePhoto) {
        await onUpdatePhoto(photoId, updates);
      } else {
         const { updatePhoto: serviceUpdatePhoto } = await import('../../services/photoService');
         await serviceUpdatePhoto(photoId, updates);
      }
    } catch (err: any) {
      showError(err, '保存照片修改失败');
    }
  }, [showError, onUpdatePhoto]);

  const handleUpdateGroupData = useCallback(async (updates: Partial<ProductGroup>) => {
    if (!activeGroupId || !groupData) return;

    const nextGroupData = { ...groupData, ...updates };
    setGroupData(nextGroupData);
    
    try {
      await saveGroupToCloud(nextGroupData);
      
      if (updates.hasOwnProperty('is_hidden')) {
        const is_hidden = updates.is_hidden;
        const groupPhotos = dbGroupPhotos.length > 0
          ? dbGroupPhotos
          : photos.filter(p => p && p.group_id === activeGroupId);
        if (groupPhotos.length > 0 && onUpdatePhoto) {
           await Promise.all(
             groupPhotos.map(p => onUpdatePhoto(p.id, { is_hidden }))
           );
        }
      }
    } catch (err: any) {
      showError(err, '更新群组资料失败');
      throw err;
    }
  }, [activeGroupId, groupData, showError, onUpdatePhoto, photos, dbGroupPhotos]);

  const handleToggleTag = useCallback((photo: Photo, tagId: string) => {
    const currentTags = Array.isArray(photo.tag_ids) ? photo.tag_ids : [];
    const nextTags = currentTags.includes(tagId)
      ? currentTags.filter(id => id !== tagId)
      : [...currentTags, tagId];
    
    persistPhotoChange(photo.id, { tag_ids: nextTags });
  }, [persistPhotoChange]);

  const handleBatchUpdateDimensions = useCallback(async (newDims: Dimension[]) => {
    if (!activeGroupId || newDims.length === 0) return;
    
    setAlertDialog({
      title: '确认批量修改尺寸',
      message: `确定要将群组内所有 ${activeGroupPhotos.length} 张照片的尺寸更新为当前设置吗？此操作不可撤销。`,
      onConfirm: async () => {
        try {
          if (onUpdatePhoto) {
            await Promise.all(
              activeGroupPhotos.map(p => onUpdatePhoto(p.id, { dimensions: newDims }))
            );
          } else {
            const { updatePhoto: serviceUpdatePhoto } = await import('../../services/photoService');
            await Promise.all(
              activeGroupPhotos.map(p => serviceUpdatePhoto(p.id, { dimensions: newDims }))
            );
          }
        } catch (err: any) {
          showError(err, '批量更新尺寸失败');
          throw err;
        }
        setAlertDialog(null);
      }
    });
  }, [activeGroupId, activeGroupPhotos, showError, onUpdatePhoto, setAlertDialog]);

  const handleReorder = useCallback(async (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    
    const dragIdx = activeGroupPhotos.findIndex(p => p.id === draggedId);
    const hoverIdx = activeGroupPhotos.findIndex(p => p.id === targetId);
    
    if (dragIdx === -1 || hoverIdx === -1) return;
    
    const nextGroupPhotos = [...activeGroupPhotos];
    const [draggedPhoto] = nextGroupPhotos.splice(dragIdx, 1);
    nextGroupPhotos.splice(hoverIdx, 0, draggedPhoto);
    
    const updatedPhotosWithOrder = nextGroupPhotos.map((p, index) => ({
      ...p,
      group_order: index
    }));
    
    try {
      const { updatePhoto: serviceUpdatePhoto } = await import('../../services/photoService');
      await Promise.all(
        updatedPhotosWithOrder.map(p => serviceUpdatePhoto(p.id, { group_order: p.group_order }))
      );
    } catch (err: any) {
      showError(err, '保存排序失败');
      throw err;
    }
  }, [activeGroupPhotos, showError]);

  const handleBulkAction = useCallback(async (action: 'ai' | 'remove' | 'batch') => {
    if (selectedIds.length === 0) return;
    
    if (action === 'ai') {
      const targetPhotos = activeGroupPhotos.filter(p => selectedIds.includes(p.id));
      onBatchAiAnalyze?.(targetPhotos);
      setIsMultiSelect(false);
      setSelectedIds([]);
    } else if (action === 'remove') {
      confirmBulkRemove(selectedIds);
    } else if (action === 'batch') {
      onBatchEdit?.(selectedIds);
      setIsMultiSelect(false);
      setSelectedIds([]);
    }
  }, [activeGroupPhotos, confirmBulkRemove, onBatchAiAnalyze, onBatchEdit, selectedIds]);

  return {
    focusedGroupPhotoId, setFocusedGroupPhotoId,
    isMultiSelect, setIsMultiSelect,
    selectedIds, setSelectedIds,
    draggedPhotoId, setDraggedPhotoId,
    showGroupSettings, setShowGroupSettings,
    groupSettingsOpen, setGroupSettingsOpen,
    batchEditingIds, setBatchEditingIds,
    groupData, setGroupData,
    isGroupDataLoading,
    activeGroupPhotos,
    containerRef,
    virtuosoRef,
    currentHighlightId,
    handleScroll,
    confirmBulkRemove,
    persistPhotoChange,
    handleUpdateGroupData,
    handleToggleTag,
    handleBatchUpdateDimensions,
    handleReorder,
    handleBulkAction,
    setCover,
    setPromptDialog,
    setAlertDialog,
    showError,
    isGroupPhotosLoading
  };
};
