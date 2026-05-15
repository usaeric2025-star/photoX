import { toast } from 'sonner';
import React, { useState, useEffect, useCallback } from 'react';
import { loginWithGoogle } from '../services/supabaseService';
import { ErrorBoundary } from '../components/ErrorBoundary';

import { PhotoEditDrawer } from '../components/admin/PhotoEditDrawer';
import { AdminHeader } from '../components/admin/AdminHeader';
import { FloatingActionButton } from '../components/admin/FloatingActionButton';
import { BatchEditScreen } from '../components/admin/BatchEditScreen';
import { AdminGalleryShell } from '../components/AdminGalleryShell';
import { PublicGallery } from '../components/PublicGallery';
import { SettingsScreen } from '../components/SettingsScreen';
import { GroupDetailView } from '../components/GroupDetailView';
import { useSyncEngine } from '../hooks/useSyncEngine';
import { useAdminPhotos } from '../hooks/useAdminPhotos';
import { useAdminCategory } from '../hooks/useAdminCategory';
import { useAdminCore } from '../hooks/useAdminCore';
import { usePhotoManagement } from '../hooks/usePhotoManagement';
import { useGallery } from '../hooks/useGallery';
import { useErrorHandler } from '../utils/errorHandler';
import { usePermission } from '../hooks/usePermission';
import { useDelete } from '../hooks/useDelete';
import { Photo, Category, Tag, Manufacturer, User, ProductFormData } from '../types';
import { LanguageCode } from '../lib/translations';
import { PAGINATION } from '../constants/config';
import { AdminSessionProvider, AdminPhotoProvider, AdminUIProvider } from '../context/AdminContexts';
import { safeArray } from '../lib/utils';

import { AdminGlobalModals } from '../components/admin/AdminGlobalModals';
import { ErrorLogViewer } from '../components/admin/ErrorLogViewer';

// ... (in AdminViewContent component)
const errorGuard = (name: string) => () => {
  const { handleError } = useErrorHandler();
  const err = new Error(`[Architecture Error] Illegal call to "${name}".`);
  handleError(err, "errorGuard");
  throw err;
};

