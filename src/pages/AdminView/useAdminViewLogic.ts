import { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useGalleryStore } from '../../store';
import { useErrorHandler, usePhotoManagement } from '../../hooks';
import { usePermission } from '../../hooks/usePermission';
import { User, Photo } from '../../types';
import { loginWithGoogle } from '../../services/supabaseService';

interface AdminViewLogicProps {
  user: User | null;
  sessionValue: any;
  photoValue: any;
  uiValue: any;
  onRefresh: () => void;
  performPullSync: (next: boolean) => Promise<any>;
}

export const useAdminViewLogic = (props: AdminViewLogicProps) => {
  const { user, sessionValue, photoValue, uiValue, onRefresh, performPullSync } = props;
  const { 
    isMultiSelect, setIsMultiSelect, selectedIds, setSelectedIds,
    setUser, setIsAdminMode, tagIdToNameMap
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
    updatePhoto = async () => {}, updatePhotosBulk = async () => {}
  } = photoValue || {};

  const { handleError } = useErrorHandler();
  const { isAdmin } = usePermission();

  useEffect(() => {
    setUser(user);
    setIsAdminMode(isAdmin);
  }, [user, setUser, setIsAdminMode, isAdmin]);

  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [columns, setColumns] = useState<2 | 3 | 5>(3);
  const [batchIsHiddenApplied, setBatchIsHiddenApplied] = useState(false);

  const checkSyncLock = useCallback(() => {
    if (loadingType === 'sync-pull' || loadingType === 'sync-push') {
       toast.error('同步中，请稍后再试 / Syncing, please try later');
       return true;
    }
    return false;
  }, [loadingType]);

  const { formState, updateForm, showOtherFields, setShowOtherFields, resetAddState, newPhotoData, setNewPhotoData } = usePhotoManagement(
    user, 
    { setAlertDialog, setPromptDialog, setActiveScreen, setLoadingType: () => {}, loadingType, withLoading, setCloudCount, cloudCount, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds, abortAnalysis: () => {} }, 
    { settings, setSettings, setIsSyncing }
  );

  useEffect(() => {
    if (editPhotoId && loadingType !== 'analyzing') {
       setAiDebugInfo(null);
    }
  }, [editPhotoId, loadingType, setAiDebugInfo]);

  const handleBatchAiIdentifyTrigger = async () => {
    if (checkSyncLock()) return;
    if (loadingType === 'analyzing') {
      abortAnalysis();
    } else {
      try {
        await withLoading('analyzing', () => handleBatchAiIdentify(photos));
      } catch (err) {
        handleError(err, 'ai-analyze');
      }
    }
  };

  const handleDeletePhoto = useCallback(async (id: string | string[]) => {
     try {
         await deletePhoto(id);
         toast.success('照片已成功删除');
         if (typeof id === 'string') setEditPhotoId(null);
         else resetAddState();
     } catch (error) {
         console.error('删除照片失败', error);
         handleError(error, 'delete-photo');
     }
  }, [deletePhoto, setEditPhotoId, resetAddState, handleError]);

  const togglePinned = useCallback(async (photo: Photo) => {
    if (checkSyncLock()) return;
    const newStatus = !photo.isPinned;
    const affectedIds = photo.groupId 
      ? photos.filter((p: Photo) => p.groupId === photo.groupId).map((p: Photo) => p.id)
      : [photo.id];
    try {
      await updatePhotosBulk(affectedIds, { isPinned: newStatus });
      onRefresh();
    } catch (e: any) {
      handleError(e, 'toggle-pinned');
    }
  }, [checkSyncLock, photos, updatePhotosBulk, handleError, onRefresh]);

  const toggleHidden = useCallback(async (photo: Photo) => {
    if (checkSyncLock()) return;
    const nextValue = !photo.is_hidden;

    try {
      await updatePhoto(photo.id, { is_hidden: nextValue });
      toast.success(`已${nextValue ? '隐藏' : '显示'}产品`);
      onRefresh(); // Trigger refresh
    } catch (e: any) {
      handleError(e, 'toggle-hidden');
    }
  }, [checkSyncLock, updatePhoto, handleError, onRefresh]);

  const setGroupCover = useCallback(async (id: string, groupId: string) => {
    if (checkSyncLock()) return;
    const groupPhotos = photos.filter((p: Photo) => p.groupId === groupId);
    
    toast.loading('正在设置封面...');
    try {
      await Promise.all(
        groupPhotos.map((p: Photo) => updatePhoto(p.id, { isGroupCover: p.id === id }))
      );
      toast.dismiss();
      toast.success('群组封面设置成功');
      onRefresh();
    } catch (e: any) {
      toast.dismiss();
      console.error('setGroupCover error', e);
      handleError(e, 'set-group-cover');
    }
  }, [checkSyncLock, photos, updatePhoto, handleError, onRefresh]);

  return useMemo(() => ({
    isMultiSelect, setIsMultiSelect, selectedIds, setSelectedIds, clearSelection,
    activeScreen, setActiveScreen, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds,
    loadingType, withLoading, cloudCount,
    aiDebugInfo, abortAnalysis, batchProgress,
    settings, viewMode, setViewMode, onRefresh,
    photos, categories, tags, manufacturers, tagIdToNameMap,
    handleSingleAiAnalyze, handleTranslate, handleGroupAiIdentify, handlePhotoImport, importProgress, importTotal,
    handleBatchAiIdentifyTrigger, handleDeletePhoto, handleGroupPhotos, handleUngroup,
    saveNewPhoto, saveBatchEdit, updateTag, deleteTag, updateCategory, deleteCategory,
    addCategory, addManufacturer, updateManufacturer, deleteManufacturer,
    addTag, quickAddTag, quickAddManufacturer, updatePhoto,
    formState, updateForm, showOtherFields, setShowOtherFields, resetAddState, newPhotoData, setNewPhotoData,
    activeGroupId, setActiveGroupId, columns, setColumns, batchIsHiddenApplied, setBatchIsHiddenApplied,
    checkSyncLock, togglePinned, toggleHidden, setGroupCover,
    performPushSync, performPullSync, saveSettings, loginWithGoogle, setAlertDialog, setPromptDialog, handleError
  }), [
    isMultiSelect, setIsMultiSelect, selectedIds, setSelectedIds, clearSelection,
    activeScreen, setActiveScreen, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds,
    loadingType, withLoading, cloudCount,
    aiDebugInfo, abortAnalysis, batchProgress,
    settings, viewMode, setViewMode, onRefresh,
    photos, categories, tags, manufacturers, tagIdToNameMap,
    handleSingleAiAnalyze, handleTranslate, handleGroupAiIdentify, handlePhotoImport, importProgress, importTotal,
    handleBatchAiIdentifyTrigger, handleDeletePhoto, handleGroupPhotos, handleUngroup,
    saveNewPhoto, saveBatchEdit, updateTag, deleteTag, updateCategory, deleteCategory,
    addCategory, addManufacturer, updateManufacturer, deleteManufacturer,
    addTag, quickAddTag, quickAddManufacturer, updatePhoto,
    formState, updateForm, showOtherFields, setShowOtherFields, resetAddState, newPhotoData, setNewPhotoData,
    activeGroupId, setActiveGroupId, columns, setColumns, batchIsHiddenApplied, setBatchIsHiddenApplied,
    checkSyncLock, togglePinned, toggleHidden, setGroupCover,
    performPushSync, performPullSync, saveSettings, loginWithGoogle, setAlertDialog, setPromptDialog, handleError
  ]);
};
