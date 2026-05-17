import { useState, useCallback, useEffect } from 'react';
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
    isMultiSelect, setIsMultiSelect, selectedIds, setSelectedIds, clearSelection,
    setUser, setIsAdminMode, tagIdToNameMap
  } = useGalleryStore();
  
  const { 
    activeScreen, setActiveScreen, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds, 
    loadingType, withLoading, cloudCount, setCloudCount,
    setAlertDialog, setPromptDialog, setAiDebugInfo, abortAnalysis, batchProgress, aiDebugInfo
  } = uiValue;

  const {
    settings, setSettings, viewMode, setViewMode, setIsSyncing,
    performPushSync, saveSettings
  } = sessionValue;

  const {
    photos, categories, tags, manufacturers,
    handleSingleAiAnalyze, handleTranslate, handleBatchAiIdentify, handleGroupAiIdentify, handlePhotoImport,
    deletePhoto, handleGroupPhotos, handleUngroup, saveNewPhoto, saveBatchEdit,
    updateTag, deleteTag, updateCategory, deleteCategory, addCategory,
    addManufacturer, updateManufacturer, deleteManufacturer,
    addTag, quickAddTag, quickAddManufacturer,
    updatePhoto, updatePhotosBulk
  } = photoValue;

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

  const togglePinned = async (photo: Photo) => {
    if (checkSyncLock()) return;
    const newStatus = !photo.isPinned;
    const affectedIds = photo.groupId 
      ? photos.filter((p: Photo) => p.groupId === photo.groupId).map((p: Photo) => p.id)
      : [photo.id];
    try {
      await updatePhotosBulk(affectedIds, { isPinned: newStatus });
    } catch (e: any) {
      handleError(e, 'toggle-pinned');
    }
  };

  const toggleHidden = async (photo: Photo) => {
    if (checkSyncLock()) return;
    try {
      await updatePhoto(photo.id, { isHidden: !photo.isHidden });
    } catch (e: any) {
      handleError(e, 'toggle-hidden');
    }
  };

  const setGroupCover = async (id: string, groupId: string) => {
    if (checkSyncLock()) return;
    const groupPhotos = photos.filter((p: Photo) => p.groupId === groupId);
    try {
      await Promise.all(
        groupPhotos.map((p: Photo) => updatePhoto(p.id, { isGroupCover: p.id === id }))
      );
    } catch (e: any) {
      handleError(e, 'set-group-cover');
    }
  };

  return {
    isMultiSelect, setIsMultiSelect, selectedIds, setSelectedIds, clearSelection,
    activeScreen, setActiveScreen, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds,
    loadingType, withLoading, cloudCount,
    aiDebugInfo, abortAnalysis, batchProgress,
    settings, viewMode, setViewMode, onRefresh,
    photos, categories, tags, manufacturers, tagIdToNameMap,
    handleSingleAiAnalyze, handleTranslate, handleGroupAiIdentify, handlePhotoImport,
    handleBatchAiIdentifyTrigger, handleDeletePhoto, handleGroupPhotos, handleUngroup,
    saveNewPhoto, saveBatchEdit, updateTag, deleteTag, updateCategory, deleteCategory,
    addCategory, addManufacturer, updateManufacturer, deleteManufacturer,
    addTag, quickAddTag, quickAddManufacturer, updatePhoto,
    formState, updateForm, showOtherFields, setShowOtherFields, resetAddState, newPhotoData, setNewPhotoData,
    activeGroupId, setActiveGroupId, columns, setColumns, batchIsHiddenApplied, setBatchIsHiddenApplied,
    checkSyncLock, togglePinned, toggleHidden, setGroupCover,
    performPushSync, performPullSync, saveSettings, loginWithGoogle, setAlertDialog, setPromptDialog, handleError
  };
};
