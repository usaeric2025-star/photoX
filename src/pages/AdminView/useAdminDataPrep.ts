import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { translations, LanguageCode } from '../../lib/translations';
import { useAdminFilters, useAdminImport, useAdminSync, useAdminAI, useAdminEdit } from '../../hooks/admin';
import { 
  useAuth, useFeedback, useTaskExecutor, useTasks, useAdminCategory, useMultiSelect, 
  useSyncEngine, useSettings, useCategoriesQuery, useTagsQuery, useManufacturersQuery, 
  useInfinitePhotos, usePhotoCountQuery, useSettingsMutation 
} from '@/hooks';
import { useGallerySync } from '@/hooks';
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
    filterCatId: s.filterCatId,
    filterTagIds: s.filterTagIds,
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
    isSyncing: s.isSyncing,
    setIsSyncing: s.setIsSyncing,
    geminiApiKey: s.geminiApiKey,
    setGeminiApiKey: s.setGeminiApiKey,
    customModel: s.customModel,
    setCustomModel: s.setCustomModel,
    setAccessPasscode: s.setAccessPasscode,
    setAlertDialog: s.setAlertDialog,
    setPromptDialog: s.setPromptDialog,
    setLightboxIndex: s.setLightboxIndex,
    totalCount: s.totalCount,
    isStaffMode: s.isStaffMode
  })));
  const { data: categories = [] } = useCategoriesQuery();
  const { data: tags = [] } = useTagsQuery();
  const { data: manufacturers = [] } = useManufacturersQuery();

  const infinitePhotosQuery = useInfinitePhotos({
    category_id: store.filterCatId,
    tag_id: Array.isArray(store.filterTagIds) && store.filterTagIds.length > 0 ? store.filterTagIds[0] : null,
    searchQuery: store.debouncedSearchQuery,
    sortOrder: store.sortOrder,
    isAdminMode: true
  }, PAGINATION.ADMIN_BATCH_SIZE);

  const { data: cloudCountData } = usePhotoCountQuery({}, true);
  const photos = useMemo(() => cleanPhotos(infinitePhotosQuery.data?.pages.flatMap(p => p.photos) || []), [infinitePhotosQuery.data]);

  const { settings, setSettings, refreshCloudData } = useSyncEngine();
  const { settings: fetchedSettings } = useSettings();
  const { mutateAsync: saveSettingsMut } = useSettingsMutation();

  // Initialize new admin hooks
  const filters = useAdminFilters(photos, categories, tags);
  const importer = useAdminImport(user, { setActiveScreen: store.setActiveScreen }, { setIsSyncing: store.setIsSyncing }, store.geminiApiKey, settings?.provider || 'openrouter', store.customModel, categories, tags, manufacturers, new Map(), useRef(photos));
  const sync = useAdminSync();
  const ai = useAdminAI(user, store.geminiApiKey, settings?.provider || 'openrouter', store.customModel, categories, tags, manufacturers, new Map(), useRef(photos));
  const edit = useAdminEdit(user, photos);

  const checkSyncLock = useCallback(() => store.isSyncing, [store.isSyncing]);
  const [initialPhotoId, setInitialPhotoId] = useState<string | null>(null);
  const [batchIsHiddenApplied, setBatchIsHiddenApplied] = useState(false);
  const [isMaintenanceRunning, setIsMaintenanceRunning] = useState(false);
  const [adminPreviewMode, setAdminPreviewMode] = useState<'private' | 'public'>('private');

  const infiniteQueryRef = useRef(infinitePhotosQuery);
  infiniteQueryRef.current = infinitePhotosQuery;

  const handleLoadMore = useCallback(() => {
    const q = infiniteQueryRef.current;
    if (!q.isFetchingNextPage && q.hasNextPage) {
      q.fetchNextPage();
    }
  }, []);

  // Sync logic to store
  useGallerySync(
    photos, cloudCountData, infinitePhotosQuery.isFetching, infinitePhotosQuery.isFetchingNextPage, 
    !!infinitePhotosQuery.hasNextPage, handleLoadMore,
    fetchedSettings as AppSettings, store.setGeminiApiKey, store.setCustomModel, store.setAccessPasscode
  );

  const { reset: resetMultiSelect, disable } = useMultiSelect();
  const uiBasicValue = useMemo(() => ({ setAlertDialog: store.setAlertDialog, setPromptDialog: store.setPromptDialog, setCloudCount: () => {}, cloudCount: cloudCountData || 0, editPhotoId: store.editPhotoId, setEditPhotoId: store.setEditPhotoId, batchEditIds: store.batchEditingIds, setBatchEditIds: store.setBatchEditingIds, setActiveScreen: store.setActiveScreen, abortAnalysis: () => {} }), [store, cloudCountData]);
  const categoryOps = useAdminCategory(uiBasicValue);

  const onEditPhotoById = useCallback((pOrId: Photo | string) => {
    const photo = typeof pOrId === 'string' ? photos.find(p => p.id === pOrId) : pOrId;
    if (!photo) return;
    if (photo.group_id) { setInitialPhotoId(photo.id); store.setActiveGroupId(photo.group_id); }
    store.setEditPhotoId(photo.id);
  }, [photos, store]);

  const actions = useAdminActions(photos, tasks, ai, edit, importer, sync, filters, categoryOps, {
    checkSyncLock, showError, showSuccess, setAlertDialog: store.setAlertDialog, setPromptDialog: store.setPromptDialog, setEditPhotoId: store.setEditPhotoId, setBatchEditIds: store.setBatchEditingIds, setActiveScreen: store.setActiveScreen, setActiveGroupId: store.setActiveGroupId, setInitialPhotoId, runTask, queryClient, infinitePhotosQuery, disable, batchEditIds: store.batchEditingIds || [], onEditPhotoById, tags
  });

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (checkSyncLock()) return;
    const file = e.target.files?.[0];
    if (!file) return;
    await runTask('上传 Logo', async () => {
        const url = await uploadLogo(file);
        if (url && settings) await saveSettingsMut({ ...settings, logo_url: url });
    }, { showSuccessToast: true });
  }, [checkSyncLock, settings, saveSettingsMut, runTask]);

  const handleRunMaintenance = useCallback(async () => {
    if (isMaintenanceRunning) return;
    setIsMaintenanceRunning(true);
    await runTask('自动修复缩略图 / Auto Repair ThumbHashes', async ({ updateProgress }) => {
        const { getPhotosWithoutThumbHash } = await import('@/services/photoService');
        const { backfillThumbHashes } = await import('@/services/photo/backfillService');
        updateProgress(15, '正在 analysis 未生成缩略图占位项目的数量...');
        const missingHashes = await getPhotosWithoutThumbHash();
        
        if (!missingHashes || missingHashes.length === 0) {
            updateProgress(100, '完美分析完成，没有缺失占位图的照片。');
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
        showErrorToast: true
    });
    setIsMaintenanceRunning(false);
  }, [runTask, showError, showSuccess, isMaintenanceRunning]);

  return useMemo(() => ({
    user, authChecked: true, logout, navigate, infinitePhotosQuery, t: translations[store.appLang as LanguageCode] || translations.en, lang: store.appLang, onRefresh: () => refreshCloudData(user, () => {}),
    ...store, ...filters, ...importer, ...sync, ...ai, ...edit, ...categoryOps, ...actions,
    photos, categories, tags, manufacturers, tagIdToNameMap: tags.reduce((acc, tag) => ({ ...acc, [tag.id]: tag.name }), {}),
    groupPhotos: store.activeGroupId ? photos.filter(p => p.group_id === store.activeGroupId) : [],
    initialPhotoId, setInitialPhotoId, checkSyncLock, loginWithGoogle, showError, onEditPhotoById, handleLogoUpload,
    isMaintenanceRunning, onRunMaintenance: handleRunMaintenance,
    handleManageClick: () => store.setActiveScreen('manage'),
    handleToggleHidden: (p: Photo) => {
      if (checkSyncLock()) {
        showError(new Error('系统忙碌'), '系统忙碌');
        return Promise.resolve();
      }
      return edit.updatePhoto(p.id, { is_hidden: !p.is_hidden }).then(() => showSuccess('已更新'));
    },
    handleBatchToggleHidden: (ids: string[]) => {
       if (checkSyncLock()) {
         showError(new Error('系统忙碌'), '系统忙碌');
         return Promise.resolve();
       }
       return edit.updatePhotosBulk(ids, { is_hidden: !photos.filter(p => ids.includes(p.id)).every(p => p.is_hidden) }).then(disable);
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
    cloudCount: store.totalCount,
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
  }), [user, logout, navigate, infinitePhotosQuery, store, filters, importer, sync, ai, edit, categoryOps, actions, photos, categories, tags, manufacturers, initialPhotoId, checkSyncLock, showError, onEditPhotoById, handleLogoUpload, showSuccess, disable, batchIsHiddenApplied, saveSettingsMut]);
};
