import { useState, useCallback, useEffect, useMemo } from 'react';
import { useGalleryStore } from '@/store';
import { useFeedback, usePhotoManagement } from '@/hooks';
import { usePermission } from '@/hooks/usePermission';
import { User, Photo } from '@/types';
import { loginWithGoogle } from '@/services/supabaseService';
import { hapticFeedback } from '@/utils/haptics';

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
    isMultiSelect, setIsMultiSelect, selectedIds, setSelectedIds,
    tagIdToNameMap
  } = useGalleryStore();
  
  const clearSelection = useCallback(() => {
    setIsMultiSelect(false);
    setSelectedIds([]);
  }, [setIsMultiSelect, setSelectedIds]);
  
  const { 
    activeScreen, setActiveScreen, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds, 
    loadingType="idle", withLoading = async (t: string, f: () => Promise<any>) => await f(), cloudCount = 0, setCloudCount = () => {},
    setAlertDialog = () => {}, setPromptDialog = () => {}, setAiDebugInfo = () => {}, aiDebugInfo = null, abortAnalysis = () => {}, batchProgress = 0
  } = uiValue || {};

  const {
    settings = {}, setSettings = () => {}, viewMode = 'private', setViewMode = () => {}, setIsSyncing = () => {},
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

  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [initialPhotoId, setInitialPhotoId] = useState<string | null>(null);
  const [columns, setColumns] = useState<2 | 3 | 5>(3);
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

  const handleBatchAiIdentifyTrigger = useCallback(async () => {
    if (checkSyncLock()) return;
    if (loadingType === 'analyzing') {
      abortAnalysis();
    } else {
      try {
        await withLoading('analyzing', () => handleBatchAiIdentify(photos));
      } catch (err) {
        showError(err, 'ai-analyze');
      }
    }
  }, [checkSyncLock, loadingType, abortAnalysis, withLoading, handleBatchAiIdentify, photos, showError]);

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
    const newStatus = !photo.isPinned;
    const affectedIds = photo.groupId 
      ? photos.filter((p: Photo) => p.groupId === photo.groupId).map((p: Photo) => p.id)
      : [photo.id];
    try {
      await updatePhotosBulk(affectedIds, { isPinned: newStatus });
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
    const groupPhotos = photos.filter((p: Photo) => p.groupId === groupId);
    try {
      await Promise.all(
         groupPhotos.map((p: Photo) => updatePhoto(p.id, { isGroupCover: p.id === id }))
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

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const onLongPressStart = useCallback((id: string) => {
    hapticFeedback.medium();
    console.log('long press start', id);
  }, []);

  const onLongPressEnd = useCallback(() => {
    // Implement long press end
  }, []);

  const groupPhotos = useMemo(() => {
    if (!activeGroupId) return [];
    return photos.filter((p: Photo) => p.groupId === activeGroupId);
  }, [photos, activeGroupId]);

  const onEditPhotoById = useCallback((pOrId: Photo | string) => {
    const photo = typeof pOrId === 'string' 
      ? photos.find((p: Photo) => p.id === pOrId) 
      : pOrId;
    
    if (!photo) return;

    if (photo.groupId) {
      setInitialPhotoId(photo.id);
      setActiveGroupId(photo.groupId);
    } else {
      setEditPhotoId(photo.id);
    }
  }, [photos, setEditPhotoId]);

  return useMemo(() => ({
    isMultiSelect, setIsMultiSelect, selectedIds, setSelectedIds, clearSelection,
    activeScreen, setActiveScreen, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds,
    loadingType, withLoading, cloudCount,
    aiDebugInfo, abortAnalysis, batchProgress,
    settings, viewMode, setViewMode, onRefresh,
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
    isMultiSelect, setIsMultiSelect, selectedIds, setSelectedIds, clearSelection,
    activeScreen, setActiveScreen, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds,
    loadingType, withLoading, cloudCount,
    aiDebugInfo, abortAnalysis, batchProgress,
    settings, viewMode, setViewMode, onRefresh,
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
