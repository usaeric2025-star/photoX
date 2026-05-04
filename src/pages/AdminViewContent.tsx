import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckSquare, X } from 'lucide-react';
import { loginWithGoogle } from '../services/supabaseService';
import { ErrorBoundary } from '../components/ErrorBoundary';

import { PhotoEditDrawer } from '../components/admin/PhotoEditDrawer';
import { PromptDialog } from '../components/admin/PromptDialog';
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
import { useGalleryContext } from '../context/GalleryContext';
import { useErrorHandler } from '../utils/errorHandler';
import { usePermission } from '../hooks/usePermission';
import { useDelete } from '../hooks/useDelete';
import { photoApi } from '../api/photos';
import { LanguageCode } from '../lib/translations';
import { PAGINATION } from '../constants/config';
import { AdminSessionProvider, AdminPhotoProvider, AdminUIProvider } from '../context/AdminContexts';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

const errorGuard = (name: string) => () => {
  console.error(`Blocked call to ${name}`);
  throw new Error(`[Architecture Error] Illegal call to "${name}".`);
};

export function AdminViewContent({ user, logout, errorContent, t, lang, uiProps, dialogProps }: { 
  user: any, 
  authChecked: boolean, 
  logout: () => void, 
  errorContent: React.ReactNode,
  t: any,
  lang: LanguageCode,
  uiProps: any,
  dialogProps: any
}) {
  const { 
    photos, setPhotos, categories, setCategories, tags, setTags, manufacturers, setManufacturers, 
    gridPhotos, displayPhotos, isMultiSelect, setIsMultiSelect, selectedIds, setSelectedIds,
    setUser, setIsAdminMode,
    visibleCount, setVisibleCount, tagIdToNameMap, clearSelection
  } = useGalleryContext();
  
  const { alertDialog, setAlertDialog, promptDialog, setPromptDialog, toast, showToast } = dialogProps;
  const { activeScreen, setActiveScreen, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds, loadingState, setLoadingState, withLoading, cloudCount, setCloudCount } = uiProps;

  const { handleError } = useErrorHandler();
  const { canDelete, isAdmin } = usePermission();
  const { deletePhotos, deleteTag: deleteTagHook, deleteCategory: deleteCategoryHook, deleteGroup } = useDelete();

  useEffect(() => {
    setUser(user);
    setIsAdminMode(isAdmin || sessionStorage.getItem('isStaffMode') === 'true');
  }, [user, setUser, setIsAdminMode, isAdmin]);
  
  const cancelBatchAiRef = useRef(false);
  
  const [, setPublicCategories] = useState<any[]>([]);
  const [, setPublicTags] = useState<any[]>([]);
  const [, setPublicManufacturers] = useState<any[]>([]);

  const [appLang] = useState('zh');
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [columns, setColumns] = useState<2 | 3 | 5>(3);
  
  const { viewMode, setViewMode, settings, setSettings, refreshCloudData, handleLogoUpload, isSyncing, setIsSyncing } = useSyncEngine(withLoading);
  const lastSyncTimeStr = localStorage.getItem('lastSyncTime');
  const lastSyncTime = lastSyncTimeStr ? new Date(lastSyncTimeStr).getTime() : null;
  const [internalPassword, setInternalPassword] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [customModel, setCustomModel] = useState('gemini-1.5-flash');

  useEffect(() => {
    if (settings) {
      if (settings.gemini_api_key) setGeminiApiKey(settings.gemini_api_key);
      if (settings.custom_model) setCustomModel(settings.custom_model);
      if (settings.internal_password) setInternalPassword(settings.internal_password);
    }
  }, [settings]);
  
  const uiBasicValue = React.useMemo(() => ({ 
    setAlertDialog, 
    setPromptDialog, 
    setActiveScreen: (s: string) => setActiveScreen(s as any),
    setLoadingState,
    loadingState,
    withLoading,
    setCloudCount,
    cloudCount,
    showToast,
    editPhotoId, setEditPhotoId,
    batchEditIds, setBatchEditIds,
    abortAnalysis: errorGuard('abortAnalysis')
  }), [setAlertDialog, setPromptDialog, setActiveScreen, setLoadingState, loadingState, withLoading, setCloudCount, cloudCount, showToast, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds]);

  const sessionBasicValue = React.useMemo(() => ({ 
    settings,
    setSettings,
    setIsSyncing
  }), [settings, setSettings, setIsSyncing]);

  const { newPhotoData, formState, updateForm, showOtherFields, setShowOtherFields, resetAddState, saveNewPhoto, saveBatchEdit } = usePhotoManagement(user, uiBasicValue, sessionBasicValue);

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
      title: '自定義標籤 / Custom Tag',
      placeholder: '輸入新標籤名稱 (例如: 清貨)',
      onSubmit: async (val: string) => {
        const normalized = val.trim();
        if (!normalized) return;
        const existing = tags.find(t => t.name.toUpperCase() === normalized.toUpperCase());
        if (existing) {
          updateForm((prev: any) => ({ ...prev, tagIds: [...new Set([...(prev.tagIds || []), String(existing.id)])] }));
          showToast(`標籤 "${normalized}" 已存在`);
          return;
        }
        const saved = await addTag(normalized);
        if (saved) {
           updateForm((prev: any) => ({ 
             ...prev, 
             tagIds: [...new Set([...(prev.tagIds || []), String(saved.id)])] 
           }));
           showToast(`已新增標籤 "${normalized}"`);
        }
      }
    });
  }, [setPromptDialog, tags, addTag, updateForm, showToast]);

  const quickAddManufacturer = useCallback(() => {
    setPromptDialog({
      title: '新增廠商 / New Manufacturer',
      placeholder: '輸入新廠商名稱',
      onSubmit: async (val: string) => {
        const trimmed = val.trim();
        if (!trimmed) return;
        const saved = await addManufacturer(trimmed);
        if (saved) {
           updateForm((prev: any) => ({ ...prev, manufacturerId: saved.id }));
           showToast(`已新增廠商 "${trimmed}"`);
        }
      }
    });
  }, [setPromptDialog, addManufacturer, updateForm, showToast]);


  const { 
    batchProgress, 
    aiDebugInfo, abortAnalysis, 
    handleSingleAiAnalyze, handleTranslate, handleBatchAiIdentify, handleGroupAiIdentify, 
    handlePhotoImport, deletePhoto 
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

  const handleDeletePhoto = useCallback(async (id: string) => {
     const { success, error } = await deletePhotos(id);
     if (success) {
         showToast('照片已成功刪除', 'success');
         setEditPhotoId(null);
     } else {
         handleError(error, '刪除照片失敗');
     }
  }, [deletePhotos, setEditPhotoId, showToast, handleError]);

  const handleDeleteTag = useCallback(async (id: string) => {
    const { success, error } = await deleteTagHook(id);
    if (success) {
        showToast('標籤已成功刪除', 'success');
    } else {
        handleError(error, '刪除標籤失敗');
    }
  }, [deleteTagHook, showToast, handleError]);
  
  // Auto refresh
  useEffect(() => {
    refreshCloudData(user, false, setCloudCount, setPublicCategories, setPublicTags, setPublicManufacturers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = useCallback(() => 
    refreshCloudData(user, true, setCloudCount, setPublicCategories, setPublicTags, setPublicManufacturers), 
    [user, refreshCloudData, setCloudCount]);

  const sessionValue = React.useMemo(() => ({
    user, isAdminMode: true, 
    settings, setSettings, geminiApiKey, setGeminiApiKey,
    internalPassword, setInternalPassword, customModel, setCustomModel,
    viewMode, setViewMode,
    isSyncing, setIsSyncing, onRefresh,
    loginWithGoogle, logout, appLang: lang
  }), [user, settings, setSettings, geminiApiKey, setGeminiApiKey, internalPassword, setInternalPassword, customModel, setCustomModel, viewMode, setViewMode, isSyncing, setIsSyncing, onRefresh, logout, lang]);

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
    deleteGroup
  }), [
    photos, setPhotos, categories, setCategories, tags, setTags, manufacturers, setManufacturers,
    handleSingleAiAnalyze, handleTranslate, handleBatchAiIdentify, handleGroupAiIdentify, handlePhotoImport, 
    handleSingleAiAnalyzeCallback, deletePhoto, handleGroupPhotos, handleUngroup, saveNewPhoto, saveBatchEdit,
    updateTag, handleDeleteTag, updateCategory, deleteCategory, addCategory, addManufacturer, updateManufacturer, deleteManufacturer,
    addTag, removeTagFromPhoto, quickAddTag, quickAddManufacturer, deleteGroup
  ]);

  const uiValue = React.useMemo(() => ({
    activeScreen, setActiveScreen, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds,
    alertDialog, setAlertDialog, promptDialog, setPromptDialog,
    toast, showToast,
    loadingState: actualLoadingState, setLoadingState, withLoading, batchProgress, aiDebugInfo, abortAnalysis,
    isAnalyzing: actualLoadingState === 'analyzing'
  }), [
    activeScreen, editPhotoId, batchEditIds, alertDialog, setAlertDialog, promptDialog, setPromptDialog,
    toast, showToast, actualLoadingState, setLoadingState, withLoading, batchProgress, aiDebugInfo, abortAnalysis
  ]);

  const handleBatchAiIdentifyTrigger = () => {
    if (actualLoadingState === 'analyzing') {
      abortAnalysis();
    } else {
      handleBatchAiIdentify(displayPhotos);
    }
  };
  
  return (
    <ErrorBoundary key="admin-main">
      <AdminSessionProvider value={sessionValue}>
        <AdminPhotoProvider value={photoValue}>
          <AdminUIProvider value={uiValue}>
            <AlertDialog 
              open={!!alertDialog} 
              onOpenChange={(open) => {
                if (!open) {
                  if (alertDialog?.onCancel) alertDialog.onCancel();
                  setAlertDialog(null);
                }
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{alertDialog?.title}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {alertDialog?.message}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  {alertDialog?.onConfirm ? (
                    <>
                      <AlertDialogCancel onClick={() => {
                        if (alertDialog.onCancel) alertDialog.onCancel();
                      }}>
                        取消 / CANCEL
                      </AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={async () => {
                          if (alertDialog.onConfirm) {
                            await alertDialog.onConfirm();
                          }
                          setAlertDialog(null);
                        }}
                      >
                        確定 / OK
                      </AlertDialogAction>
                    </>
                  ) : (
                    <AlertDialogAction onClick={() => setAlertDialog(null)}>
                      確定 / OK
                    </AlertDialogAction>
                  )}
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {errorContent}
            
            <AnimatePresence>
              {toast && (
                <motion.div
                  initial={{ opacity: 0, y: -50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -50 }}
                  className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] bg-slate-800 text-white px-6 py-3 rounded-2xl shadow-xl font-bold flex items-center gap-3 border border-slate-700 pointer-events-none"
                >
                  {toast.type === 'success' ? <CheckSquare size={18} className="text-green-400" /> : 
                   toast.type === 'loading' ? <div className="w-4 h-4 border-2 border-slate-500 border-t-white rounded-full animate-spin" /> : 
                   <X size={18} className="text-red-400" />}
                  {toast.message}
                </motion.div>
              )}
            </AnimatePresence>
      
            {batchEditIds && (
              <BatchEditScreen 
                resetAddState={() => { resetAddState(); }}
                saveBatchEdit={saveBatchEdit}
                batchEditIds={batchEditIds}
                formState={formState}
                updateForm={updateForm}
                batchIsHiddenApplied={false}
                setBatchIsHiddenApplied={() => {}}
                showOtherFields={showOtherFields}
                setShowOtherFields={setShowOtherFields}
              />
            )}
            
            {activeGroupId && (
              <GroupDetailView
                activeGroupId={activeGroupId}
                setActiveGroupId={setActiveGroupId}
                setAlertDialog={setAlertDialog}
                photos={photos}
                displayPhotos={photos.filter(p => p.groupId === activeGroupId)}
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
                  input.onchange = (e) => handlePhotoImport(e as any, false);
                  input.click();
                }}
                setPhotos={setPhotos}
                lang={lang}
                t={t}
                categories={categories}
                manufacturers={manufacturers}
                allTags={tags}
                tagMap={tagIdToNameMap as any}
                onBatchAiAnalyze={handleGroupAiIdentify}
                onAiAnalyze={(p) => {
                  handleSingleAiAnalyze(p.uri || p.image_url, p.categoryId || undefined, p.id);
                }}
                onToggleHidden={async (photo) => {
                  const newStatus = !photo.isHidden;
                  try {
                    await photoApi.update(photo.id, { isHidden: newStatus, updatedAt: new Date().toISOString() });
                    setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, isHidden: newStatus } : p));
                  } catch (e) {
                    handleError(e, '切換隱藏狀態失敗');
                  }
                }}
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
                    onDelete={handleDeletePhoto}
                    editPhotoPreview={editPhotoId ? photos.find(p => p.id === editPhotoId)?.image_url || photos.find(p => p.id === editPhotoId)?.uri : null}
                    abortAnalysis={abortAnalysis}
                />
            )}
            
            {activeScreen === 'home' && viewMode === 'private' && (
              <div className="flex flex-col fixed inset-0 bg-[#FDFAF6] overflow-hidden">
                      <AdminHeader 
                          isMultiSelect={isMultiSelect}
                          selectedIds={selectedIds}
                          filteredPhotos={gridPhotos}
                          setSelectedIds={setSelectedIds}
                          setIsMultiSelect={setIsMultiSelect}
                          handleBatchAiIdentifyTrigger={handleBatchAiIdentifyTrigger}
                          handleManageClick={() => setActiveScreen(prev => prev === 'manage' ? 'home' : 'manage')}
                          loginWithGoogle={loginWithGoogle}
                          onRefresh={() => performPullSync(refreshCloudData)}
                          photosCount={photos.length}
                          totalPhotosCount={photos.length}
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
                              input.onchange = (e) => handlePhotoImport(e as any, false);
                              input.click();
                            }}
                            title={t.addPhoto}
                          />
                       </div>
                    </div>
            )}

            {activeScreen === 'home' && viewMode === 'public' && (
              <div className="flex flex-col fixed inset-0 bg-[#FDFAF6] overflow-hidden">
                 <div className="flex-1 min-h-0 relative bg-bg">
                      <PublicGallery 
                         photos={photos}
                         categories={categories}
                         tags={tags}
                         isAdminMode={false}
                         onTogglePinned={async (photo) => {
                           const newStatus = !photo.isPinned;
                           const affectedPhotos = photo.groupId 
                             ? photos.filter(p => p.groupId === photo.groupId)
                             : [photo];
                           import('../services/photoService').then(async (m) => {
                             try {
                               await Promise.all(
                                 affectedPhotos.map(p => 
                                   m.updatePhoto(p.id, { isPinned: newStatus }, setPhotos)
                                 )
                               );
                             } catch (e: any) {
                               console.error("[ERROR] Failed to toggle pinned:", e);
                               showToast('Failed to toggle pin status', 'error');
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
                           if (visibleCount < gridPhotos.length) {
                             setVisibleCount(prev => prev + PAGINATION.PUBLIC_PAGE_SIZE);
                           } else if (photos.length < (cloudCount || 0)) {
                               performPullSync(refreshCloudData);
                           }
                         }}
                         hasMore={visibleCount < gridPhotos.length || (cloudCount !== null && photos.length < cloudCount)}
                      />
                 </div>
              </div>
            )}
      
            <AnimatePresence>
              {actualLoadingState !== 'idle' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[2000] bg-white/70 backdrop-blur-xl flex flex-col items-center justify-center p-8"
                >
                  <div className="w-16 h-16 relative mb-8">
                     <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                     <div className="absolute inset-0 border-t-4 border-blue-600 rounded-full animate-spin shadow-lg shadow-blue-200"></div>
                  </div>
                  
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">
                       {actualLoadingState === 'analyzing' ? 'AI 智能辨識中... / AI Analyzing...' :
                        actualLoadingState === 'importing' ? '正在匯入照片... / Importing...' :
                        actualLoadingState === 'compressing' ? '影像壓縮中... / Compressing...' :
                        actualLoadingState === 'uploading' ? '正在上傳雲端... / Uploading...' :
                        '正在同步數據... / Synching...'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t.doNotClose}</p>
                  </div>

                  {(batchProgress.total > 0 || (actualLoadingState === 'importing' && 0 > 0)) && (
                    <div className="w-full max-w-xs">
                      <div className="flex justify-between text-xs font-black text-slate-500 mb-2 uppercase tracking-tight">
                         <span>
                           {actualLoadingState === 'importing' ? '匯入進度 / Import Progress' : '處理進度 / Progress'}
                         </span>
                         <span>
                           {batchProgress.current} / {batchProgress.total}
                         </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-200">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600" 
                          initial={{ width: 0 }}
                          animate={{ 
                            width: `${Math.round((batchProgress.current / batchProgress.total) * 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {actualLoadingState === 'analyzing' && (
                    <button 
                      onClick={() => {
                        abortAnalysis?.();
                        cancelBatchAiRef.current = true;
                      }}
                      className="mt-12 px-8 py-3 bg-red-50 text-red-600 rounded-full font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100"
                    >
                      取消辨識 / Cancel
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
      
            <PromptDialog dialog={promptDialog} onClose={() => setPromptDialog(null)} />
          </AdminUIProvider>
        </AdminPhotoProvider>
      </AdminSessionProvider>
    </ErrorBoundary>
  );
}
