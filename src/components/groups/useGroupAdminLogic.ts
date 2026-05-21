import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Photo, ProductGroup, Dimension, DialogData } from '../../types';
import { filterPhotosByMode } from '../../utils/photoVisibility';
import { getGroupById, saveGroupToCloud } from '../../services/groupService';
import { updatePhotosGroupInCloud } from '../../services/photoMutationService';
import { useGroupCoverMutation } from '../../hooks/mutations/useGroupCoverMutation';
import { useRemoveFromGroupMutation } from '../../hooks/mutations/useGroupOperations';
import { useGalleryStore } from '../../store';
import { useAdminMode } from '../../hooks/useAdminMode';
import { useFeedback } from '../../hooks/uiFeedback';

interface UseGroupAdminLogicProps {
  activeGroupId: string | null;
  initialPhotoId?: string | null;
  photos: Photo[];
  onRefresh: () => void;
  hookUpdatePhoto?: (id: string, updates: Partial<Photo>) => Promise<void>;
  propsSetAlertDialog?: (d: DialogData | null) => void;
  onBatchAiAnalyze?: (photos: Photo[]) => void;
  onBatchEdit?: (ids: string[]) => void;
  onUngroup?: (groupId: string) => void;
  setActiveGroupId?: (id: string | null) => void;
}

