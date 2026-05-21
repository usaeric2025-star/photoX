import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { translations, LanguageCode } from '../../lib/translations';
import { 
  useAddTagMutation, useUpdateTagMutation, useDeleteTagMutation,
  useAddCategoryMutation, useUpdateCategoryMutation, useDeleteCategoryMutation,
  useAddManufacturerMutation, useUpdateManufacturerMutation, useDeleteManufacturerMutation,
  useUpdatePhotoMutation, useBatchEditMutation, useDeletePhotoMutation, useGroupPhotosMutation, useUngroupMutation,
  useSettingsMutation, useSyncMutation,
  useAdminDialogs, useLoading, useInfinitePhotos, usePhotoCountQuery, useCategoriesQuery, useTagsQuery, useManufacturersQuery,
  useSyncEngine, usePhotoManagement, useAdminCategory, useAdminPhotos, useFeedback, useMultiSelect
} from '../../hooks';
import { useGalleryStore } from '../../store';
import { PAGINATION } from '../../constants/config';
import { ProductFormData, Photo } from '../../types';
import { cleanPhotos } from '../../lib/filters';
import { syncCache } from '../../utils/indexedDB';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../hooks/queries/keys';

const errorGuard = (name: string) => () => {
  console.error(`Blocked call to ${name}`);
  throw new Error(`[Architecture Error] Illegal call to "${name}".`);
};

export const useAdminDataPrep = () => {
  const { user, authChecked, logout } = useAuth();
  const { showError, showSuccess } = useFeedback();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Load from IndexedDB on mount for instant UI
  useEffect(() => {
    // Disabled hydration because it conflicts with useInfiniteQuery's internal structure and staleTime
  }, [queryClient]);

  const { alertDialog, setAlertDialog, promptDialog, setPromptDialog } = useAdminDialogs();
  const [editPhotoId, setEditPhotoId] = useState<string | null>(null);
  const [batchEditIds, setBatchEditIds] = useState<string[] | null>(null);
  const { loadingState: loadingType, setLoadingState: setLoadingType, withLoading } = useLoading();
  const [cloudCount, setCloudCount] = useState<number | null>(null);

  const { 
    filterCatId, filterTagIds, debouncedSearchQuery, sortOrder, appLang, activeScreen, setActiveScreen,
    geminiApiKey, setGeminiApiKey, accessPasscode, setAccessPasscode, customModel, setCustomModel
  } = useGalleryStore();
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

  const { reset: resetMultiSelect } = useMultiSelect();

  useEffect(() => {
    // Ensure multi-select is off on route enter
    resetMultiSelect();
  }, [resetMultiSelect]);

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
        } catch (e: any) {
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
             updateForm((prev: ProductFormData) => ({ ...prev, manufacturerId: saved.id }));
          }
        } catch (e: any) {
          showError(e, '新增厂商失败');
        }
      }
    });
  }, [setPromptDialog, addManufacturer, updateForm, showError]);

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
    addTag, removeTagFromPhoto, quickAddTag, quickAddManufacturer, updatePhoto, updatePhotosBulk,
    formState, updateForm, showOtherFields, setShowOtherFields, resetAddState, newPhotoData, setNewPhotoData
  }), [
    photos, categories, tags, manufacturers, handleSingleAiAnalyze, handleTranslate, handleBatchAiIdentify,
    handleGroupAiIdentify, handlePhotoImport, importProgress, importTotal, deletePhoto, handleUngroup, saveNewPhoto, saveBatchEdit,
    updateTag, deleteTag, updateCategory, deleteCategory, addCategory, addManufacturer, updateManufacturer, deleteManufacturer,
    addTag, removeTagFromPhoto, quickAddTag, quickAddManufacturer, updatePhoto, updatePhotosBulk,
    formState, updateForm, showOtherFields, setShowOtherFields, resetAddState, newPhotoData, setNewPhotoData
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
