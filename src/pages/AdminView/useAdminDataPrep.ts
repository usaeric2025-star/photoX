import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useErrorHandler } from '../../utils/errorHandler';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { translations, LanguageCode } from '../../lib/translations';
import { 
  useAddTagMutation, useUpdateTagMutation, useDeleteTagMutation,
  useAddCategoryMutation, useUpdateCategoryMutation, useDeleteCategoryMutation,
  useAddManufacturerMutation, useUpdateManufacturerMutation, useDeleteManufacturerMutation,
  useUpdatePhotoMutation, useBatchEditMutation, useDeletePhotoMutation, useGroupPhotosMutation, useUngroupMutation,
  useSettingsMutation, useSyncMutation,
  useAdminDialogs, useLoading, useInfinitePhotosQuery, usePhotoCountQuery, useCategoriesQuery, useTagsQuery, useManufacturersQuery,
  useSyncEngine, usePhotoManagement, useAdminCategory, useAdminPhotos
} from '../../hooks';
import { useGalleryStore } from '../../store';
import { PAGINATION } from '../../constants/config';
import { ProductFormData, Photo } from '../../types';

const errorGuard = (name: string) => () => {
  console.error(`Blocked call to ${name}`);
  throw new Error(`[Architecture Error] Illegal call to "${name}".`);
};

