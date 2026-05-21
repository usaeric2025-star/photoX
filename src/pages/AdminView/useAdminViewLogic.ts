import { useState, useCallback, useEffect, useMemo } from 'react';
import { useGalleryStore, useStore } from '@/store';
import { useFeedback, usePhotoManagement } from '@/hooks';
import { usePermission } from '@/hooks/usePermission';
import { User, Photo } from '@/types';
import { loginWithGoogle } from '@/services/supabaseService';
import { hapticFeedback } from '@/utils/haptics';
import { loadPhotosByGroupId } from '@/services/photoService';

interface AdminViewLogicProps {
  user: User | null;
  sessionValue: any;
  photoValue: any;
  uiValue: any;
  onRefresh: () => void;
  performPullSync: (next: boolean) => Promise<any>;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
}

export const useAdminViewLogic = (props: AdminViewLogicProps) => {
  const { 
    user, sessionValue, photoValue, uiValue, onRefresh, performPullSync,
    hasNextPage = false, isFetchingNextPage = false
  } = props;
  const { 
    tagIdToNameMap,
    searchQuery, setSearchQuery, setDebouncedSearchQuery,
    filterCatId, setFilterCatId,
    filterSubId, setFilterSubId,
    filterTagIds, setFilterTagIds,
    sortOrder,
    resetFilters,
    activeGroupId,
    setActiveGroupId: setStoreActiveGroupId,
    lightboxIndex,
    setLightboxIndex,
    columns,
    setColumns
  } = useGalleryStore();
  
  const { 
    activeScreen, setActiveScreen, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds, 
    loadingType="idle", withLoading = async (t: string, f: () => Promise<any>) => await f(), cloudCount = 0, setCloudCount = () => {},
    setAlertDialog = () => {}, setPromptDialog = () => {}, setAiDebugInfo = () => {}, aiDebugInfo = null, abortAnalysis = () => {}, batchProgress = 0
  } = uiValue || {};
  
  const {
    settings = {}, setSettings = () => {}, adminPreviewMode = 'private', setAdminPreviewMode = () => {}, setIsSyncing = () => {},
    performPushSync = async () => {}, saveSettings = async () => ({})
  } = sessionValue || {};

  const {
    photos = [], categories = [], tags = [], manufacturers = [],
    handleSingleAiAnalyze = async () => {}, handleTranslate = async () => {}, handleBatchAiIdentify = async () => {}, handleGroupAiIdentify = async () => {}, handlePhotoImport = async () => {},
    importProgress, importTotal,
    deletePhoto = async () => {}, handleGroupPhotos = async () => {}, handleUngroup = async () => {}, saveNewPhoto = async () => {}, saveBatchEdit = async () => {},
    updateTag = async () => {}, deleteTag = async () => {}, updateCategory = async () => {}, deleteCategory = async () => {}, addCategory = async () => {},
    addManufacturer = async () => {}, updateManufacturer = async () => {}, deleteManufacturer = async () => {},
    addTag = async () => {}, quickAddTag = () => {}, quickAddManufacturer = () => {},
    updatePhoto = async () => {}, updatePhotosBulk = async () => {},
    formState, updateForm, showOtherFields, setShowOtherFields, resetAddState, newPhotoData, setNewPhotoData
  } = photoValue || {};

  const { showError, showSuccess } = useFeedback();
  const { isAdmin } = usePermission();

  const setActiveGroupId = useCallback((id: string | null) => {
      if (id) {
          resetFilters();
      }
      setStoreActiveGroupId(id);
  }, [resetFilters, setStoreActiveGroupId]);

  const [initialPhotoId, setInitialPhotoId] = useState<string | null>(null);

  const [batchIsHiddenApplied, setBatchIsHiddenApplied] = useState(false);

  const checkSyncLock = useCallback(() => {
    if (loadingType === 'sync-pull' || loadingType === 'sync-push') {
       return true;
    }
    return false;
  }, [loadingType]);

  useEffect(() => {
    if (editPhotoId && loadingType !== 'analyzing') {
       setAiDebugInfo(null);
    }
  }, [editPhotoId, loadingType, setAiDebugInfo]);

  const handleBatchAiIdentifyTrigger = useCallback(async (targetPhotos?: Photo[]) => {
    if (checkSyncLock()) return;
    if (loadingType === 'analyzing') {
      abortAnalysis();
      return;
    }
    const photosToProcess = targetPhotos || photos;
    if (photosToProcess.length === 0) return;

    setAlertDialog({
      title: 'AI 批量智能识别 / Batch AI Identify',
      message: `请选择对这 ${photosToProcess.length} 张照片批量识别的模式：\n\n•「跳过已完善」：仅分析未完成或缺属性（如名称、标签、英文翻译）的照片，省时省额度（推荐）\n•「分析全部」：重新分析所有选择的照片，重写/更新现有属性`,
      cancelLabel: '取消 / Cancel',
      confirmLabel: '分析全部 / Analyze All',
      onConfirm: async () => {
         try {
           await withLoading('analyzing', () => handleBatchAiIdentify(photosToProcess, undefined, true));
         } catch (err) {
           showError(err, 'ai-analyze');
         }
      },
      secondaryAction: {
         label: '跳过已完善 / Skip Completed',
         onClick: async () => {
            try {
              await withLoading('analyzing', () => handleBatchAiIdentify(photosToProcess, undefined, false));
            } catch (err) {
              showError(err, 'ai-analyze');
            }
         }
      }
    });
  }, [checkSyncLock, loadingType, abortAnalysis, withLoading, handleBatchAiIdentify, photos, setAlertDialog, showError]);

  const handleDeletePhoto = useCallback(async (id: string | string[]) => {
     try {
         await deletePhoto(id);
         hapticFeedback.light();
         if (typeof id === 'string') setEditPhotoId(null);
         else resetAddState();
     } catch (error) {
         hapticFeedback.error();
         showError(error, 'delete-photo');
     }
  }, [deletePhoto, setEditPhotoId, resetAddState, showError]);

  const togglePinned = useCallback(async (photo: Photo) => {
    if (checkSyncLock()) return;
    const newStatus = !photo.is_pinned;
    let affectedIds = [photo.id];
    if (photo.group_id) {
      try {
        const dbGroupPhotos = await loadPhotosByGroupId(photo.group_id, true);
        affectedIds = dbGroupPhotos.length > 0
          ? dbGroupPhotos.map((p: Photo) => p.id)
          : photos.filter((p: Photo) => p.group_id === photo.group_id).map((p: Photo) => p.id);
      } catch (e) {
        affectedIds = photos.filter((p: Photo) => p.group_id === photo.group_id).map((p: Photo) => p.id);
      }
    }
    try {
      await updatePhotosBulk(affectedIds, { is_pinned: newStatus });
    } catch (e: any) {
      showError(e, 'toggle-pinned');
      throw e;
    }
  }, [checkSyncLock, photos, updatePhotosBulk, showError]);

  const toggleHidden = useCallback(async (photo: Photo) => {
    if (checkSyncLock()) return;
    const nextValue = !photo.is_hidden;
    
    try {
      await updatePhoto(photo.id, { is_hidden: nextValue });
    } catch (e: any) {
      showError(e, 'toggle-hidden');
      throw e;
    }
  }, [checkSyncLock, updatePhoto, showError]);

  const setGroupCover = useCallback(async (id: string, groupId: string) => {
    if (checkSyncLock()) return;
    let groupPhotos = [];
    try {
      groupPhotos = await loadPhotosByGroupId(groupId, true);
    } catch (e) {
      // Fallback
    }
    if (groupPhotos.length === 0) {
      groupPhotos = photos.filter((p: Photo) => p.group_id === groupId);
    }
    try {
      await Promise.all(
         groupPhotos.map((p: Photo) => updatePhoto(p.id, { is_group_cover: p.id === id }))
      );
    } catch (e: any) {
      showError(e, 'set-group-cover');
      throw e;
    }
  }, [checkSyncLock, photos, updatePhoto, showError]);

  const saveBatchEditWithSuccess = useCallback(async (batchIsHiddenApplied: boolean) => {
    if (checkSyncLock()) return;
    try {
      await saveBatchEdit(batchIsHiddenApplied);
      showSuccess('批量更新成功');
    } catch (e) {
      showError(e, 'save-batch-edit');
      throw e;
    }
  }, [checkSyncLock, saveBatchEdit, showError, showSuccess]);

  const onLongPressStart = useCallback((id: string) => {
    hapticFeedback.medium();
  }, []);

  const onLongPressEnd = useCallback(() => {
    // Implement long press end
  }, []);

  const groupPhotos = useMemo(() => {
    if (!activeGroupId) return [];
    return photos.filter((p: Photo) => p.group_id === activeGroupId);
  }, [photos, activeGroupId]);

  const onEditPhotoById = useCallback((pOrId: Photo | string) => {
    const photo = typeof pOrId === 'string' 
      ? photos.find((p: Photo) => p.id === pOrId) 
      : pOrId;
    
    if (!photo) return;

    if (photo.group_id) {
      setInitialPhotoId(photo.id);
      setActiveGroupId(photo.group_id);
    } else {
      setEditPhotoId(photo.id);
    }
  }, [photos, setEditPhotoId]);

  return useMemo(() => ({
    activeScreen, setActiveScreen, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds,
    loadingType, withLoading, cloudCount,
    aiDebugInfo, abortAnalysis, batchProgress,
    settings, adminPreviewMode, setAdminPreviewMode, onRefresh,
    photos, categories, tags, manufacturers, tagIdToNameMap, groupPhotos,
    handleSingleAiAnalyze, handleTranslate, handleGroupAiIdentify, handlePhotoImport, importProgress, importTotal,
    handleBatchAiIdentifyTrigger, handleDeletePhoto, handleGroupPhotos, handleUngroup,
    saveNewPhoto, saveBatchEdit, updateTag, deleteTag, updateCategory, deleteCategory,
    addCategory, addManufacturer, updateManufacturer, deleteManufacturer,
    addTag, quickAddTag, quickAddManufacturer, updatePhoto, updatePhotosBulk,
    saveBatchEditWithSuccess, setLightboxIndex, onLongPressStart, onLongPressEnd,
    formState, updateForm, showOtherFields, setShowOtherFields, resetAddState, newPhotoData, setNewPhotoData,
    activeGroupId, setActiveGroupId, initialPhotoId, setInitialPhotoId, columns, setColumns, batchIsHiddenApplied, setBatchIsHiddenApplied,
    checkSyncLock, togglePinned, toggleHidden, setGroupCover,
    performPushSync, performPullSync, saveSettings, loginWithGoogle, setAlertDialog, setPromptDialog, showError,
    onEditPhotoById, hasNextPage, isFetchingNextPage
  }), [
    activeScreen, setActiveScreen, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds,
    loadingType, withLoading, cloudCount,
    aiDebugInfo, abortAnalysis, batchProgress,
    settings, adminPreviewMode, setAdminPreviewMode, onRefresh,
    photos, categories, tags, manufacturers, tagIdToNameMap, groupPhotos,
    handleSingleAiAnalyze, handleTranslate, handleGroupAiIdentify, handlePhotoImport, importProgress, importTotal,
    handleBatchAiIdentifyTrigger, handleDeletePhoto, handleGroupPhotos, handleUngroup,
    saveNewPhoto, saveBatchEdit, updateTag, deleteTag, updateCategory, deleteCategory,
    addCategory, addManufacturer, updateManufacturer, deleteManufacturer,
    addTag, quickAddTag, quickAddManufacturer, updatePhoto, updatePhotosBulk,
    saveBatchEditWithSuccess, setLightboxIndex, onLongPressStart, onLongPressEnd,
    formState, updateForm, showOtherFields, setShowOtherFields, resetAddState, newPhotoData, setNewPhotoData,
    activeGroupId, setActiveGroupId, initialPhotoId, setInitialPhotoId, columns, setColumns, batchIsHiddenApplied, setBatchIsHiddenApplied,
    checkSyncLock, togglePinned, toggleHidden, setGroupCover,
    performPushSync, performPullSync, saveSettings, loginWithGoogle, setAlertDialog, setPromptDialog, showError,
    onEditPhotoById, hasNextPage, isFetchingNextPage
  ]);
};
