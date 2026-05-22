import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { translations, LanguageCode } from '../../lib/translations';
import { 
  useAddTagMutation, useUpdateTagMutation, useDeleteTagMutation,
  useAddCategoryMutation, useUpdateCategoryMutation, useDeleteCategoryMutation,
  useAddManufacturerMutation, useUpdateManufacturerMutation, useDeleteManufacturerMutation,
  useUpdatePhotoMutation, useBatchEditMutation, useDeletePhotoMutation, useGroupPhotosMutation, useUngroupMutation,
  useSettingsMutation, useSyncMutation, useSettings,
  useAdminDialogs, useLoading, useInfinitePhotos, usePhotoCountQuery, useCategoriesQuery, useTagsQuery, useManufacturersQuery,
  useSyncEngine, usePhotoManagement, useAdminCategory, useAdminPhotos, useFeedback, useMultiSelect
} from '../../hooks';
import { useGalleryStore } from '../../store';
import { PAGINATION } from '../../constants/config';
import { ProductFormData, Photo, AppSettings } from '../../types';
import { cleanPhotos } from '../../lib/filters';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../hooks/queries/keys';
import { loadPhotosByGroupId } from '../../services/photoService';
import { hapticFeedback } from '../../utils/haptics';
import { uploadLogo } from '../../services/settingService';
import { loginWithGoogle } from '../../services/supabaseService';

