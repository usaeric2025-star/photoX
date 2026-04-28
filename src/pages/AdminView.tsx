import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CheckSquare, X } from 'lucide-react';
import { loginWithGoogle, saveSettings } from '../services/supabaseService';
// Removed Tag import
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Modals } from '../components/admin/Modals';
import { PhotoEditDrawer } from '../components/admin/PhotoEditDrawer';
import { AdminHeader } from '../components/admin/AdminHeader';
import { BatchEditScreen } from '../components/admin/BatchEditScreen';
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

import { AdminSessionProvider, AdminPhotoProvider, AdminUIProvider } from '../context/AdminContexts';

export default function AdminView() {
  const lang = (localStorage.getItem('appLang') as LanguageCode) || 'en';
  const t = translations[lang] ?? translations.en;
  const { user, authChecked, logout } = useAuth();
  const { 
    photos, setPhotos, categories, setCategories, tags, setTags, manufacturers, setManufacturers, 
    displayPhotos, gridPhotos, visibleCount, setVisibleCount, isMultiSelect, setIsMultiSelect, selectedIds, setSelectedIds,
    setUser, setIsAdminMode
  } = useGalleryContext();
  
  useEffect(() => {
    if (authChecked) {
      setUser(user);
      setIsAdminMode(!!user || sessionStorage.getItem('isStaffMode') === 'true');
    }
  }, [authChecked, user, setUser, setIsAdminMode]);
  const cancelBatchAiRef = useRef(false);
  
  // Need setters to be defined or from context
  const [publicCategories, setPublicCategories] = useState<any[]>([]);
  const [publicTags, setPublicTags] = useState<any[]>([]);
  const [publicManufacturers, setPublicManufacturers] = useState<any[]>([]);
  const navigate = useNavigate();
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

  const { confirmDialog, setConfirmDialog, alertDialog, setAlertDialog, promptDialog, setPromptDialog, promptValue, setPromptValue } = useAdminDialogs();
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('grid');
  const [appLang] = useState('zh');
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [focusedGroupPhotoId, setFocusedGroupPhotoId] = useState<string | null>(null);
  const [columns, setColumns] = useState<2 | 3 | 5>(3);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  
  const { isSyncing, setIsSyncing, viewMode, setViewMode, settings, setSettings, lastSyncTime, refreshCloudData, handleLogoUpload } = useSyncEngine();
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
  const { newPhotoData, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds, formState, updateForm, showOtherFields, setShowOtherFields, resetAddState, saveNewPhoto, saveBatchEdit } = usePhotoManagement(user, setAlertDialog, setIsSyncing, setActiveScreen);

  const { isAnalyzing, isBatchAnalyzing, batchProgress, isImporting, importProgress, importTotal, aiDebugInfo, abortAnalysis, cloudCount, setCloudCount, handleSingleAiAnalyze, handleBatchAiIdentify, handlePhotoImport, deletePhoto } = useAdminPhotos(user, settings?.gemini_api_key, 'gemini', settings?.custom_model || 'gemini-1.5-flash', setAlertDialog, setIsSyncing);

  const {
      toast, showToast, saveSettings,
      performPushSync, performPullSync, handleSingleAiAnalyzeCallback, 
      handleUngroup, handleGroupPhotos, quickAddSubCategory, quickAddTag, quickAddManufacturer 
  } = useAdminCore(
      user, photos, setPhotos, settings, setSettings, categories, setCategories, tags, setTags, manufacturers, setManufacturers, 
      setIsSyncing, setAlertDialog, setPromptDialog, updateForm, t, refreshCloudData, setCloudCount
  );

  const handleManageClick = () => setActiveScreen('manage');

  const { updateTag, deleteTag } = useAdminCategory();


  const handleDeletePhoto = async (id: string) => {
    setConfirmDialog({
      message: (t as any)?.deleteConfirm || '確定要刪除這張照片嗎？ / Are you sure you want to delete this photo?',
      onConfirm: async () => {
        await deletePhoto(id);
        setEditPhotoId(null);
      }
    });
  };
  
  const handleDeleteTag = async (id: string) => {
    const tag = tags.find(t => t.id === id);
    setConfirmDialog({
      message: (t as any)?.deleteConfirm || `確定要刪除標籤 #${tag?.name || id} 嗎？ / Are you sure you want to delete tag #${tag?.name || id}?`,
      onConfirm: async () => {
        await deleteTag(id, photos, setPhotos);
      }
    });
  };

  // Auto refresh
  useEffect(() => {
    if (authChecked && (user || sessionStorage.getItem('isStaffMode') === 'true')) {
      refreshCloudData(user, categories, tags, manufacturers, setSettings, setPublicCategories, setPublicTags, setPublicManufacturers, setCategories, setTags, setManufacturers, setPhotos, setCloudCount, false);
    }
  }, [authChecked, user]);


  // Helper for quick imports inside component
  const getSafeSessionStorage = (key: string) => { try { return sessionStorage.getItem(key); } catch { return null; } };
  const getSafeLocalStorage = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };

  const [syncPercent, setSyncPercent] = useState(0);
  const [syncAction, setSyncAction] = useState('idle');
  const [showManageAccess, setShowManageAccess] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [batchIsHiddenApplied, setBatchIsHiddenApplied] = useState(false);

  const observerTarget = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && visibleCount < displayPhotos.length) {
            setVisibleCount(prev => prev + 15);
        }
      },
      { threshold: 0.1 }
    );
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    return () => observer.disconnect();
  }, [displayPhotos.length, visibleCount, setVisibleCount]);
  
  const errorContent = pageError ? (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white p-4 font-bold overflow-auto max-h-[30vh]">
      <div className="flex justify-between">
        <span>Error: {pageError}</span>
        <button onClick={() => setPageError(null)} className="underline">Dismiss</button>
      </div>
    </div>
  ) : null;
  
  if (!authChecked) {
    return (
       <ErrorBoundary>
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
       <ErrorBoundary>
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
                    alert(`${t.loginFailedAlert} ${e.message || JSON.stringify(e)}`);
                  }
                }}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20 active:scale-[0.98] hover:bg-blue-700 transition-all mb-4"
              >
                {t.googleLoginBtn}
              </button>
              <button
                onClick={() => {
                  const pass = prompt(t.localLoginPrompt);
                  if (pass === getSafeLocalStorage('internal_password')) {
    try { sessionStorage.setItem('isStaffMode', 'true'); } catch {}
                    window.location.reload();
                  } else if (pass) {
                    alert(t.wrongPassword);
                  }
                }}
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
       </ErrorBoundary>
    );
  }


  

  
  // Context providers values
  const sessionValue = {
    user, isAdminMode: !!user || sessionStorage.getItem('isStaffMode') === 'true', 
    settings, setSettings, geminiApiKey, setGeminiApiKey,
    internalPassword, setInternalPassword, customModel, setCustomModel,
    viewMode, setViewMode, isSyncing, setIsSyncing, syncPercent, setSyncPercent,
    loginWithGoogle, logout, appLang: lang
  };

  const photoValue = {
    photos, setPhotos, categories, setCategories, tags, setTags,
    manufacturers, setManufacturers, handleSingleAiAnalyze, handleBatchAiIdentify, handlePhotoImport,
    deletePhoto: handleDeletePhoto, handleGroupPhotos, handleUngroup, saveNewPhoto, saveBatchEdit,
    updateTag, deleteTag: handleDeleteTag, quickAddTag, quickAddManufacturer
  };

  const uiValue = {
    activeScreen, setActiveScreen, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds,
    confirmDialog, setConfirmDialog, alertDialog, setAlertDialog, promptDialog, setPromptDialog,
    toast, showToast, isAnalyzing, isBatchAnalyzing, batchProgress, aiDebugInfo, abortAnalysis
  };

  return (
    <ErrorBoundary>
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
                  {toast.type === 'success' ? <CheckSquare size={18} className="text-green-400" /> : <X size={18} className="text-red-400" />}
                  {toast.message}
                </motion.div>
              )}
            </AnimatePresence>
      
            {batchEditIds && (
              <BatchEditScreen 
                resetAddState={() => { resetAddState(); setBatchIsHiddenApplied(false); }}
                saveBatchEdit={saveBatchEdit}
                batchEditIds={batchEditIds}
                formState={formState}
                updateForm={updateForm}
                batchIsHiddenApplied={batchIsHiddenApplied}
                setBatchIsHiddenApplied={setBatchIsHiddenApplied}
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
                setLightboxIndex={(idx) => {}}
                isAdminMode={true}
                onEditPhoto={(p) => { setEditPhotoId(p.id); setActiveGroupId(null); }}
                onLongPressStart={() => {}}
                onLongPressEnd={() => {}}
                onBatchEdit={(ids) => { setBatchEditIds(ids); setActiveGroupId(null); }}
                onUngroup={() => { handleUngroup(activeGroupId); setActiveGroupId(null); }}
                onAddPhotoToGroup={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.multiple = true;
                  input.onchange = (e) => handlePhotoImport(e as any, false, setActiveScreen);
                  input.click();
                }}
                setPhotos={setPhotos}
                lang={lang}
                t={t}
                categories={categories}
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
                          handleBatchAiIdentifyTrigger={() => {
                            if (isBatchAnalyzing) {
                              cancelBatchAiRef.current = true;
                            } else {
                              cancelBatchAiRef.current = false;
                              handleBatchAiIdentify(gridPhotos, cancelBatchAiRef.current);
                            }
                          }}
                          handleManageClick={handleManageClick}
                          loginWithGoogle={loginWithGoogle}
                          onAddPhoto={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.multiple = true;
                            input.onchange = (e) => handlePhotoImport(e as any, false, setActiveScreen);
                            input.click();
                          }}
                          photosCount={displayPhotos.length}
                          totalPhotosCount={photos.length}
                          cloudCount={cloudCount}
                          appLang={appLang}
                       />
                       <div className="flex-1 min-h-0 relative">
                          <PublicGallery 
                             isAdminMode={true}
                             onExit={() => setViewMode('public')}
                             showExit={true}
                             onOpenSettings={handleManageClick}
                             onAddPhoto={() => {
                               const input = document.createElement('input');
                               input.type = 'file';
                               input.accept = 'image/*';
                               input.multiple = true;
                               input.onchange = (e) => handlePhotoImport(e as any, false, setActiveScreen);
                               input.click();
                             }}
                             onEditPhoto={(id) => setEditPhotoId(id)}
                             onGroupPhotos={(ids) => handleGroupPhotos(ids, user, () => {})}
                             onBatchEdit={setBatchEditIds}
                             hideHeader={true}
                             onRefresh={() => refreshCloudData(
                                 user, categories, tags, manufacturers, setSettings, setPublicCategories, setPublicTags, setPublicManufacturers, setCategories, setTags, setManufacturers, setPhotos, setCloudCount, true
                             )}
                             columns={columns}
                             setColumns={setColumns}
                             cloudCount={cloudCount}
                          />
                       </div>
                    </div>
            )}

            {activeScreen === 'home' && viewMode === 'public' && (
              <div className="flex flex-col fixed inset-0 bg-[#FDFAF6] overflow-hidden">
                 <div className="flex-1 min-h-0 relative bg-bg">
                    <PublicGallery 
                       isAdminMode={false}
                       onExit={() => setViewMode('private')}
                       showExit={true}
                       onRefresh={() => performPullSync()}
                       hideHeader={false}
                       columns={columns}
                       setColumns={setColumns}
                       cloudCount={cloudCount}
                       user={undefined}
                    />
                 </div>
              </div>
            )}
      
            <AnimatePresence>
              {isSyncing && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[2000] bg-white/60 backdrop-blur-md flex flex-col items-center justify-center p-6"
                >
                  <div className="w-12 h-12 relative">
                     <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                     <div className="absolute inset-0 border-t-4 border-blue-600 rounded-full animate-spin"></div>
                  </div>
                  
                  {isImporting && importTotal > 0 ? (
                    <div className="w-full max-w-xs mt-8">
                      <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                         <span>{t.uploadProgress}</span>
                         <span>{importProgress} / {importTotal}</span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 transition-all duration-300 ease-out" 
                          style={{ width: `${Math.round((importProgress / importTotal) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 text-center">
                      <p className="text-sm font-bold text-slate-800 tracking-tight">{t.processing}</p>
                      <p className="mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t.doNotClose}</p>
                    </div>
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