export function AdminViewContent({ user, logout, errorContent, t, lang, uiProps, dialogProps }: { 
  user: User | null, 
  authChecked: boolean, 
  logout: () => void, 
  errorContent: React.ReactNode,
  t: any,
  lang: LanguageCode,
  uiProps: {
    activeScreen: 'home' | 'manage' | 'login';
    setActiveScreen: (s: 'home' | 'manage' | 'login') => void;
    editPhotoId: string | null;
    setEditPhotoId: (id: string | null) => void;
    batchEditIds: string[] | null;
    setBatchEditIds: (ids: string[] | null) => void;
    loadingState: 'idle' | 'syncing' | 'analyzing' | 'importing' | 'compressing' | 'uploading' | 'saving' | 'deleting';
    setLoadingState: (s: 'idle' | 'syncing' | 'analyzing' | 'importing' | 'compressing' | 'uploading' | 'saving' | 'deleting') => void;
    withLoading: <T>(state: 'idle' | 'syncing' | 'analyzing' | 'importing' | 'compressing' | 'uploading' | 'saving' | 'deleting', fn: () => Promise<T>) => Promise<T>;
    cloudCount: number | null;
    setCloudCount: (c: number | null) => void;
  },
  dialogProps: {
    alertDialog: { title: string, message: string, onConfirm?: () => void, onCancel?: () => void, confirmLabel?: string, type?: 'danger' | 'info' } | null;
    setAlertDialog: (d: { title: string, message: string, onConfirm?: () => void, onCancel?: () => void, confirmLabel?: string, type?: 'danger' | 'info' } | null) => void;
    promptDialog: { title: string, message?: string, placeholder?: string, onSubmit: (val: string) => void } | null;
    setPromptDialog: (d: { title: string, message?: string, placeholder?: string, onSubmit: (val: string) => void } | null) => void;
    promptValue: string;
    setPromptValue: (v: string) => void;
  }
}) {
  const { 
    photos, setPhotos, categories, setCategories, tags, setTags, manufacturers, setManufacturers, 
    gridPhotos, displayPhotos, isMultiSelect, setIsMultiSelect, selectedIds, setSelectedIds,
    setUser, setIsAdminMode,
    visibleCount, setVisibleCount, tagIdToNameMap, clearSelection, totalGridCount
  } = useGallery();
  
  const { alertDialog, setAlertDialog, promptDialog, setPromptDialog } = dialogProps;
  const { activeScreen, setActiveScreen, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds, loadingState, setLoadingState, withLoading, cloudCount, setCloudCount } = uiProps;

  const { handleError } = useErrorHandler();
  const { canDelete, isAdmin } = usePermission();
  const { deletePhotos, deleteTag: deleteTagHook, deleteCategory: deleteCategoryHook, deleteGroup } = useDelete();

  useEffect(() => {
    setUser(user);
    setIsAdminMode(isAdmin);
  }, [user, setUser, setIsAdminMode, isAdmin]);

  useEffect(() => {
    // @ts-ignore
    window.__debug_photos = photos;
  }, [photos]);
  
  const cancelBatchAiRef = React.useRef(false);
  
  const [appLang] = useState('zh');
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [columns, setColumns] = useState<2 | 3 | 5>(3);
  
  const { viewMode, setViewMode, settings, setSettings, refreshCloudData, handleLogoUpload, isSyncing, setIsSyncing } = useSyncEngine(withLoading);
  const lastSyncTimeStr = localStorage.getItem('lastSyncTime');
  const lastSyncTime = lastSyncTimeStr ? new Date(lastSyncTimeStr).getTime() : null;
  const [accessPasscode, setAccessPasscode] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [customModel, setCustomModel] = useState('gemini-1.5-flash');

  useEffect(() => {
    if (settings) {
      if (settings.gemini_api_key) setGeminiApiKey(settings.gemini_api_key);
      if (settings.custom_model) setCustomModel(settings.custom_model);
      if (settings.access_passcode) setAccessPasscode(settings.access_passcode);
    }
  }, [settings]);
  
  const uiBasicValue = React.useMemo(() => ({ 
    setAlertDialog, 
    setPromptDialog, 
    setActiveScreen: (s: 'home' | 'manage' | 'login') => setActiveScreen(s),
    setLoadingState,
    loadingState,
    withLoading,
    setCloudCount,
    cloudCount,
    editPhotoId, setEditPhotoId,
    batchEditIds, setBatchEditIds,
    abortAnalysis: errorGuard('abortAnalysis')
  }), [setAlertDialog, setPromptDialog, setActiveScreen, setLoadingState, loadingState, withLoading, setCloudCount, cloudCount, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds]);

  const sessionBasicValue = React.useMemo(() => ({ 
    settings,
    setSettings,
    setIsSyncing
  }), [settings, setSettings, setIsSyncing]);

  const { newPhotoData, setNewPhotoData, formState, updateForm, showOtherFields, setShowOtherFields, resetAddState, saveNewPhoto, saveBatchEdit } = usePhotoManagement(user, uiBasicValue, sessionBasicValue);

  const { 
    updateTag, 
    addCategory, updateCategory, deleteCategory, 
    addManufacturer, updateManufacturer, deleteManufacturer,
    addTag, removeTagFromPhoto
  } = useAdminCategory(uiBasicValue);

  const { 
    saveSettings,
    performPushSync, performPullSync, handleSingleAiAnalyzeCallback, 
    handleUngroup, handleGroupPhotos 
  } = useAdminCore(user);

  const quickAddTag = useCallback(() => {
    setPromptDialog({
      title: '自定义标签 / Custom Tag',
      placeholder: '输入新标签名称 (例如: 清货)',
      onSubmit: async (val: string) => {
        const normalized = val.trim();
        if (!normalized) return;
        const existing = safeArray(tags).find(t => t.name.toUpperCase() === normalized.toUpperCase());
        if (existing) {
          updateForm((prev: ProductFormData) => ({ ...prev, tagIds: [...new Set([...safeArray(prev.tagIds), String(existing.id)])] }));
          toast.error(`标签 "${normalized}" 已存在`);
          return;
        }
        const saved = await addTag(normalized);
        if (saved) {
           updateForm((prev: ProductFormData) => ({ 
             ...prev, 
             tagIds: [...new Set([...safeArray(prev.tagIds), String(saved.id)])] 
           }));
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


  const { 
    batchProgress, 
    aiDebugInfo, setAiDebugInfo, abortAnalysis, 
    handleSingleAiAnalyze, handleTranslate, handleBatchAiIdentify, handleGroupAiIdentify, 
    handlePhotoImport, deletePhoto, updatePhoto, updatePhotosBulk
  } = useAdminPhotos(
    user, 
    settings?.gemini_api_key, 
    settings?.provider || 'openrouter', 
    settings?.custom_model || '', 
    uiBasicValue,
    sessionBasicValue,
    addManufacturer
  );

  const actualLoadingState = loadingState;

  // Clear stale AI errors when entering edit mode, unless we are currently analyzing
  useEffect(() => {
    if (editPhotoId && actualLoadingState !== 'analyzing') {
       setAiDebugInfo(null);
    }
  }, [editPhotoId, actualLoadingState, setAiDebugInfo]);

  const handleDeletePhoto = useCallback(async (id: string) => {
     const { success, error } = await deletePhotos(id);
     if (success) {
         toast.success('照片已成功删除');
         setEditPhotoId(null);
     } else {
         handleError(error, '删除照片失败');
     }
  }, [deletePhotos, setEditPhotoId, handleError]);

  const handleDeleteTag = useCallback(async (id: string) => {
    const { success, error } = await deleteTagHook(id);
    if (success) {
        toast.success('标签已成功删除');
    } else {
        handleError(error, '删除标签失败');
    }
  }, [deleteTagHook, handleError]);
  
  // Auto refresh
  useEffect(() => {
    refreshCloudData(user, false, setCloudCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = useCallback(() => 
    refreshCloudData(user, true, setCloudCount), 
    [user, refreshCloudData, setCloudCount]);

  const sessionValue = React.useMemo(() => ({
    user, isAdminMode: true, 
    settings, setSettings, geminiApiKey, setGeminiApiKey,
    accessPasscode, setAccessPasscode, customModel, setCustomModel,
    viewMode, setViewMode,
    isSyncing, setIsSyncing, onRefresh,
    loginWithGoogle, logout, appLang: lang
  }), [user, settings, setSettings, geminiApiKey, setGeminiApiKey, accessPasscode, setAccessPasscode, customModel, setCustomModel, viewMode, setViewMode, isSyncing, setIsSyncing, onRefresh, logout, lang]);

  const photoValue = React.useMemo(() => ({
    photos, setPhotos, categories, setCategories, tags, setTags,
    manufacturers, setManufacturers,
    handleSingleAiAnalyze, handleTranslate, handleBatchAiIdentify, handleGroupAiIdentify, handlePhotoImport,
    handleSingleAiAnalyzeCallback,
    deletePhoto, handleGroupPhotos, handleUngroup, saveNewPhoto, saveBatchEdit,
    updateTag, deleteTag: handleDeleteTag, 
    updateCategory, deleteCategory, addCategory,
    addManufacturer, updateManufacturer, deleteManufacturer,
    addTag, removeTagFromPhoto,
    quickAddTag,
    quickAddManufacturer,
    deleteGroup,
    updatePhoto,
    updatePhotosBulk
  }), [
    photos, setPhotos, categories, setCategories, tags, setTags, manufacturers, setManufacturers,
    handleSingleAiAnalyze, handleTranslate, handleBatchAiIdentify, handleGroupAiIdentify, handlePhotoImport, 
    handleSingleAiAnalyzeCallback, deletePhoto, handleGroupPhotos, handleUngroup, saveNewPhoto, saveBatchEdit,
    updateTag, handleDeleteTag, updateCategory, deleteCategory, addCategory, addManufacturer, updateManufacturer, deleteManufacturer,
    addTag, removeTagFromPhoto, quickAddTag, quickAddManufacturer, deleteGroup, updatePhoto, updatePhotosBulk
  ]);

  const uiValue = React.useMemo(() => ({
    activeScreen, setActiveScreen, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds,
    alertDialog, setAlertDialog, promptDialog, setPromptDialog,
    loadingState: actualLoadingState, setLoadingState, withLoading, batchProgress, aiDebugInfo, setAiDebugInfo, abortAnalysis,
    isAnalyzing: actualLoadingState === 'analyzing'
  }), [
    activeScreen, editPhotoId, batchEditIds, alertDialog, setAlertDialog, promptDialog, setPromptDialog,
    actualLoadingState, setLoadingState, withLoading, batchProgress, aiDebugInfo, setAiDebugInfo, abortAnalysis
  ]);

  const handleBatchAiIdentifyTrigger = () => {
    if (actualLoadingState === 'analyzing') {
      abortAnalysis();
    } else {
      handleBatchAiIdentify(displayPhotos);
    }
  };
  
  const [batchIsHiddenApplied, setBatchIsHiddenApplied] = useState(false);
  
  return (
    <ErrorBoundary key="admin-main">
      <AdminSessionProvider value={sessionValue}>
        <AdminPhotoProvider value={photoValue}>
          <AdminUIProvider value={uiValue}>
            <AdminGlobalModals />

            {errorContent}
            <div className="px-6 pb-6">
               <ErrorLogViewer />
            </div>
      
            {batchEditIds && (
              <BatchEditScreen 
                resetAddState={() => { resetAddState(); }}
                saveBatchEdit={saveBatchEdit}
                batchEditIds={batchEditIds}
                formState={formState}
                updateForm={updateForm}
                batchIsHiddenApplied={batchIsHiddenApplied}
                setBatchIsHiddenApplied={setBatchIsHiddenApplied}
                showOtherFields={showOtherFields}
                setShowOtherFields={setShowOtherFields}
                onDelete={async (ids) => {
                  const sIds = safeArray(ids);
                  const { success, error } = await deletePhotos(sIds);
                  if (success) {
                    toast.success(`已成功删除 ${sIds.length} 张照片`);
                    resetAddState();
                  } else {
                    handleError(error, '批量删除失败');
                  }
                }}
              />
            )}
            
            {activeGroupId && (
              <GroupDetailView
                activeGroupId={activeGroupId}
                setActiveGroupId={setActiveGroupId}
                setAlertDialog={setAlertDialog}
                photos={photos}
                displayPhotos={safeArray(photos).filter(p => p.groupId === activeGroupId)}
                setLightboxIndex={() => {}}
                isAdminMode={true}
                isStaffMode={true}
                onEditPhoto={(p) => { setEditPhotoId(p.id); }}
                onLongPressStart={() => {}}
                onLongPressEnd={() => {}}
                onBatchEdit={(ids) => { setBatchEditIds(ids); }}
                onUngroup={async (groupId) => { 
                  await handleUngroup(groupId); 
                }}
                onAddPhotoToGroup={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.multiple = true;
                  input.onchange = (e) => handlePhotoImport(e as unknown as React.ChangeEvent<HTMLInputElement>, false);
                  input.click();
                }}
                setPhotos={setPhotos}
                lang={lang}
                t={t}
                categories={categories}
                manufacturers={manufacturers}
                allTags={tags}
                tagMap={Object.fromEntries(tagIdToNameMap)}
                onBatchAiAnalyze={handleGroupAiIdentify}
                onAiAnalyze={(p) => {
                  handleSingleAiAnalyze(p.uri || p.image_url, p.categoryId || undefined, p.id);
                }}
                onToggleHidden={async (photo) => {
                  const newStatus = !photo.isHidden;
                  try {
                    await updatePhoto(photo.id, { isHidden: newStatus });
                  } catch (e) {
                    handleError(e, '切换隐藏状态失败');
                  }
                }}
                updatePhoto={updatePhoto}
              />
            )}
      
            {activeScreen === 'manage' && (
               <SettingsScreen 
                 setActiveScreen={setActiveScreen}
                 saveSettings={saveSettings}
                 handleLogoUpload={handleLogoUpload}
                 performPushSync={() => performPushSync(settings, refreshCloudData, lastSyncTime)}
                 performPullSync={() => performPullSync(refreshCloudData)}
                 cloudCount={cloudCount}
                 lastSyncTime={lastSyncTime}
                 isSyncing={isSyncing}
               />
            )}
      
            {(editPhotoId || newPhotoData) && (
                <PhotoEditDrawer 
                    editPhotoId={editPhotoId} 
                    resetAddState={resetAddState} 
                    saveNewPhoto={saveNewPhoto} 
                    formState={formState}
                    updateForm={updateForm}
                    showOtherFields={showOtherFields} 
                    setShowOtherFields={setShowOtherFields}
                    newPhotoData={newPhotoData} 
                    setNewPhotoData={setNewPhotoData}
                    onDelete={handleDeletePhoto}
                    editPhotoPreview={editPhotoId ? safeArray(photos).find(p => p.id === editPhotoId)?.image_url || safeArray(photos).find(p => p.id === editPhotoId)?.uri : null}
                    abortAnalysis={abortAnalysis}
                />
            )}
            
            {activeScreen === 'home' && viewMode === 'private' && (
              <div className="flex flex-col fixed inset-0 bg-brand-bg overflow-hidden">
                      <AdminHeader 
                          isMultiSelect={isMultiSelect}
                          selectedIds={selectedIds}
                          filteredPhotos={gridPhotos}
                          setSelectedIds={setSelectedIds}
                          setIsMultiSelect={setIsMultiSelect}
                          handleBatchAiIdentifyTrigger={handleBatchAiIdentifyTrigger}
                          handleManageClick={() => setActiveScreen('manage')}
                          loginWithGoogle={loginWithGoogle}
                          onRefresh={() => performPullSync(refreshCloudData)}
                          photosCount={safeArray(photos).length}
                          totalPhotosCount={safeArray(photos).length}
                          cloudCount={cloudCount}
                          appLang={appLang}
                       />
                       <div className="flex-1 min-h-0 relative">
                          <AdminGalleryShell 
                             onExit={() => setViewMode('public')}
                          />
                          <FloatingActionButton 
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.multiple = true;
                              input.onchange = (e) => handlePhotoImport(e as unknown as React.ChangeEvent<HTMLInputElement>, false);
                              input.click();
                            }}
                            title={t.addPhoto}
                          />
                       </div>
                    </div>
            )}

            {activeScreen === 'home' && viewMode === 'public' && (
              <div className="flex flex-col fixed inset-0 bg-brand-bg overflow-hidden">
                 <div className="flex-1 min-h-0 relative bg-bg">
                      <PublicGallery 
                         photos={photos}
                         categories={categories}
                         tags={tags}
                         isAdminMode={false}
                         isStaffMode={true}
                         onTogglePinned={async (photo) => {
                           const newStatus = !photo.isPinned;
                           const sPhotos = safeArray(photos);
                           const affectedPhotos = photo.groupId 
                             ? sPhotos.filter(p => p.groupId === photo.groupId)
                             : [photo];
                           import('../services/photoMutationService').then(async (m) => {
                             try {
                               const sAffected = safeArray(affectedPhotos);
                               await Promise.all(
                                 sAffected.map(p => 
                                   m.updatePhoto(p.id, { isPinned: newStatus }, setPhotos)
                                 )
                               );
                             } catch (e: any) {
                               handleError(e, '置顶状态切换失败');
                             }
                           });
                         }}
                         settings={settings}
                         isRefreshing={actualLoadingState === 'syncing'}
                         onExit={() => setViewMode('private')}
                         showExit={true}
                         onRefresh={() => performPullSync(refreshCloudData)}
                         hideHeader={false}
                         columns={columns}
                         setColumns={setColumns}
                         cloudCount={cloudCount}
                         user={user}
                         loginWithGoogle={loginWithGoogle}
                         onLoadMore={() => {
                           const sPhotos = safeArray(photos);
                           if (visibleCount < totalGridCount) {
                             setVisibleCount(prev => prev + PAGINATION.PUBLIC_PAGE_SIZE);
                           } else if (sPhotos.length < (cloudCount || 0)) {
                               performPullSync(refreshCloudData);
                           }
                         }}
                         hasMore={visibleCount < totalGridCount || (cloudCount !== null && safeArray(photos).length < cloudCount)}
                      />
                 </div>
              </div>
            )}
          </AdminUIProvider>
        </AdminPhotoProvider>
      </AdminSessionProvider>
    </ErrorBoundary>
  );
}