export const useGroupAdminLogic = ({
  activeGroupId,
  initialPhotoId,
  photos,
  onRefresh,
  hookUpdatePhoto,
  propsSetAlertDialog,
  onBatchAiAnalyze,
  onBatchEdit,
  onUngroup,
  setActiveGroupId
}: UseGroupAdminLogicProps) => {
  const isAdminMode = useAdminMode();
  const { 
    setAlertDialog: contextSetAlertDialog, 
    setPromptDialog,
  } = useGalleryStore();
  
  const setAlertDialog = propsSetAlertDialog || contextSetAlertDialog;
  const { showError, showSuccess } = useFeedback();

  const { mutate: mutateSetCover } = useGroupCoverMutation();
  const { mutateAsync: removePhotosBatch } = useRemoveFromGroupMutation();
  
  const setCover = useCallback(async (photoId: string) => {
      mutateSetCover({ photoId, groupId: activeGroupId || undefined });
  }, [mutateSetCover, activeGroupId]);

  const [focusedGroupPhotoId, setFocusedGroupPhotoId] = useState<string | null>(null);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [groupData, setGroupData] = useState<ProductGroup | null>(null);
  const [isGroupDataLoading, setIsGroupDataLoading] = useState(false);
  const [currentHighlightId, setCurrentHighlightId] = useState<string | null>(null);
  const virtuosoRef = useRef<any>(null);

  const activeGroupPhotos = useMemo(() => {
    if (!activeGroupId) return [];
    const groupPhotos = photos.filter(p => p && p.groupId === activeGroupId);
    return filterPhotosByMode(groupPhotos, isAdminMode)
      .sort((a, b) => {
        if (a.isGroupCover) return -1;
        if (b.isGroupCover) return 1;
        if (a.groupOrder !== undefined && b.groupOrder !== undefined) {
          return a.groupOrder - b.groupOrder;
        }
        if (a.groupOrder !== undefined) return -1;
        if (b.groupOrder !== undefined) return 1;
        return (a.item_code || '').localeCompare(b.item_code || '');
      });
  }, [activeGroupId, photos, isAdminMode]);

  const groupCover = useMemo(() => activeGroupPhotos.find(p => p.isGroupCover) || activeGroupPhotos[0], [activeGroupPhotos]);
  
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
    let active = true;
    if (activeGroupId) {
      setGroupData(null);
      setIsGroupDataLoading(true);
      getGroupById(activeGroupId).then(data => {
        if (active) {
          if (data) {
            setGroupData(data);
          } else {
            setGroupData({
              id: activeGroupId,
              name: '',
              description: '',
              colors: [],
              materials: [],
              cover_photo_id: groupCover?.id || null,
              user_id: groupCover?.userId || 'default',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
          setIsGroupDataLoading(false);
        }
      }).catch(err => {
        if (active) {
          setIsGroupDataLoading(false);
          showError(err, '获取产品组详情失败');
        }
      });
    } else {
      setGroupData(null);
      setIsGroupDataLoading(false);
    }
    return () => { active = false; };
  }, [activeGroupId, groupCover?.id, groupCover?.userId]);

  useEffect(() => {
    if (isMultiSelectMode && selectedPhotoIds.length === 0) {
      setIsMultiSelectMode(false);
    }
  }, [selectedPhotoIds.length, isMultiSelectMode]);

  const confirmBulkRemove = useCallback((ids: string[]) => {
    // Determine the true remaining count (including hidden photos)
    const allGroupPhotos = photos.filter(p => p && p.groupId === activeGroupId);
    const remainingCount = allGroupPhotos.length - ids.length;
    const isDissolving = remainingCount <= 1;
    
    setAlertDialog({
      title: isDissolving ? '确认解散群组' : '确认批量移出',
      message: isDissolving 
        ? `移出后该组将只剩 ${remainingCount} 张照片。系统会自动将剩余照片也移出并解散群组。确定继续吗？` 
        : `确定要将选中的 ${ids.length} 张照片移出群组吗？`,
      onConfirm: async () => {
        try {
          setIsMultiSelectMode(false);
          setSelectedPhotoIds([]);
          
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
  }, [showError, setAlertDialog, photos, activeGroupId, removePhotosBatch, setActiveGroupId]);

  const persistPhotoChange = useCallback(async (photoId: string, updates: Partial<Photo>) => {
    // Optimistic update: temporarily update local state if possible
    // Note: Assuming `photos` is provided by the parent via props or context and it's reactive
    
    try {
      if (hookUpdatePhoto) {
        await hookUpdatePhoto(photoId, updates);
      } else {
         const { updatePhoto: serviceUpdatePhoto } = await import('../../services/photoMutationService');
         await serviceUpdatePhoto(photoId, updates);
      }
      onRefresh();
    } catch (err: any) {
      showError(err, '保存照片修改失败');
      // Potential rollback would go here if we had local state modification
    }
  }, [showError, hookUpdatePhoto, onRefresh]);

  const handleUpdateGroupData = useCallback(async (updates: Partial<ProductGroup>) => {
    if (!activeGroupId || !groupData) return;

    const nextGroupData = { ...groupData, ...updates };
    setGroupData(nextGroupData);
    
    try {
      await saveGroupToCloud(nextGroupData);
      
      if (updates.hasOwnProperty('is_hidden')) {
        const is_hidden = updates.is_hidden;
        const groupPhotos = photos.filter(p => p && p.groupId === activeGroupId);
        if (groupPhotos.length > 0 && hookUpdatePhoto) {
           await Promise.all(
             groupPhotos.map(p => hookUpdatePhoto(p.id, { is_hidden }))
           );
        }
      }
    } catch (err: any) {
      showError(err, '更新群组资料失败');
      throw err;
    }
  }, [activeGroupId, groupData, showError, hookUpdatePhoto, photos]);

  const handleToggleTag = useCallback((photo: Photo, tagId: string) => {
    const currentTags = Array.isArray(photo.tagIds) ? photo.tagIds : [];
    const nextTags = currentTags.includes(tagId)
      ? currentTags.filter(id => id !== tagId)
      : [...currentTags, tagId];
    
    persistPhotoChange(photo.id, { tagIds: nextTags });
  }, [persistPhotoChange]);

  const handleBatchUpdateDimensions = useCallback(async (newDims: Dimension[]) => {
    if (!activeGroupId || newDims.length === 0) return;
    
    setAlertDialog({
      title: '确认批量修改尺寸',
      message: `确定要将群组内所有 ${activeGroupPhotos.length} 张照片的尺寸更新为当前设置吗？此操作不可撤销。`,
      onConfirm: async () => {
        try {
          if (hookUpdatePhoto) {
            await Promise.all(
              activeGroupPhotos.map(p => hookUpdatePhoto(p.id, { dimensions: newDims }))
            );
          } else {
            const { updatePhoto: serviceUpdatePhoto } = await import('../../services/photoMutationService');
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
  }, [activeGroupId, activeGroupPhotos, showError, hookUpdatePhoto, setAlertDialog]);

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
      groupOrder: index
    }));
    
    try {
      const { updatePhoto: serviceUpdatePhoto } = await import('../../services/photoMutationService');
      await Promise.all(
        updatedPhotosWithOrder.map(p => serviceUpdatePhoto(p.id, { groupOrder: p.groupOrder }))
      );
    } catch (err: any) {
      showError(err, '保存排序失败');
      throw err;
    }
  }, [activeGroupPhotos, showError]);

  const handleBulkAction = useCallback(async (action: 'ai' | 'remove' | 'batch') => {
    if (selectedPhotoIds.length === 0) return;
    
    if (action === 'ai') {
      const targetPhotos = activeGroupPhotos.filter(p => selectedPhotoIds.includes(p.id));
      onBatchAiAnalyze?.(targetPhotos);
      setIsMultiSelectMode(false);
      setSelectedPhotoIds([]);
    } else if (action === 'remove') {
      confirmBulkRemove(selectedPhotoIds);
    } else if (action === 'batch') {
      onBatchEdit?.(selectedPhotoIds);
      setIsMultiSelectMode(false);
      setSelectedPhotoIds([]);
    }
  }, [activeGroupPhotos, confirmBulkRemove, onBatchAiAnalyze, onBatchEdit, selectedPhotoIds]);

  return {
    focusedGroupPhotoId, setFocusedGroupPhotoId,
    isMultiSelectMode, setIsMultiSelectMode,
    selectedPhotoIds, setSelectedPhotoIds,
    draggedPhotoId, setDraggedPhotoId,
    showGroupSettings, setShowGroupSettings,
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
    showError
  };
};