export const useAdminDataPrep = () => {
  const { user, logout } = useAuth();
  const authChecked = true;
  const { showError, showSuccess } = useFeedback();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { alertDialog, setAlertDialog, promptDialog, setPromptDialog } = useAdminDialogs();
  const { loadingState: loadingType, setLoadingState: setLoadingType, withLoading } = useLoading();
  const [cloudCount, setCloudCount] = useState<number | null>(null);

  const { 
    filterCatId, filterTagIds, debouncedSearchQuery, sortOrder, appLang, activeScreen, setActiveScreen,
    geminiApiKey, setGeminiApiKey, accessPasscode, setAccessPasscode, customModel, setCustomModel,
    editPhotoId, setEditPhotoId, batchEditingIds: batchEditIds, setBatchEditingIds: setBatchEditIds,
    activeGroupId, setActiveGroupId, columns, setColumns,
    adminPreviewMode, setAdminPreviewMode, setIsSyncing, isSyncing,
    lightboxIndex, setLightboxIndex
  } = useGalleryStore();

  const [initialPhotoId, setInitialPhotoId] = useState<string | null>(null);

  const { data: categories = [] } = useCategoriesQuery();
  const { data: tags = [] } = useTagsQuery();
  const { data: manufacturers = [] } = useManufacturersQuery();

  const infinitePhotosQuery = useInfinitePhotos({
    category_id: filterCatId,
    tag_id: Array.isArray(filterTagIds) && filterTagIds.length > 0 ? filterTagIds[0] : null,
    searchQuery: debouncedSearchQuery,
    sortOrder: sortOrder,
    isAdminMode: true
  }, PAGINATION.ADMIN_BATCH_SIZE);

  const { data: cloudCountData } = usePhotoCountQuery({}, true);

  const photos = useMemo(() => {
    const allPhotos = infinitePhotosQuery.data?.pages.flatMap(p => p.photos) || [];
    return cleanPhotos(allPhotos);
  }, [infinitePhotosQuery.data]);

  useEffect(() => {
    setCloudCount(cloudCountData);
  }, [cloudCountData]);

  const { reset: resetMultiSelect, disable } = useMultiSelect();

  useEffect(() => {
    resetMultiSelect();
  }, [resetMultiSelect]);

  const handleLoadMoreAdmin = useCallback(() => {
    if (infinitePhotosQuery.hasNextPage && !infinitePhotosQuery.isFetchingNextPage) {
      infinitePhotosQuery.fetchNextPage();
    }
  }, [infinitePhotosQuery]);

  const { settings, setSettings, refreshCloudData } = useSyncEngine(withLoading);

  const { settings: fetchedSettings } = useSettings();
  useEffect(() => {
    if (fetchedSettings && Object.keys(fetchedSettings).length > 0) {
      setSettings(fetchedSettings as AppSettings);
    }
  }, [fetchedSettings, setSettings]);

  const uiBasicValue = useMemo(() => ({ 
    setAlertDialog, setPromptDialog, setLoadingType, loadingType, withLoading, setCloudCount,
    cloudCount, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds,
    setActiveScreen: (s: 'home' | 'manage' | 'login') => setActiveScreen(s),
    abortAnalysis: () => {}
  }), [setAlertDialog, setPromptDialog, setLoadingType, loadingType, withLoading, cloudCount, editPhotoId, batchEditIds, setActiveScreen, setBatchEditIds, setEditPhotoId]);

  const sessionBasicValue = useMemo(() => ({ settings, setSettings, setIsSyncing }), [settings, setSettings, setIsSyncing]);

  const {
    addCategory, updateCategory, deleteCategory,
    addManufacturer, updateManufacturer, deleteManufacturer,
    addTag, updateTag, deleteTag, removeTagFromPhoto
  } = useAdminCategory(uiBasicValue);

  const { mutateAsync: performPushSync } = useSyncMutation();
  const performPullSync = useCallback((loadNext?: boolean | number | string) => {
    if (loadNext === 1 || loadNext === true) { 
      handleLoadMoreAdmin(); 
      return Promise.resolve();
    }
    return infinitePhotosQuery.refetch();
  }, [handleLoadMoreAdmin, infinitePhotosQuery]);

  const { mutateAsync: handleUngroup } = useUngroupMutation();
  const { mutateAsync: saveSettings } = useSettingsMutation();

  const { 
    batchProgress, handleSingleAiAnalyze, handleTranslate, handleBatchAiIdentify, handleGroupAiIdentify, 
    handlePhotoImport, deletePhoto, updatePhoto, updatePhotosBulk, handleGroupPhotos,
    importProgress, importTotal, abortAnalysis, aiDebugInfo, setAiDebugInfo
  } = useAdminPhotos(
    user, settings?.gemini_api_key, settings?.provider || 'openrouter', settings?.custom_model || '', 
    { photos, categories, tags, manufacturers }, uiBasicValue, sessionBasicValue, addManufacturer
  );

  const photoManagement = usePhotoManagement(
    user, uiBasicValue, sessionBasicValue, photos, 
    (params: { id: string; updates: Partial<Photo> }) => updatePhoto(params.id, params.updates),
    (params: { userId: string; ids: string[]; updates: Partial<Photo> }) => updatePhotosBulk(params.ids, params.updates)
  );

  const {
    newPhotoData, setNewPhotoData, formState, updateForm,
    showOtherFields, setShowOtherFields, resetAddState,
    saveNewPhoto, saveBatchEdit
  } = photoManagement;

  const quickAddTag = useCallback(() => {
    setPromptDialog({
      title: '自定义标签 / Custom Tag',
      placeholder: '输入新标签名称 (例如: 清货)',
      onSubmit: async (val: string) => {
        const normalized = val.trim();
        if (!normalized) return;
        const existing = tags.find(t => t.name.toUpperCase() === normalized.toUpperCase());
        if (existing) {
          updateForm((prev: ProductFormData) => ({ ...prev, tag_ids: [...new Set([...(prev.tag_ids || []), String(existing.id)])] }));
          showError(new Error(`标签 "${normalized}" 已存在`), '新增标签');
          return;
        }
        try {
          const saved = await addTag(normalized);
          if (saved) {
             updateForm((prev: ProductFormData) => ({ ...prev, tag_ids: [...new Set([...(prev.tag_ids || []), String(saved.id)])] }));
          }
        } catch (e: unknown) {
          showError(e, '新增标签失败');
        }
      }
    });
  }, [setPromptDialog, tags, addTag, updateForm, showError]);

  const quickAddManufacturer = useCallback(() => {
    setPromptDialog({
      title: '新增厂商 / New Manufacturer',
      placeholder: '输入新厂商名称',
      onSubmit: async (val: string) => {
        const trimmed = val.trim();
        if (!trimmed) return;
         try {
           const saved = await addManufacturer(trimmed);
           if (saved) {
              updateForm((prev: ProductFormData) => ({ ...prev, manufacturer_id: saved.id }));
           }
         } catch (e: unknown) {
           showError(e, '新增厂商失败');
         }
      }
    });
  }, [setPromptDialog, addManufacturer, updateForm, showError]);

  const onRefresh = useCallback(() => refreshCloudData(user, true, setCloudCount), [user, refreshCloudData]);

  const lang = appLang as LanguageCode;
  const t = translations[lang] || translations.en;

  // Sync maps
  const tagIdToNameMap = useMemo(() => {
    return tags.reduce((acc, tag) => {
      acc[tag.id] = tag.name;
      return acc;
    }, {} as Record<string, string>);
  }, [tags]);

  // Action Lock Checks
  const checkSyncLock = useCallback(() => {
    if (loadingType === 'sync-pull' || loadingType === 'sync-push') {
       return true;
    }
    return false;
  }, [loadingType]);

  const [batchIsHiddenApplied, setBatchIsHiddenApplied] = useState(false);

  // CORE ACTIONS FROM useAdminViewLogic & useAdminActions
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
      message: `请选择对这 ${photosToProcess.length} 张照片批量识别的模式：\n\n•「跳过已完善」：仅 analysis 未完成或缺属性（如名称、标签、英文翻译）的照片，省时省额度（推荐）\n•「分析全部」：重新分析所有选择的照片，重写/更新现有属性`,
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
    } catch (e: unknown) {
      showError(e, 'toggle-pinned');
      throw e;
    }
  }, [checkSyncLock, photos, updatePhotosBulk, showError]);

  const toggleHidden = useCallback(async (photo: Photo) => {
    if (checkSyncLock()) return;
    const nextValue = !photo.is_hidden;
    
    try {
      await updatePhoto(photo.id, { is_hidden: nextValue });
    } catch (e: unknown) {
      showError(e, 'toggle-hidden');
      throw e;
    }
  }, [checkSyncLock, updatePhoto, showError]);

  const setGroupCover = useCallback(async (id: string, groupId: string) => {
    if (checkSyncLock()) return;
    let groupPhotosList = [];
    try {
      groupPhotosList = await loadPhotosByGroupId(groupId, true);
    } catch (e) {
      // Fallback
    }
    if (groupPhotosList.length === 0) {
      groupPhotosList = photos.filter((p: Photo) => p.group_id === groupId);
    }
    try {
      await Promise.all(
         groupPhotosList.map((p: Photo) => updatePhoto(p.id, { is_group_cover: p.id === id }))
      );
    } catch (e: unknown) {
      showError(e, 'set-group-cover');
      throw e;
    }
  }, [checkSyncLock, photos, updatePhoto, showError]);

  const saveBatchEditWithSuccess = useCallback(async (batchIsHiddenApplied: boolean) => {
    if (checkSyncLock()) return;
    try {
      await saveBatchEdit();
      showSuccess('批量更新成功');
    } catch (e) {
      showError(e, 'save-batch-edit');
      throw e;
    }
  }, [checkSyncLock, saveBatchEdit, showError, showSuccess]);

  const onLongPressStart = useCallback((id: string) => {
    hapticFeedback.medium();
  }, []);

  const onLongPressEnd = useCallback(() => {}, []);

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
    }
    setEditPhotoId(photo.id);
  }, [photos, setEditPhotoId, setActiveGroupId, setInitialPhotoId]);

  // FROM useAdminActions
  const handleLoadMoreCallback = useCallback(() => {
    if (infinitePhotosQuery.hasNextPage && !infinitePhotosQuery.isFetchingNextPage) {
       performPullSync(true);
    }
  }, [infinitePhotosQuery, performPullSync]);

  const handleManageClick = useCallback(() => setActiveScreen('manage'), [setActiveScreen]);
  
  const handleRefresh = useCallback(() => {
    if (checkSyncLock()) return;
    
    useGalleryStore.getState().setSearchQuery('');
    useGalleryStore.getState().setDebouncedSearchQuery('');
    useGalleryStore.getState().setFilterCatId(null);
    useGalleryStore.getState().setFilterTagIds([]);
    disable();
    
    sessionStorage.removeItem('photo-filters');
    localStorage.removeItem('photo-filters');
    
    queryClient.resetQueries({ queryKey: ['photos'] });
    queryClient.resetQueries({ queryKey: ['photos', 'infinite'] });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });

    performPullSync(true);
    showSuccess('已重置所有筛选');
  }, [checkSyncLock, performPullSync, showSuccess, queryClient, disable]);

  const handleToggleHidden = useCallback(async (photo: Photo) => {
    if (checkSyncLock()) {
      showError(new Error('系统正在同步，请稍后再操作'), '系统忙碌');
      return;
    }
    try {
      await toggleHidden(photo);
      showSuccess('已更新隐藏状态');
    } catch (e) {
      showError(e, '更新失败');
    }
  }, [checkSyncLock, toggleHidden, showSuccess, showError]);

  const handleBatchToggleHidden = useCallback(async (ids: string[]) => {
    if (checkSyncLock()) {
      showError(new Error('系统正在同步，请稍后再操作'), '系统忙碌');
      return;
    }
    const targetPhotos = photos.filter((p: Photo) => ids.includes(p.id));
    const allHidden = targetPhotos.every((p: Photo) => p.is_hidden);
    await updatePhotosBulk(ids, { is_hidden: !allHidden }, '批量更新隐藏状态');
    disable();
  }, [checkSyncLock, photos, updatePhotosBulk, disable, showError]);

  const handleEditPhoto = useCallback((id: string) => onEditPhotoById(id), [onEditPhotoById]);

  const handleDeletePhotos = useCallback((ids: string[]) => {
      if (checkSyncLock()) {
        showError(new Error('系统正在同步，请稍后再操作'), '系统忙碌');
        return;
      }
      handleDeletePhoto(ids);
      disable();
  }, [checkSyncLock, handleDeletePhoto, disable, showError]);

  const handleGroupPhotosCallback = useCallback(async (ids: string[]) => {
      if (checkSyncLock()) {
        showError(new Error('系统正在同步，请稍后再操作'), '系统忙碌');
        return;
      }
      try {
        await handleGroupPhotos(ids);
        disable();
      } catch (e: unknown) {
        showError(e, '合组失败');
      }
  }, [checkSyncLock, handleGroupPhotos, showError, disable]);

  const handleBatchEdit = useCallback((ids: string[]) => {
      if (checkSyncLock()) {
        showError(new Error('系统正在同步，请稍后再操作'), '系统忙碌');
        return;
      }
      setBatchEditIds(ids);
  }, [checkSyncLock, setBatchEditIds, showError]);

  const handleUngroupCallback = useCallback(async (groupId: string) => { 
    if (checkSyncLock()) return;
    try {
      await handleUngroup(groupId); 
    } catch (e: unknown) {
      showError(e, '拆组失败');
    }
  }, [checkSyncLock, handleUngroup, showError]);

  const handleBatchAiAnalyze = useCallback((photosToAnalyze: Photo[]) => {
    setAlertDialog({
      title: 'AI 群组智能识别 / Group AI Identify',
      message: `请选择对这 ${photosToAnalyze.length} 张照片进行群组识别的模式：\n\n•「跳过已完善」：仅分析未完成或缺属性的照片，避免重复工作和额外额度开销（推荐）\n•「分析全部」：重新分析并同步特征至该群组的所有照片`,
      cancelLabel: '取消 / Cancel',
      confirmLabel: '分析全部 / Analyze All',
      onConfirm: async () => {
         try {
           await withLoading('analyzing', () => handleGroupAiIdentify(photosToAnalyze, true));
         } catch (e: unknown) {
           showError(e, '识别失败');
         }
      },
      secondaryAction: {
         label: '跳过已完善 / Skip Completed',
         onClick: async () => {
            try {
              await withLoading('analyzing', () => handleGroupAiIdentify(photosToAnalyze, false));
            } catch (e: unknown) {
              showError(e, '识别失败');
            }
         }
      }
    });
  }, [setAlertDialog, withLoading, handleGroupAiIdentify, showError]);

  const handleAiAnalyze = useCallback((p: Photo) => {
    return handleSingleAiAnalyze(p.uri || p.image_url, p.category_id || undefined, p.id)
      .catch((e: Error) => showError(e, '识别失败'));
  }, [handleSingleAiAnalyze, showError]);

  const handleUpdatePhoto = useCallback(async (id: string, updates: Partial<Photo>) => {
    if (checkSyncLock()) return;
    try {
      await updatePhoto(id, updates);
    } catch (e: unknown) {
      showError(e, '更新照片属性失败');
    }
  }, [checkSyncLock, updatePhoto, showError]);

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (checkSyncLock()) return;
    const file = e.target.files?.[0];
    if (!file) return;

    await withLoading('saving', async () => {
      try {
        const url = await uploadLogo(file);
        if (url && settings) {
          const newSettings = { ...settings, logo_url: url };
          await saveSettings(newSettings);
          showSuccess('Logo 更新成功！');
        }
      } catch (err: unknown) {
        showError(err, 'Logo 上传失败');
      }
    });
  }, [checkSyncLock, settings, saveSettings, withLoading, showSuccess, showError]);

  const handlePerformPushSync = useCallback(async () => { 
    try {
      await withLoading('sync-push', async () => { 
        await performPushSync('push'); 
      }); 
      showSuccess('成功备份至云端！');
      return { success: true, data: null }; 
    } catch (err: unknown) {
      showError(err, '同步备份失败');
      throw err;
    }
  }, [performPushSync, withLoading, showSuccess, showError]);

  const handlePerformPullSync = useCallback(async () => { 
    try {
      await performPullSync('pull'); 
      showSuccess('成功自云端恢复！');
      return { success: true, data: null }; 
    } catch (err: unknown) {
      showError(err, '云端恢复失败');
      throw err;
    }
  }, [performPullSync, showSuccess, showError]);

  const handleSaveNewPhoto = useCallback(async () => {
    if (checkSyncLock()) return;
    try {
      await saveNewPhoto();
      showSuccess('照片已保存');
    } catch (e) {
      showError(e, '保存照片失败');
    }
  }, [checkSyncLock, saveNewPhoto, showSuccess, showError]);

  const handleImport = useCallback(() => {
    if (checkSyncLock()) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => handlePhotoImport(e as unknown as React.ChangeEvent<HTMLInputElement>, false).catch((err: Error) => showError(err, '导入图片失败'));
    input.click();
  }, [checkSyncLock, handlePhotoImport, showError]);

  // Typescript interface adapters
  const updateTagWrapper = useCallback((id: string, name: string) => {
    return updateTag(id, { name });
  }, [updateTag]);

  const updateCategoryWrapper = useCallback((id: string, name: string) => {
    return updateCategory(id, { name });
  }, [updateCategory]);

  const updateManufacturerWrapper = useCallback((id: string, name: string) => {
    return updateManufacturer(id, { name });
  }, [updateManufacturer]);

  const handleSaveSettingsWrapper = useCallback(async (newSettings: Partial<AppSettings>) => {
    const res = await saveSettings(newSettings);
    return { success: !!res, data: res as unknown as AppSettings };
  }, [saveSettings]);

  const handleTranslateWrapper = useCallback(async (text: string, currentLang: string, targetLang: string) => {
    try {
      const res = await handleTranslate(text);
      if (targetLang === 'en') return res.en;
      if (targetLang === 'ms') return res.ms;
      return text;
    } catch {
      return text;
    }
  }, [handleTranslate]);

  return {
    user, authChecked, logout, navigate,
    infinitePhotosQuery, t, lang, onRefresh,
    
    // Original states
    activeScreen, setActiveScreen, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds,
    alertDialog, setAlertDialog, promptDialog, setPromptDialog,
    loadingType, setLoadingType, withLoading, batchProgress, aiDebugInfo, setAiDebugInfo, abortAnalysis,
    isAnalyzing: loadingType === 'analyzing', cloudCount, setCloudCount,
    
    settings, adminPreviewMode, setAdminPreviewMode,
    photos, categories, tags, manufacturers, tagIdToNameMap, groupPhotos,
    handleSingleAiAnalyze, handleGroupAiIdentify, handlePhotoImport, importProgress, importTotal,
    handleBatchAiIdentifyTrigger, handleDeletePhoto,
    formState, updateForm, showOtherFields, setShowOtherFields, resetAddState, newPhotoData, setNewPhotoData,
    activeGroupId, setActiveGroupId, initialPhotoId, setInitialPhotoId, columns, setColumns, batchIsHiddenApplied, setBatchIsHiddenApplied,
    checkSyncLock, togglePinned, toggleHidden, setGroupCover,
    loginWithGoogle, showError,
    onEditPhotoById, hasNextPage: infinitePhotosQuery.hasNextPage, isFetchingNextPage: infinitePhotosQuery.isFetchingNextPage,

    // Adaptive Wrappers
    updateTag: updateTagWrapper,
    updateCategory: updateCategoryWrapper,
    updateManufacturer: updateManufacturerWrapper,
    saveSettings: handleSaveSettingsWrapper,
    handleTranslate: handleTranslateWrapper,
    handleGroupPhotos: handleGroupPhotosCallback,
    handleUngroup: handleUngroupCallback,
    performPushSync: handlePerformPushSync,
    performPullSync: handlePerformPullSync,

    // Actions implementations
    handleLoadMoreCallback, handleManageClick, handleRefresh, handleToggleHidden,
    handleBatchToggleHidden, handleEditPhoto, handleDeletePhotos,
    handleBatchEdit, handleBatchAiAnalyze, handleAiAnalyze,
    handleUpdatePhoto, handleLogoUpload,
    handleSaveNewPhoto, handleImport,
    lightboxIndex, setLightboxIndex,

    // Added missing bindings
    saveBatchEditWithSuccess,
    quickAddManufacturer,
    quickAddTag,
    deleteTag,
    addTag,
    onLongPressStart,
    onLongPressEnd,
    handlePerformPushSync,
    handlePerformPullSync
  };
};