export const useAdminDataPrep = () => {
  const { user, authChecked, logout } = useAuth();
  const { handleError } = useErrorHandler();
  const navigate = useNavigate();

  const { alertDialog, setAlertDialog, promptDialog, setPromptDialog } = useAdminDialogs();
  const [editPhotoId, setEditPhotoId] = useState<string | null>(null);
  const [batchEditIds, setBatchEditIds] = useState<string[] | null>(null);
  const { loadingState: loadingType, setLoadingState: setLoadingType, withLoading } = useLoading();
  const [cloudCount, setCloudCount] = useState<number | null>(null);

  const { 
    filterCatId, filterTagIds, debouncedSearchQuery, appLang, activeScreen, setActiveScreen,
    geminiApiKey, setGeminiApiKey, accessPasscode, setAccessPasscode, customModel, setCustomModel
  } = useGalleryStore();
  const { data: categories = [] } = useCategoriesQuery();
  const { data: tags = [] } = useTagsQuery();
  const { data: manufacturers = [] } = useManufacturersQuery();

  const infinitePhotosQuery = useInfinitePhotosQuery({
    categoryId: filterCatId,
    tagId: Array.isArray(filterTagIds) && filterTagIds.length > 0 ? filterTagIds[0] : null,
    searchQuery: debouncedSearchQuery,
    isAdminMode: true
  }, PAGINATION.ADMIN_BATCH_SIZE);

  const { data: cloudCountData } = usePhotoCountQuery({}, true);

  const photos = useMemo(() => {
    const allPhotos = infinitePhotosQuery.data?.pages.flatMap(p => p.photos) || [];
    return Array.from(new Map(allPhotos.map(p => [p.id, p])).values());
  }, [infinitePhotosQuery.data]);

  useEffect(() => {
    setCloudCount(cloudCountData);
  }, [cloudCountData]);

  useEffect(() => {
    // Ensure multi-select is off on route enter
    useGalleryStore.getState().setIsMultiSelect(false);
    useGalleryStore.getState().setSelectedIds([]);
  }, []);

  const handleLoadMoreAdmin = useCallback(() => {
    if (infinitePhotosQuery.hasNextPage && !infinitePhotosQuery.isFetchingNextPage) {
      infinitePhotosQuery.fetchNextPage();
    }
  }, [infinitePhotosQuery]);

  const { viewMode, setViewMode, settings, setSettings, refreshCloudData, isSyncing, setIsSyncing } = useSyncEngine(withLoading);

  const uiBasicValue = useMemo(() => ({ 
    setAlertDialog, setPromptDialog, setLoadingType, loadingType, withLoading, setCloudCount,
    cloudCount, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds,
    setActiveScreen: (s: 'home' | 'manage' | 'login') => setActiveScreen(s),
    abortAnalysis: errorGuard('abortAnalysis')
  }), [setAlertDialog, setPromptDialog, setLoadingType, loadingType, withLoading, cloudCount, editPhotoId, batchEditIds]);

  const sessionBasicValue = useMemo(() => ({ settings, setSettings, setIsSyncing }), [settings, setSettings, setIsSyncing]);

  const {
    addCategory, updateCategory, deleteCategory,
    addManufacturer, updateManufacturer, deleteManufacturer,
    addTag, updateTag, deleteTag, removeTagFromPhoto
  } = useAdminCategory(uiBasicValue);

  const { mutateAsync: performPushSync } = useSyncMutation();
  const performPullSync = useCallback((loadNext?: boolean | any) => {
    if (loadNext === 1 || loadNext === true) { 
      handleLoadMoreAdmin(); 
      return Promise.resolve();
    }
    return infinitePhotosQuery.refetch();
  }, [handleLoadMoreAdmin, infinitePhotosQuery]);

  const { mutateAsync: handleUngroup } = useUngroupMutation();
  const { mutateAsync: saveSettings } = useSettingsMutation();

  const { 
    batchProgress, aiDebugInfo, setAiDebugInfo, abortAnalysis, 
    handleSingleAiAnalyze, handleTranslate, handleBatchAiIdentify, handleGroupAiIdentify, 
    handlePhotoImport, deletePhoto, updatePhoto, updatePhotosBulk, handleGroupPhotos,
    importProgress, importTotal
  } = useAdminPhotos(
    user, settings?.gemini_api_key, settings?.provider || 'openrouter', settings?.custom_model || '', 
    { photos, categories, tags, manufacturers }, uiBasicValue, sessionBasicValue, addManufacturer
  );

  const { 
    newPhotoData, setNewPhotoData, formState, updateForm, 
    showOtherFields, setShowOtherFields, resetAddState, 
    saveNewPhoto, saveBatchEdit 
  } = usePhotoManagement(user, uiBasicValue, sessionBasicValue);

  const quickAddTag = useCallback(() => {
    setPromptDialog({
      title: '自定义标签 / Custom Tag',
      placeholder: '输入新标签名称 (例如: 清货)',
      onSubmit: async (val: string) => {
        const normalized = val.trim();
        if (!normalized) return;
        const existing = tags.find(t => t.name.toUpperCase() === normalized.toUpperCase());
        if (existing) {
          updateForm((prev: ProductFormData) => ({ ...prev, tagIds: [...new Set([...(prev.tagIds || []), String(existing.id)])] }));
          handleError(new Error(`标签 "${normalized}" 已存在`), '新增标签');
          return;
        }
        const saved = await addTag(normalized);
        if (saved) {
           updateForm((prev: ProductFormData) => ({ ...prev, tagIds: [...new Set([...(prev.tagIds || []), String(saved.id)])] }));
           toast.success(`已新增标签 "${normalized}"`);
        }
      }
    });
  }, [setPromptDialog, tags, addTag, updateForm]);

  const quickAddManufacturer = useCallback(() => {
    setPromptDialog({
      title: '新增厂商 / New Manufacturer',
      placeholder: '输入新厂商名称',
      onSubmit: async (val: string) => {
        const trimmed = val.trim();
        if (!trimmed) return;
        const saved = await addManufacturer(trimmed);
        if (saved) {
           updateForm((prev: ProductFormData) => ({ ...prev, manufacturerId: saved.id }));
           toast.success(`已新增厂商 "${trimmed}"`);
        }
      }
    });
  }, [setPromptDialog, addManufacturer, updateForm]);

  const onRefresh = useCallback(() => refreshCloudData(user, true, setCloudCount), [user, refreshCloudData]);

  const lang = appLang as LanguageCode;
  const t = translations[lang] || translations.en;

  const sessionValue = useMemo(() => ({
    user, isAdminMode: true, settings, setSettings, geminiApiKey, setGeminiApiKey,
    accessPasscode, setAccessPasscode, customModel, setCustomModel, viewMode, setViewMode,
    isSyncing, setIsSyncing, onRefresh, performPushSync, performPullSync, saveSettings, logout, appLang: lang
  }), [user, settings, geminiApiKey, accessPasscode, customModel, viewMode, isSyncing, onRefresh, performPushSync, performPullSync, saveSettings, logout, lang]);

  const photoValue = useMemo(() => ({
    photos, categories, tags, manufacturers, handleSingleAiAnalyze, handleTranslate, handleBatchAiIdentify,
    handleGroupAiIdentify, handlePhotoImport, importProgress, importTotal, deletePhoto, handleGroupPhotos, handleUngroup, saveNewPhoto, saveBatchEdit,
    updateTag, deleteTag, updateCategory, deleteCategory, addCategory, addManufacturer, updateManufacturer, deleteManufacturer,
    addTag, removeTagFromPhoto, quickAddTag, quickAddManufacturer, updatePhoto, updatePhotosBulk
  }), [
    photos, categories, tags, manufacturers, handleSingleAiAnalyze, handleTranslate, handleBatchAiIdentify,
    handleGroupAiIdentify, handlePhotoImport, importProgress, importTotal, deletePhoto, handleUngroup, saveNewPhoto, saveBatchEdit,
    updateTag, deleteTag, updateCategory, deleteCategory, addCategory, addManufacturer, updateManufacturer, deleteManufacturer,
    addTag, removeTagFromPhoto, quickAddTag, quickAddManufacturer, updatePhoto, updatePhotosBulk
  ]);

  const uiValue = useMemo(() => ({
    activeScreen, setActiveScreen, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds,
    alertDialog, setAlertDialog, promptDialog, setPromptDialog,
    loadingType, setLoadingType, withLoading, batchProgress, aiDebugInfo, setAiDebugInfo, abortAnalysis,
    isAnalyzing: loadingType === 'analyzing', cloudCount, setCloudCount
  }), [activeScreen, editPhotoId, batchEditIds, alertDialog, promptDialog, loadingType, withLoading, batchProgress, aiDebugInfo, cloudCount]);

  return {
    user, authChecked, logout, navigate,
    infinitePhotosQuery, t, lang, onRefresh,
    sessionValue, photoValue, uiValue
  };
};
