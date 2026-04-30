import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CheckSquare, X } from 'lucide-react';
import { loginWithGoogle, saveSettings } from '../services/supabaseService';
import { updatePhotoInCloud } from '../services/photoService';
// Removed Tag import
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Modals } from '../components/admin/Modals';
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
import { useAdminDialogs } from '../hooks/useAdminDialogs';
import { usePhotoManagement } from '../hooks/usePhotoManagement';
import { useAuth } from '../hooks/useAuth';
import { useGalleryContext } from '../context/GalleryContext';
import { useAdminCore } from '../hooks/useAdminCore';
import { translations, LanguageCode } from '../lib/translations';
import { PAGINATION } from '../constants/config';
import { AdminSessionProvider, AdminPhotoProvider, AdminUIProvider } from '../context/AdminContexts';

export default function AdminView() {
  const { user, authChecked, logout } = useAuth();
  const navigate = useNavigate();
  const lang = (localStorage.getItem('appLang') as LanguageCode) || 'en';
  const t = translations[lang] ?? translations.en;

  const { confirmDialog, setConfirmDialog, alertDialog, setAlertDialog, promptDialog, setPromptDialog, promptValue, setPromptValue } = useAdminDialogs();

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'loading' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'loading' = 'success', persistent = false) => {
    setToast({ message, type });
    if (!persistent) {
      setTimeout(() => setToast(null), 3000);
    }
    return () => setToast(null); // Return close function
  }, []);

  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (e: ErrorEvent) => setPageError(e.message);
    const handleRejection = (e: PromiseRejectionEvent) => setPageError(String(e.reason));
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  const errorContent = pageError ? (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white p-4 font-bold overflow-auto max-h-[30vh]">
      <div className="flex justify-between">
        <span>Error: {pageError}</span>
        <button onClick={() => setPageError(null)} className="underline">Dismiss</button>
      </div>
    </div>
  ) : null;

  const getSafeLocalStorage = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
  const getSafeSessionStorage = (key: string) => { try { return sessionStorage.getItem(key); } catch { return null; } };

  // For native prompt replacement in login gate
  const handleLocalLogin = () => {
    setPromptDialog({
      title: t.localLoginPrompt,
      placeholder: 'Password...',
      onSubmit: async (pass: string) => {
        try {
           const { fetchSettings } = await import('../services/supabaseService');
           const cloudSettings = await fetchSettings();
           const correctPass = cloudSettings?.access_passcode || cloudSettings?.internal_password || getSafeLocalStorage('internal_password');
           
           if (pass === correctPass) {
             try { 
               sessionStorage.setItem('isStaffMode', 'true'); 
               localStorage.setItem('internal_password', pass);
             } catch {}
             window.location.reload();
           } else if (pass) {
             setAlertDialog({ title: t.loginFailed, message: t.wrongPassword });
           }
        } catch (e) {
           console.error("Local login check failed:", e);
           setAlertDialog({ title: 'Error', message: '無法連接到伺服器驗證密碼 / Cannot connect to server to verify password' });
        }
      }
    });
  };

  const uiValueForLogin = React.useMemo(() => ({
    confirmDialog, setConfirmDialog, alertDialog, setAlertDialog, promptDialog, setPromptDialog,
    activeScreen: 'login', setActiveScreen: () => {},
    editPhotoId: null, setEditPhotoId: () => {},
    batchEditIds: null, setBatchEditIds: () => {},
    toast: null, showToast: () => {},
    loadingState: 'idle' as const, setLoadingState: () => {},
    batchProgress: { current: 0, total: 0 },
    aiDebugInfo: null, abortAnalysis: () => {}
  }), [confirmDialog, alertDialog, promptDialog, setConfirmDialog, setAlertDialog, setPromptDialog]);

  if (!authChecked) {
    return (
       <ErrorBoundary key="auth-verifying">
        {errorContent}
        <div className="w-full h-full min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7]">
           <div className="w-8 h-8 relative animate-spin">
              <div className="absolute inset-0 bg-[#D4A853] rounded-full opacity-20"></div>
              <div className="absolute inset-0 border-t-2 border-[#D4A853] rounded-full"></div>
           </div>
           <p className="text-[10px] uppercase font-black tracking-widest text-[#1D3557]/40 mt-4">Verifying session...</p>
        </div>
       </ErrorBoundary>
    );
  }

  if (!user && getSafeSessionStorage('isStaffMode') !== 'true') {
    return (
       <ErrorBoundary key="login-gate">
        <AdminUIProvider value={uiValueForLogin}>
          {errorContent}
          <div className="w-full h-full min-h-screen flex items-center justify-center bg-[#FDFBF7]">
             <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-sm text-center border border-slate-100">
                <h2 className="text-xl font-black text-slate-800 tracking-tight leading-tight mb-2">{t.adminTitle}</h2>
                <p className="text-sm text-slate-500 mb-8">{t.adminSub}</p>
                <button 
                  onClick={async () => {
                    try {
                      await loginWithGoogle();
                    } catch(e: any) {
                      setAlertDialog({ 
                        title: t.loginFailed, 
                        message: `${t.loginFailedAlert} ${e.message || JSON.stringify(e)}` 
                      });
                    }
                  }}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20 active:scale-[0.98] hover:bg-blue-700 transition-all mb-4"
                >
                  {t.googleLoginBtn}
                </button>
                <button
                  onClick={handleLocalLogin}
                  className="w-full py-3 bg-white text-slate-700 border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-all mb-4 text-sm"
                >
                  {t.localLoginBtn}
                </button>
                <button
                  onClick={() => {
                    try { sessionStorage.removeItem('isStaffMode'); } catch {}
                    navigate('/');
                  }}
                  className="text-sm text-slate-400 hover:text-slate-600 font-medium"
                >
                  {t.backToGallery}
                </button>
             </div>
          </div>
          <Modals promptValue={promptValue} setPromptValue={setPromptValue} />
        </AdminUIProvider>
       </ErrorBoundary>
    );
  }

  return (
    <AdminViewContent 
      user={user} 
      authChecked={authChecked} 
      logout={logout} 
      errorContent={errorContent}
      t={t}
      lang={lang as LanguageCode}
      dialogProps={{
        confirmDialog, setConfirmDialog, alertDialog, setAlertDialog, promptDialog, setPromptDialog, promptValue, setPromptValue,
        toast, showToast
      }}
    />
  );
}

