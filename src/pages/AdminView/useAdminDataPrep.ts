import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { translations, LanguageCode } from '../../lib/translations';
import { useAdminImport, useAdminAI, useAdminEdit } from '../../hooks/admin';
import { 
  useAuth, useFeedback, useTaskExecutor, useTasks, useAdminCategory, useMultiSelect, 
  useSyncEngine, useSettings, useCategoriesQuery, useTagsQuery, useManufacturersQuery, 
  useInfinitePhotos, usePhotoCountQuery, useSettingsMutation
} from '@/hooks';
import { useGroupPhotosQuery } from '../../hooks/queries/usePhotos';
import { useGalleryStore, useShallow } from '../../store';
import { useAdminActions } from './useAdminActions';
import { PAGINATION } from '../../constants/config';
import { Photo, AppSettings } from '../../types';
import { cleanPhotos } from '../../lib/filters';
import { useQueryClient } from '@tanstack/react-query';
import { hapticFeedback } from '../../utils/haptics';
import { loginWithGoogle } from '../../services/supabaseService';
import { uploadLogo } from '../../services/settingService';

export const useAdminDataPrep = () => {
  const { user, logout } = useAuth();
  const { showError, showSuccess } = useFeedback();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { runTask } = useTaskExecutor();
  const { tasks } = useTasks();

  const store = useGalleryStore(useShallow(s => ({
    searchQuery: s.searchQuery,
    setSearchQuery: s.setSearchQuery,
    setDebouncedSearchQuery: s.setDebouncedSearchQuery,
    filterCatId: s.filterCatId,
    setFilterCatId: s.setFilterCatId,
    filterSubId: s.filterSubId,
    setFilterSubId: s.setFilterSubId,
    filterTagIds: s.filterTagIds,
    setFilterTagIds: s.setFilterTagIds,
    debouncedSearchQuery: s.debouncedSearchQuery,
    sortOrder: s.sortOrder,
    appLang: s.appLang,
    editPhotoId: s.editPhotoId,
    setEditPhotoId: s.setEditPhotoId,
    batchEditingIds: s.batchEditingIds,
    setBatchEditingIds: s.setBatchEditingIds,
    setActiveScreen: s.setActiveScreen,
    activeScreen: s.activeScreen,
    setActiveGroupId: s.setActiveGroupId,
    activeGroupId: s.activeGroupId,
    setAlertDialog: s.setAlertDialog,
    setPromptDialog: s.setPromptDialog,
    setLightboxIndex: s.setLightboxIndex,
    isStaffMode: s.isStaffMode,
    isPhotoPickerOpen: s.isPhotoPickerOpen,
    setIsPhotoPickerOpen: s.setIsPhotoPickerOpen,
    photoPickerGroupId: s.photoPickerGroupId,
    setPhotoPickerGroupId: s.setPhotoPickerGroupId,
    resetForm: s.resetForm,
  })));
  
  const { settings, updateSettings, isLoading: isSettingsLoading } = useSettings();
  const geminiApiKey = settings?.gemini_api_key;
  const customModel = settings?.custom_model;
  const accessPasscode = settings?.access_passcode;

  const { data: categories = [] } = useCategoriesQuery();
  const { data: tags = [] } = useTagsQuery();
  const { data: manufacturers = [] } = useManufacturersQuery();

  const isActualAdminPath = window.location.pathname.startsWith('/admin');

  const infinitePhotosQuery = useInfinitePhotos({
    category_id: store.filterCatId,
    tag_id: Array.isArray(store.filterTagIds) && store.filterTagIds.length > 0 ? store.filterTagIds[0] : null,
    searchQuery: store.debouncedSearchQuery,
    sortOrder: store.sortOrder,
    isAdminMode: true
  }, isActualAdminPath ? PAGINATION.ADMIN_BATCH_SIZE : 1); // Fetch minimal if not in admin path

  const { data: cloudCountData } = usePhotoCountQuery({}, true);
  const photos = useMemo(() => cleanPhotos(infinitePhotosQuery.data?.pages.flatMap(p => p.photos) || []), [infinitePhotosQuery.data]);
  
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  const { refreshCloudData, performPush } = useSyncEngine();
  const { mutateAsync: saveSettingsMut } = useSettingsMutation();

  const { reset: resetMultiSelect, disable } = useMultiSelect();
  const editResult = useAdminEdit(user, photos, disable);
  const edit = useMemo(() => editResult, [editResult]);

  const isSyncing = useMemo(() => tasks.some(t => t.status === 'running' && (t.name.includes('同步') || t.name.includes('导入'))), [tasks]);
  const isAnalyzing = useMemo(() => tasks.some(t => t.status === 'running' && (t.name.includes('识别') || t.name.includes('分析'))), [tasks]);

  const checkSyncLock = useCallback(() => isSyncing, [isSyncing]);
  
  // Re-define handleRefresh locally since useAdminFilters is going away
  const handleRefreshFilters = useCallback(() => {
    store.setSearchQuery('');
    store.setDebouncedSearchQuery('');
    store.setFilterCatId(null);
    store.setFilterTagIds([]);
  }, [store.setSearchQuery, store.setDebouncedSearchQuery, store.setFilterCatId, store.setFilterTagIds]);

  const filters = useMemo(() => ({ 
    displayPhotos: photos, 
    gridPhotos: photos, 
    handleRefresh: handleRefreshFilters,
    searchQuery: store.searchQuery,
    debouncedSearchQuery: store.debouncedSearchQuery,
    filterCatId: store.filterCatId,
    filterSubId: store.filterSubId,
    filterTagIds: store.filterTagIds,
    sortOrder: store.sortOrder
  }), [photos, handleRefreshFilters, store.searchQuery, store.debouncedSearchQuery, store.filterCatId, store.filterSubId, store.filterTagIds, store.sortOrder]);

  const importerResult = useAdminImport(user, { setActiveScreen: store.setActiveScreen }, geminiApiKey, settings?.provider || 'openrouter', customModel || '', categories, tags, manufacturers, new Map(), photosRef);
  const aiResult = useAdminAI(user, geminiApiKey, settings?.provider || 'openrouter', customModel || '', categories, tags, manufacturers, new Map(), photosRef);

  const importer = useMemo(() => importerResult, [importerResult]);
  const sync = useMemo(() => ({
    settings,
    setSettings: updateSettings,
    refreshCloudData,
    performPush
  }), [settings, updateSettings, refreshCloudData, performPush]);
  const ai = useMemo(() => aiResult, [aiResult]);

  // Group Photos: Fetch independently so they aren't affected by filters (Category/Search)
  const groupPhotosQuery = useGroupPhotosQuery(store.activeGroupId || '', true);
  const groupPhotos = useMemo(() => cleanPhotos(groupPhotosQuery.data || []), [groupPhotosQuery.data]);

  const [initialPhotoId, setInitialPhotoId] = useState<string | null>(null);
  const [batchIsHiddenApplied, setBatchIsHiddenApplied] = useState(false);
  const isMaintenanceRunning = useMemo(() => tasks.some(t => t.status === 'running' && t.name.includes('自动修复')), [tasks]);
  const [adminPreviewMode, setAdminPreviewMode] = useState<'private' | 'public'>('private');

  const infiniteQueryRef = useRef(infinitePhotosQuery);
  infiniteQueryRef.current = infinitePhotosQuery;

  const handleLoadMore = useCallback(() => {
    const q = infiniteQueryRef.current;
    if (!q.isFetchingNextPage && q.hasNextPage) {
      q.fetchNextPage();
    }
  }, []);

  // Sync settings once if fetched
  const lastFetchedSettingsRef = useRef<any>(null);

  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      if (lastFetchedSettingsRef.current !== settings) {
         lastFetchedSettingsRef.current = settings;
      }
    }
  }, [settings]);

  const uiBasicValue = useMemo(() => ({ 
    setAlertDialog: store.setAlertDialog, 
    setPromptDialog: store.setPromptDialog, 
    setCloudCount: () => {}, 
    cloudCount: cloudCountData || 0, 
    editPhotoId: store.editPhotoId, 
    setEditPhotoId: store.setEditPhotoId, 
    batchEditIds: store.batchEditingIds, 
    setBatchEditIds: store.setBatchEditingIds, 
    setActiveScreen: store.setActiveScreen 
  }), [store.setAlertDialog, store.setPromptDialog, cloudCountData, store.editPhotoId, store.setEditPhotoId, store.batchEditingIds, store.setBatchEditingIds, store.setActiveScreen]);
  
  const categoryOpsResult = useAdminCategory(uiBasicValue);
  const categoryOps = useMemo(() => categoryOpsResult, [categoryOpsResult]);

  const onEditPhotoById = useCallback((pOrId: Photo | string) => {
    const photo = typeof pOrId === 'string' ? photos.find(p => p.id === pOrId) : pOrId;
    if (!photo) return;
    if (photo.group_id) { 
      setInitialPhotoId(photo.id); 
      store.setActiveGroupId(photo.group_id); 
    }
    store.setEditPhotoId(photo.id);
  }, [photos, store.setActiveGroupId, store.setEditPhotoId]);

  const actionsResult = useAdminActions(photos, tasks, ai, edit, importer, sync, filters, categoryOps, {
    checkSyncLock, showError, showSuccess, setAlertDialog: store.setAlertDialog, setPromptDialog: store.setPromptDialog, setEditPhotoId: store.setEditPhotoId, setBatchEditIds: store.setBatchEditingIds, setActiveScreen: store.setActiveScreen, setActiveGroupId: store.setActiveGroupId, setInitialPhotoId, runTask, queryClient, infinitePhotosQuery, disable, batchEditIds: store.batchEditingIds || [], onEditPhotoById, tags
  });
  const actions = useMemo(() => actionsResult, [actionsResult]);

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (checkSyncLock()) return;
    const file = e.target.files?.[0];
    if (!file) return;
    await runTask('上传 Logo', async () => {
        const url = await uploadLogo(file);
        if (url && settings) await saveSettingsMut({ ...settings, logo_url: url });
    }, { showSuccessToast: true, silent: true });
  }, [checkSyncLock, settings, saveSettingsMut, runTask]);

  const handleRunMaintenance = useCallback(async () => {
    if (isMaintenanceRunning) return;
    await runTask('自动修复缩略图 / Auto Repair ThumbHashes', async ({ updateProgress }) => {
        const { getPhotosWithoutThumbHash } = await import('@/services/photoService');
        const { backfillThumbHashes } = await import('@/services/photo/backfillService');
        updateProgress(15, '正在 analysis 未生成缩略图占位项目的数量...');
        const missingHashes = await getPhotosWithoutThumbHash();
        
        if (!missingHashes || missingHashes.length === 0) {
            updateProgress(100, '完美 analysis 完成，没有缺失占位图的照片。');
            return { skipped: true };
        }

        updateProgress(40, `正在为 ${missingHashes.length} 项商品自动回填修复...`);
        await backfillThumbHashes((stats) => {
            const progressPct = 40 + (stats.processed / stats.total) * 60;
            updateProgress(
                progressPct,
                `正在修复: ${stats.processed}/${stats.total} (成功: ${stats.success}, 失败: ${stats.failed})`
            );
        });
        return { skipped: false };
    }, {
        onSuccess: (res) => {
            if (res?.skipped) {
                showSuccess('诊断完成：所有照片缩略图高度一致，无需修复！ (已跳过已完善项目)');
            } else {
                showSuccess('缩略图自动修复完成');
            }
        },
        onError: (e) => {
            showError(e, '修复失败，已停止');
        },
        showSuccessToast: false,
        showErrorToast: true,
        silent: true
    });
  }, [runTask, showError, showSuccess, isMaintenanceRunning]);

  return useMemo(() => ({
    user, authChecked: true, logout, navigate, isLoadingPhotos: infinitePhotosQuery.isLoading, 
    t: translations[store.appLang as LanguageCode] || translations.en, 
    lang: store.appLang, 
    onRefresh: () => refreshCloudData(user, () => {}),
    ...store, 
    ...filters, 
    ...importer, 
    ...sync, 
    ...ai, 
    ...edit, 
    ...categoryOps, 
    ...actions,
    isSyncing,
    isAnalyzing,
    photos, categories, tags, manufacturers,
    groupPhotos,
    initialPhotoId, setInitialPhotoId, checkSyncLock, loginWithGoogle, showError, onEditPhotoById, handleLogoUpload,
    isMaintenanceRunning, 
    onRunMaintenance: handleRunMaintenance,
    disableMultiSelect: disable,
    handleManageClick: () => store.setActiveScreen('manage'),
    resetForm: store.resetForm,
    handleToggleHidden: (p: Photo) => {
      if (checkSyncLock()) {
        showError(new Error('系统忙碌'), '系统忙碌');
        return Promise.resolve();
      }
      return edit.updatePhoto(p.id, { is_hidden: !p.is_hidden });
    },
    handleBatchToggleHidden: (ids: string[]) => {
       if (checkSyncLock()) {
         showError(new Error('系统忙碌'), '系统忙碌');
         return Promise.resolve();
       }
       return edit.updatePhotosBulk(ids, { is_hidden: !photos.filter(p => ids.includes(p.id)).every(p => p.is_hidden) }).then(() => disable());
    },
    handleBatchEdit: (ids: string[]) => {
       if (checkSyncLock()) { showError(new Error('系统忙碌'), '系统忙碌'); return; }
       store.setBatchEditingIds(ids);
    },
    handleDeletePhotos: (ids: string[]) => {
      if (checkSyncLock()) { showError(new Error('系统忙碌'), '系统忙碌'); return; }
      actions.handleDeletePhoto(ids).then(disable);
    },
    handleUpdatePhoto: edit.updatePhoto,
    handleUpdatePhotosBulk: edit.updatePhotosBulk,
    handleAiAnalyze: ai.analyzeSingle,
    cloudCount: cloudCountData || 0,
    batchEditIds: store.batchEditingIds,
    batchIsHiddenApplied, setBatchIsHiddenApplied,
    adminPreviewMode, setAdminPreviewMode,
    quickAddManufacturer: actions.quickAddManufacturer,
    quickAddTag: actions.quickAddTag,
    onLongPressStart: (id: string) => hapticFeedback.medium(),
    onLongPressEnd: () => {},
    saveSettings: (s: any) => saveSettingsMut(s).then(res => ({ success: !!res, data: res })),
    updateTag: (id: string, name: string) => categoryOps.updateTag(id, { name }),
    updateCategory: (id: string, name: string) => categoryOps.updateCategory(id, { name }),
    updateManufacturer: (id: string, name: string) => categoryOps.updateManufacturer(id, { name }),
  }), [
    user, logout, navigate, infinitePhotosQuery.isLoading, 
    store, filters, importer, sync, ai, edit, categoryOps, actions, 
    isSyncing, isAnalyzing, photos, categories, tags, manufacturers, groupPhotos, initialPhotoId, 
    checkSyncLock, showError, onEditPhotoById, handleLogoUpload, showSuccess, disable, 
    batchIsHiddenApplied, saveSettingsMut, cloudCountData, adminPreviewMode, handleRunMaintenance, isMaintenanceRunning
  ]);
};
