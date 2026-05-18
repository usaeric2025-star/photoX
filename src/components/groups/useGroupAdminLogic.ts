import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Photo, ProductGroup, Dimension, DialogData } from '../../types';
import { filterPhotosByMode } from '../../utils/photoVisibility';
import { getGroupById, saveGroupToCloud } from '../../services/groupService';
import { updatePhotosGroupInCloud } from '../../services/photoMutationService';
import { useGroupCoverMutation } from '../../hooks/mutations/useGroupCoverMutation';
import { useGalleryStore } from '../../store';

interface UseGroupAdminLogicProps {
  activeGroupId: string | null;
  photos: Photo[];
  isAdminMode: boolean;
  hookUpdatePhoto?: (id: string, updates: Partial<Photo>) => Promise<void>;
  propsSetAlertDialog?: (d: DialogData | null) => void;
  onBatchAiAnalyze?: (photos: Photo[]) => void;
  onBatchEdit?: (ids: string[]) => void;
}

export const useGroupAdminLogic = ({
  activeGroupId,
  photos,
  isAdminMode,
  hookUpdatePhoto,
  propsSetAlertDialog,
  onBatchAiAnalyze,
  onBatchEdit
}: UseGroupAdminLogicProps) => {
  const { 
    setAlertDialog: contextSetAlertDialog, 
    setPromptDialog,
    setErrors
  } = useGalleryStore();
  
  const setAlertDialog = propsSetAlertDialog || contextSetAlertDialog;
  
  const handleError = useCallback((error: any, context: string) => {
    console.error(`[Error] ${context}:`, error);
    setErrors([{ message: error.message || String(error), context, timestamp: Date.now() }]);
  }, [setErrors]);

  const { mutate: mutateSetCover } = useGroupCoverMutation();
  const setCover = useCallback(async (photoId: string) => {
      mutateSetCover({ photoId });
  }, [mutateSetCover]);

  const [focusedGroupPhotoId, setFocusedGroupPhotoId] = useState<string | null>(null);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [groupData, setGroupData] = useState<ProductGroup | null>(null);
  const [isGroupDataLoading, setIsGroupDataLoading] = useState(false);

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
    if (activeGroupId && containerRef.current) {
      const saved = sessionStorage.getItem(`group_scroll_${activeGroupId}`);
      if (saved) {
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop = parseInt(saved, 10);
          }
        }, 50);
      }
    }
  }, [activeGroupId]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (activeGroupId) {
      sessionStorage.setItem(`group_scroll_${activeGroupId}`, e.currentTarget.scrollTop.toString());
    }
  };
  
  useEffect(() => {
    if (activeGroupId) {
      setGroupData(null);
      setIsGroupDataLoading(true);
      getGroupById(activeGroupId).then(data => {
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
      }).catch(() => setIsGroupDataLoading(false));
    } else {
      setGroupData(null);
      setIsGroupDataLoading(false);
    }
  }, [activeGroupId, groupCover?.id, groupCover?.userId]);

  useEffect(() => {
    if (isMultiSelectMode && selectedPhotoIds.length === 0) {
      setIsMultiSelectMode(false);
    }
  }, [selectedPhotoIds.length, isMultiSelectMode]);

  const confirmBulkRemove = useCallback((ids: string[]) => {
    setAlertDialog({
      title: '确认批量移出',
      message: `确定要将选中的 ${ids.length} 张照片移出群组吗？`,
      onConfirm: async () => {
        try {
          await updatePhotosGroupInCloud(ids, { group_id: null });
          setIsMultiSelectMode(false);
          setSelectedPhotoIds([]);
          toast.success('已移出 / Removed');
        } catch (err: any) {
          handleError(err, '批量移出失败');
        }
        setAlertDialog(null);
      }
    });
  }, [handleError, setAlertDialog]);

  const persistPhotoChange = useCallback(async (photoId: string, updates: Partial<Photo>) => {
    try {
      if (hookUpdatePhoto) {
        await hookUpdatePhoto(photoId, updates);
      } else {
         const { updatePhoto: serviceUpdatePhoto } = await import('../../services/photoMutationService');
         await serviceUpdatePhoto(photoId, updates);
      }
      toast.success('已保存 / Saved');
    } catch (err: any) {
      handleError(err, '保存照片修改失败');
    }
  }, [handleError, hookUpdatePhoto]);

  const handleUpdateGroupData = useCallback(async (updates: Partial<ProductGroup>) => {
    if (!activeGroupId || !groupData) return;

    const nextGroupData = { ...groupData, ...updates };
    setGroupData(nextGroupData);
    
    toast.success('群组资料已更新 / Group info updated');

    try {
      await saveGroupToCloud(nextGroupData);
      
      if (updates.hasOwnProperty('is_hidden')) {
        const is_hidden = updates.is_hidden;
        const groupPhotos = photos.filter(p => p && p.groupId === activeGroupId);
        if (groupPhotos.length > 0 && hookUpdatePhoto) {
           await Promise.all(
             groupPhotos.map(p => hookUpdatePhoto(p.id, { is_hidden }))
           );
           toast.success(`群组内照片已${is_hidden ? '屏蔽' : '显示'}`);
        }
      }
    } catch (err: any) {
      handleError(err, '更新群组资料失败');
    }
  }, [activeGroupId, groupData, handleError, hookUpdatePhoto, photos]);

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
          const toastId = toast.loading('正在批量更新尺寸...');
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
          toast.success('批量更新成功', { id: toastId });
        } catch (err: any) {
          handleError(err, '批量更新尺寸失败');
        }
        setAlertDialog(null);
      }
    });
  }, [activeGroupId, activeGroupPhotos, handleError, hookUpdatePhoto, setAlertDialog]);

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
      toast.success('顺序已保存 / Order saved');
    } catch (err: any) {
      handleError(err, '保存排序失败');
    }
  }, [activeGroupPhotos, handleError]);

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
    handleError
  };
};