function AdminViewContent({ user, authChecked, logout, errorContent, t, lang, dialogProps }: { 
  user: any, 
  authChecked: boolean, 
  logout: () => void, 
  errorContent: React.ReactNode,
  t: any,
  lang: LanguageCode,
  dialogProps: any
}) {
  const navigate = useNavigate();
  const { 
    photos, setPhotos, categories, setCategories, tags, setTags, manufacturers, setManufacturers, 
    gridPhotos, isMultiSelect, setIsMultiSelect, selectedIds, setSelectedIds,
    setUser, setIsAdminMode,
    visibleCount, setVisibleCount
  } = useGalleryContext();
  
  const { confirmDialog, setConfirmDialog, alertDialog, setAlertDialog, promptDialog, setPromptDialog, promptValue, setPromptValue, toast, showToast } = dialogProps;

  useEffect(() => {
    setUser(user);
    setIsAdminMode(!!user || sessionStorage.getItem('isStaffMode') === 'true');
  }, [user, setUser, setIsAdminMode]);
  
  const cancelBatchAiRef = useRef(false);
  
  const [publicCategories, setPublicCategories] = useState<any[]>([]);
  const [publicTags, setPublicTags] = useState<any[]>([]);
  const [publicManufacturers, setPublicManufacturers] = useState<any[]>([]);

  const [loadingState, setLoadingState] = useState<'idle' | 'syncing' | 'analyzing' | 'importing'>('idle');
  const [cloudCount, setCloudCount] = useState<number | null>(null);
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('grid');
  const [appLang] = useState('zh');
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [focusedGroupPhotoId, setFocusedGroupPhotoId] = useState<string | null>(null);
  const [columns, setColumns] = useState<2 | 3 | 5>(3);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  
  const { viewMode, setViewMode, settings, setSettings, refreshCloudData, handleLogoUpload } = useSyncEngine(setLoadingState);
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
  
  const [activeScreen, setActiveScreen] = useState<'home'|'manage'>('home');

  const uiBasicValue = React.useMemo(() => ({ 
    setAlertDialog, 
    setPromptDialog, 
    setActiveScreen,
    setConfirmDialog,
    setLoadingState,
    setCloudCount,
    cloudCount,
    showToast
  }), [setAlertDialog, setPromptDialog, setActiveScreen, setConfirmDialog, setLoadingState, setCloudCount, cloudCount, showToast]);

  const sessionBasicValue = React.useMemo(() => ({ 
    setIsSyncing: (v: boolean) => setLoadingState(v ? 'syncing' : 'idle'),
    settings,
    setSettings
  }), [settings, setSettings, setLoadingState]);

  const tValue = React.useMemo(() => t, [t]);

  const { newPhotoData, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds, formState, updateForm, showOtherFields, setShowOtherFields, resetAddState, saveNewPhoto, saveBatchEdit } = usePhotoManagement(user, uiBasicValue, sessionBasicValue);

  const { 
    updateTag, deleteTag, 
    addCategory, updateCategory, deleteCategory, 
    addManufacturer, updateManufacturer, deleteManufacturer,
    addTag 
  } = useAdminCategory(uiBasicValue);

  const { 
    saveSettings,
    performPushSync, performPullSync, handleSingleAiAnalyzeCallback, 
    handleUngroup, handleGroupPhotos 
  } = useAdminCore(
      user, updateForm, tValue, refreshCloudData, lastSyncTime
  );

  const quickAddTag = useCallback(() => {
    setPromptDialog({
      title: '自定义标签',
      placeholder: '输入新标签名称 (例如 清货)',
      onSubmit: async (val: string) => {
        const normalized = val.trim();
        if (!normalized) return;
        const existing = tags.find(t => t.name.toUpperCase() === normalized.toUpperCase());
        if (existing) {
          updateForm((prev: any) => ({ ...prev, tagIds: [...new Set([...(prev.tagIds || []), String(existing.id)])] }));
          showToast(`标签 "${normalized}" 已存在`);
          return;
        }
        await addTag(normalized);
        showToast(`已新增标签 "${normalized}"`);
      }
    });
  }, [setPromptDialog, tags, addTag, updateForm, showToast]);

  const quickAddManufacturer = useCallback(() => {
    setPromptDialog({
      title: '新增厂商',
      placeholder: '输入新厂商名称',
      onSubmit: async (val: string) => {
        const trimmed = val.trim();
        if (!trimmed) return;
        const saved = await addManufacturer(trimmed);
        if (saved) {
           updateForm((prev: any) => ({ ...prev, manufacturerId: saved.id }));
           showToast(`已新增厂商 "${trimmed}"`);
        }
      }
    });
  }, [setPromptDialog, addManufacturer, updateForm, showToast]);


  const { 
    batchProgress, isImporting, importProgress, importTotal, 
    aiDebugInfo, abortAnalysis, 
    handleSingleAiAnalyze, handleBatchAiIdentify, handleGroupAiIdentify, 
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

  const handleDeletePhotos = useCallback(async (ids: string[]) => {
    setConfirmDialog({
      message: (t as any)?.confirmDelete?.(ids.length) || `確定要刪除這 ${ids.length} 張照片嗎？`,
      onConfirm: async () => {
        try {
          for (const id of ids) {
            await deletePhoto(id, true);
          }
          showToast('批量刪除成功', 'success');
          setEditPhotoId(null);
          setSelectedIds([]);
          setIsMultiSelect(false);
        } catch (err: any) {
          console.error("[ERROR] Batch delete failed:", err);
          setAlertDialog({ title: '删除失败', message: err.message || String(err) });
        }
      }
    });
  }, [t, deletePhoto, setConfirmDialog, setEditPhotoId, setSelectedIds, setIsMultiSelect, showToast]);
  
  const handleDeletePhoto = useCallback(async (id: string) => {
    setConfirmDialog({
      message: (t as any)?.deleteConfirm || '確定要刪除這張照片嗎？ / Are you sure you want to delete this photo?',
      onConfirm: async () => {
        try {
          await deletePhoto(id);
          setEditPhotoId(null);
        } catch (err: any) {
          console.error("[ERROR] Delete failed:", err);
          setAlertDialog({ title: '删除失败', message: err.message || String(err) });
        }
      }
    });
  }, [t, deletePhoto, setConfirmDialog, setEditPhotoId]);
  
  const handleDeleteTag = useCallback((id: string) => {
    const tag = tags.find(t => t.id === id);
    setConfirmDialog({
      message: (t as any)?.deleteConfirm || `確定要刪除標籤 #${tag?.name || id} 嗎？ / Are you sure you want to delete tag #${tag?.name || id}?`,
      onConfirm: async () => {
        setLoadingState('syncing');
        try {
          await deleteTag(id);
          showToast('标签已删除 / Tag deleted', 'success');
        } catch (err: any) {
          console.error('[handleDeleteTag] Error during deletion:', err);
          setAlertDialog({ title: '删除失败', message: err.message || String(err) });
        } finally {
          setLoadingState('idle');
        }
      }
    });
  }, [tags, t, deleteTag, showToast, setConfirmDialog, setAlertDialog, setLoadingState]);

  // Auto refresh - ONLY on initial mount of the content component
  useEffect(() => {
    refreshCloudData(user, false, setCloudCount, setPublicCategories, setPublicTags, setPublicManufacturers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [syncPercent, setSyncPercent] = useState(0);

  const sessionValue = React.useMemo(() => ({
    user, isAdminMode: true, 
    settings, setSettings, geminiApiKey, setGeminiApiKey,
    internalPassword, setInternalPassword, customModel, setCustomModel,
    viewMode, setViewMode, syncPercent, setSyncPercent,
    loginWithGoogle, logout, appLang: lang
  }), [user, settings, setSettings, geminiApiKey, setGeminiApiKey, internalPassword, setInternalPassword, customModel, setCustomModel, viewMode, setViewMode, syncPercent, setSyncPercent, logout, lang]);

  const photoValue = React.useMemo(() => ({
    photos, setPhotos, categories, setCategories, tags, setTags,
    manufacturers, setManufacturers, handleSingleAiAnalyze, handleBatchAiIdentify, handleGroupAiIdentify, handlePhotoImport,
    handleSingleAiAnalyzeCallback,
    deletePhoto: handleDeletePhoto, handleGroupPhotos, handleUngroup, saveNewPhoto, saveBatchEdit,
    updateTag, deleteTag: handleDeleteTag, 
    updateCategory, deleteCategory, addCategory,
    addManufacturer, updateManufacturer, deleteManufacturer,
    addTag
  }), [
    photos, setPhotos, categories, setCategories, tags, setTags, manufacturers, setManufacturers, 
    handleSingleAiAnalyze, handleBatchAiIdentify, handleGroupAiIdentify, handlePhotoImport, 
    handleSingleAiAnalyzeCallback, handleDeletePhoto, handleGroupPhotos, handleUngroup, saveNewPhoto, saveBatchEdit,
    updateTag, handleDeleteTag, updateCategory, deleteCategory, addCategory, addManufacturer, updateManufacturer, deleteManufacturer,
    addTag
  ]);

  const uiValue = React.useMemo(() => ({
    activeScreen, setActiveScreen, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds,
    confirmDialog, setConfirmDialog, alertDialog, setAlertDialog, promptDialog, setPromptDialog,
    toast: toast, showToast: showToast, loadingState, setLoadingState, batchProgress, aiDebugInfo, abortAnalysis
  }), [
    activeScreen, editPhotoId, batchEditIds, confirmDialog, setConfirmDialog, alertDialog, setAlertDialog, promptDialog, setPromptDialog,
    toast, showToast, loadingState, setLoadingState, batchProgress, aiDebugInfo, abortAnalysis
  ]);

  const handleBatchAiIdentifyTrigger = () => {
    if (loadingState === 'analyzing') {
      cancelBatchAiRef.current = true;
    } else {
      cancelBatchAiRef.current = false;
      handleBatchAiIdentify(gridPhotos, () => cancelBatchAiRef.current);
    }
  };
  
  return (
    <ErrorBoundary key="admin-main">
      <AdminSessionProvider value={sessionValue}>
        <AdminPhotoProvider value={photoValue}>
          <AdminUIProvider value={uiValue}>
            {errorContent}
            
            <AnimatePresence>
              {toast && (
                <motion.div
                  initial={{ opacity: 0, y: -50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -50 }}
                  className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] bg-slate-800 text-white px-6 py-3 rounded-2xl shadow-xl font-bold flex items-center gap-3 border border-slate-700 pointer-events-none"
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
                photos={photos}
                displayPhotos={photos.filter(p => p.groupId === activeGroupId)}
                setLightboxIndex={() => {}}
                isAdminMode={true}
                onEditPhoto={(p) => { setEditPhotoId(p.id); }}
                onLongPressStart={() => {}}
                onLongPressEnd={() => {}}
                onBatchEdit={(ids) => { setBatchEditIds(ids); }}
                onUngroup={() => { handleUngroup(activeGroupId); setActiveGroupId(null); }}
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
                onBatchAiAnalyze={handleGroupAiIdentify}
              />
            )}
      
            {activeScreen === 'manage' && (
               <SettingsScreen 
                 setActiveScreen={setActiveScreen}
                 saveSettings={saveSettings}
                 handleLogoUpload={handleLogoUpload}
                 performPushSync={performPushSync}
                 performPullSync={performPullSync}
                 cloudCount={cloudCount}
                 lastSyncTime={lastSyncTime}
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
                          onRefresh={() => performPullSync()}
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
                       isAdminMode={true}
                       onTogglePinned={async (photo) => {
                         const newStatus = !photo.isPinned;
                         const affectedPhotos = photo.groupId 
                           ? photos.filter(p => p.groupId === photo.groupId)
                           : [photo];
                         setPhotos(prev => prev.map(p => 
                           affectedPhotos.some(ap => ap.id === p.id) 
                             ? { ...p, isPinned: newStatus } 
                             : p
                         ));
                         try {
                           await Promise.all(
                             affectedPhotos.map(p => 
                               updatePhotoInCloud(p.id, { is_pinned: newStatus, updated_at: new Date().toISOString() })
                             )
                           );
                         } catch (e: any) {
                           console.error("[ERROR] Failed to toggle pinned:", e);
                           setPhotos(prev => prev.map(p => 
                             affectedPhotos.some(ap => ap.id === p.id) 
                               ? { ...p, isPinned: !newStatus } 
                               : p
                           ));
                         }
                       }}
                       settings={settings}
                       isRefreshing={loadingState === 'syncing'}
                       onExit={() => setViewMode('private')}
                       showExit={true}
                       onRefresh={() => performPullSync()}
                       hideHeader={false}
                       columns={columns}
                       setColumns={setColumns}
                       cloudCount={cloudCount}
                       user={undefined}
                       onLoadMore={() => {
                         if (visibleCount < gridPhotos.length) {
                           setVisibleCount(prev => prev + PAGINATION.PUBLIC_PAGE_SIZE);
                         } else if (photos.length < (cloudCount || 0)) {
                            // If we have less locally than on cloud, pull more? 
                            // Actually performPullSync already pulls (using force=true which I just fixed to ignore timestamps)
                            performPullSync();
                         }
                       }}
                       hasMore={visibleCount < gridPhotos.length || (cloudCount !== null && photos.length < cloudCount)}
                    />
                 </div>
              </div>
            )}
      
            <AnimatePresence>
              {loadingState !== 'idle' && (
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
                       {loadingState === 'analyzing' ? 'AI 智能辨識中... / AI Analyzing...' :
                        loadingState === 'importing' ? '正在匯入照片... / Importing...' :
                        loadingState === 'compressing' ? '影像壓縮中... / Compressing...' :
                        loadingState === 'uploading' ? '正在上傳雲端... / Uploading...' :
                        '正在同步數據... / Synching...'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t.doNotClose}</p>
                  </div>

                  {(batchProgress.total > 0 || (loadingState === 'importing' && importTotal > 0)) && (
                    <div className="w-full max-w-xs">
                      <div className="flex justify-between text-xs font-black text-slate-500 mb-2 uppercase tracking-tight">
                         <span>
                           {loadingState === 'importing' ? '匯入進度 / Import Progress' : '處理進度 / Progress'}
                         </span>
                         <span>
                           {loadingState === 'importing' ? `${importProgress} / ${importTotal}` : `${batchProgress.current} / ${batchProgress.total}`}
                         </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-200">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600" 
                          initial={{ width: 0 }}
                          animate={{ 
                            width: `${Math.round(((loadingState === 'importing' ? importProgress : batchProgress.current) / (loadingState === 'importing' ? importTotal : batchProgress.total)) * 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {loadingState === 'analyzing' && (
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
      
            <Modals 
                promptValue={promptValue} setPromptValue={setPromptValue}
            />
          </AdminUIProvider>
        </AdminPhotoProvider>
      </AdminSessionProvider>
    </ErrorBoundary>
  );
}