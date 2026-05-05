import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithGoogle } from '../services/supabaseService';
import { ErrorBoundary } from '../components/ErrorBoundary';

import { useSyncEngine } from '../hooks/useSyncEngine';
import { useAdminDialogs } from '../hooks/useAdminDialogs';
import { useLoading } from '../hooks/useLoading';
import { useAuth } from '../hooks/useAuth';
import { useGalleryContext } from '../context/GalleryContext';
import { translations, LanguageCode } from '../lib/translations';
import { AdminSessionProvider, AdminPhotoProvider, AdminUIProvider } from '../context/AdminContexts';
import { AdminViewContent } from './AdminViewContent';
import { Photo, Category, Tag, Manufacturer } from '../types';

const errorGuard = (name: string) => () => {
  console.error(`Blocked call to ${name}`);
  throw new Error(`[Architecture Error] Illegal call to "${name}".`);
};

export default function AdminView() {
  const { user, authChecked, logout } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (authChecked) {
      console.log("[AdminView] Auth Check Complete. User:", user?.email || 'Guest');
    }
  }, [authChecked, user]);
  const lang = (localStorage.getItem('appLang') as LanguageCode) || 'en';
  const t = translations[lang] ?? translations.en;

  const { alertDialog, setAlertDialog, promptDialog, setPromptDialog, promptValue, setPromptValue } = useAdminDialogs();

  const [activeScreen, setActiveScreen] = useState<'home' | 'manage' | 'login'>('home');
  const [editPhotoId, setEditPhotoId] = useState<string | null>(null);
  const [batchEditIds, setBatchEditIds] = useState<string[] | null>(null);
  const { loadingState, setLoadingState, withLoading } = useLoading();
  const [cloudCount, setCloudCount] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'loading' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'loading' = 'success', persistent = false) => {
    setToast({ message, type });
    if (!persistent) {
      setTimeout(() => setToast(null), 3000);
    }
    return () => setToast(null);
  }, []);

  const [pageError, setPageError] = useState<string | null>(null);

  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [internalPassword, setInternalPassword] = useState('');
  const [customModel, setCustomModel] = useState('gemini-1.5-flash');

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

  const { 
    photos, setPhotos, categories, setCategories, tags, setTags, manufacturers, setManufacturers
  } = useGalleryContext();
  
  const { viewMode, setViewMode, settings, setSettings, refreshCloudData, isSyncing, setIsSyncing } = useSyncEngine(withLoading);
  
  const uiBasicValue = React.useMemo(() => ({ 
    setAlertDialog, 
    setPromptDialog, 
    setActiveScreen: (s: 'home' | 'manage' | 'login') => setActiveScreen(s),
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

  const onRefresh = useCallback(() => 
    refreshCloudData(user, true, setCloudCount), 
    [user, refreshCloudData]);

  const sessionValue = React.useMemo(() => ({
    user, isAdminMode: true, 
    settings, setSettings,
    geminiApiKey, setGeminiApiKey,
    internalPassword, setInternalPassword,
    customModel, setCustomModel,
    viewMode, setViewMode,
    isSyncing, setIsSyncing, onRefresh,
    loginWithGoogle, logout, appLang: lang
  }), [user, settings, setSettings, geminiApiKey, internalPassword, customModel, viewMode, setViewMode, isSyncing, setIsSyncing, onRefresh, logout, lang]);

  const photoValue = React.useMemo(() => ({
    photos, setPhotos, categories, setCategories, tags, setTags,
    manufacturers, setManufacturers,
    handleSingleAiAnalyze: async () => ({}),
    handleTranslate: async () => ({ en: '', ms: '' }),
    handleBatchAiIdentify: async () => {},
    handleGroupAiIdentify: async () => {},
    handlePhotoImport: async () => {},
    handleSingleAiAnalyzeCallback: async () => ({ success: true }),
    handleGroupPhotos: async () => ({ success: true }),
    handleUngroup: async () => ({ success: true }),
    saveNewPhoto: async () => {},
    saveBatchEdit: async () => {},
    deletePhoto: async () => {},
    deleteGroup: async () => ({ success: true }),
    updateTag: async () => {},
    deleteTag: async () => {},
    addTag: async () => ({} as Tag),
    updateCategory: async () => {},
    deleteCategory: async () => {},
    addCategory: async () => {},
    addManufacturer: async () => ({} as Manufacturer),
    updateManufacturer: async () => {},
    deleteManufacturer: async () => {},
    removeTagFromPhoto: async () => {},
    quickAddTag: () => {},
    quickAddManufacturer: () => {}
  }), [photos, setPhotos, categories, setCategories, tags, setTags, manufacturers, setManufacturers]);

  const uiValue = React.useMemo(() => ({
    activeScreen, setActiveScreen, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds,
    alertDialog, setAlertDialog, promptDialog, setPromptDialog,
    toast, showToast,
    loadingState, setLoadingState, withLoading, 
    batchProgress: { current: 0, total: 0 },
    isAnalyzing: loadingState === 'analyzing',
    aiDebugInfo: null,
    abortAnalysis: () => {}
  }), [activeScreen, editPhotoId, batchEditIds, alertDialog, setAlertDialog, promptDialog, setPromptDialog, toast, showToast, loadingState, setLoadingState, withLoading]);

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

  if (!user && sessionStorage.getItem('isStaffMode') !== 'true') {
    return (
      <AdminUIProvider value={uiValue}>
        <AdminSessionProvider value={sessionValue}>
          <AdminPhotoProvider value={photoValue}>
             <ErrorBoundary key="login-gate">
              {errorContent}
              <div className="w-full h-full min-h-screen flex items-center justify-center bg-[#FDFBF7]">
                 <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-sm text-center border border-slate-100">
                    <h2 className="text-xl font-black text-slate-800 tracking-tight leading-tight mb-2">{t.adminTitle}</h2>
                    <p className="text-sm text-slate-500 mb-8">{t.adminSub}</p>
                    <button 
                      onClick={async () => {
                        try {
                          await loginWithGoogle();
                        } catch(e) {
                          const error = e instanceof Error ? e : new Error(String(e));
                          showToast(`${t.loginFailedAlert} ${error.message || JSON.stringify(e)}`, 'error');
                        }
                      }}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20 active:scale-[0.98] hover:bg-blue-700 transition-all mb-4"
                    >
                      {t.googleLoginBtn}
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
          </AdminPhotoProvider>
        </AdminSessionProvider>
      </AdminUIProvider>
    );
  }

  return (
    <AdminUIProvider value={uiValue}>
      <AdminSessionProvider value={sessionValue}>
        <AdminPhotoProvider value={photoValue}>
          <AdminViewContent 
            user={user} 
            authChecked={authChecked} 
            logout={logout} 
            errorContent={errorContent}
            t={t}
            lang={lang as LanguageCode}
            uiProps={{
              activeScreen, setActiveScreen,
              editPhotoId, setEditPhotoId,
              batchEditIds, setBatchEditIds,
              loadingState, setLoadingState, withLoading,
              cloudCount, setCloudCount
            }}
            dialogProps={{
              alertDialog, setAlertDialog, promptDialog, setPromptDialog, promptValue, setPromptValue,
              toast, showToast
            }}
          />
        </AdminPhotoProvider>
      </AdminSessionProvider>
    </AdminUIProvider>
  );
}
