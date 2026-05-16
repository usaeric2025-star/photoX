import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { loginWithGoogle } from '../services/supabaseService';
import { ErrorBoundary } from '../components/ErrorBoundary';

import { useSyncEngine } from '../hooks/useSyncEngine';
import { useAdminDialogs } from '../hooks/useAdminDialogs';
import { useLoading } from '../hooks/useLoading';
import { useAuth } from '../hooks/useAuth';
import { useGallery } from '../hooks/useGallery';
import { loadData } from '../utils/indexedDB';
import { translations, LanguageCode } from '../lib/translations';
import { showSystemError } from '../context/ErrorContext';
import { AdminSessionProvider, AdminPhotoProvider, AdminUIProvider } from '../context/AdminContexts';
import { AdminViewContent } from './AdminViewContent';
import { Photo, Category, Tag, Manufacturer } from '../types';

const errorGuard = (name: string) => () => {
  console.error(`Blocked call to ${name}`);
  throw new Error(`[Architecture Error] Illegal call to "${name}".`);
};

import { 
  useAddTagMutation, useUpdateTagMutation, useDeleteTagMutation,
  useAddCategoryMutation, useUpdateCategoryMutation, useDeleteCategoryMutation,
  useAddManufacturerMutation, useUpdateManufacturerMutation, useDeleteManufacturerMutation
} from '../hooks/mutations/useAdminMutations';
import { useUpdatePhotoMutation, useBatchUpdatePhotosMutation } from '../hooks/mutations/useUpdatePhoto';
import { useDeletePhotoMutation } from '../hooks/mutations/useDeletePhoto';
import { useGroupPhotosMutation, useUngroupMutation } from '../hooks/mutations/useGroupOperations';

import { useAdminCategory } from '../hooks/useAdminCategory';
import { useAdminPhotos } from '../hooks/useAdminPhotos';
import { useAdminCore } from '../hooks/useAdminCore';
import { usePhotoManagement } from '../hooks/usePhotoManagement';
import { useDelete } from '../hooks/useDelete';
import { ProductFormData } from '../types';

export default function AdminView() {
  const { user, authChecked, logout } = useAuth();
  const navigate = useNavigate();

  // Mutations
  const addTagMutation = useAddTagMutation();
  const updateTagMutation = useUpdateTagMutation();
  const deleteTagMutation = useDeleteTagMutation();
  const addCategoryMutation = useAddCategoryMutation();
  const updateCategoryMutation = useUpdateCategoryMutation();
  const deleteCategoryMutation = useDeleteCategoryMutation();
  const addManufacturerMutation = useAddManufacturerMutation();
  const updateManufacturerMutation = useUpdateManufacturerMutation();
  const deleteManufacturerMutation = useDeleteManufacturerMutation();
  const updatePhotoMutation = useUpdatePhotoMutation();
  const batchUpdatePhotosMutation = useBatchUpdatePhotosMutation();
  const deletePhotoMutation = useDeletePhotoMutation();
  const groupPhotosMutation = useGroupPhotosMutation();
  const ungroupMutation = useUngroupMutation();

  const { alertDialog, setAlertDialog, promptDialog, setPromptDialog, promptValue, setPromptValue } = useAdminDialogs();

  const [activeScreen, setActiveScreen] = useState<'home' | 'manage' | 'login'>('home');
  const [editPhotoId, setEditPhotoId] = useState<string | null>(null);
  const [batchEditIds, setBatchEditIds] = useState<string[] | null>(null);
  const { loadingState: loadingType, setLoadingState: setLoadingType, withLoading } = useLoading();
  const [cloudCount, setCloudCount] = useState<number | null>(null);

  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [accessPasscode, setAccessPasscode] = useState('');
  const [customModel, setCustomModel] = useState('gemini-1.5-flash');

  const { 
    photos, categories, tags, manufacturers, tagNameToIdMap
  } = useGallery();
  
  const { viewMode, setViewMode, settings, setSettings, refreshCloudData, isSyncing, setIsSyncing } = useSyncEngine(withLoading);

  const uiBasicValue = React.useMemo(() => ({ 
    setAlertDialog, 
    setPromptDialog, 
    setActiveScreen: (s: 'home' | 'manage' | 'login') => setActiveScreen(s),
    setLoadingType,
    loadingType,
    withLoading,
    setCloudCount,
    cloudCount,
    editPhotoId, setEditPhotoId,
    batchEditIds, setBatchEditIds,
    abortAnalysis: errorGuard('abortAnalysis')
  }), [setAlertDialog, setPromptDialog, setActiveScreen, setLoadingType, loadingType, withLoading, setCloudCount, cloudCount, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds]);

  const sessionBasicValue = React.useMemo(() => ({ 
    settings,
    setSettings,
    setIsSyncing
  }), [settings, setSettings, setIsSyncing]);

  const { 
    updateTag, deleteTag,
    addCategory, updateCategory, deleteCategory, 
    addManufacturer, updateManufacturer, deleteManufacturer,
    addTag, removeTagFromPhoto
  } = useAdminCategory(uiBasicValue);

  const { 
    saveSettings,
    performPushSync, performPullSync, handleSingleAiAnalyzeCallback, 
    handleUngroup, handleGroupPhotos 
  } = useAdminCore(user);

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
          toast.error(`标签 "${normalized}" 已存在`);
          return;
        }
        const saved = await addTag(normalized);
        if (saved) {
           updateForm((prev: ProductFormData) => ({ 
             ...prev, 
             tagIds: [...new Set([...(prev.tagIds || []), String(saved.id)])] 
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

  const { deleteGroup } = useDelete();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && user) {
        console.warn('⚠️ 用户已登录但 session 丢失，请刷新页面或重新登录');
      }
    });
  }, [user]);
  
  useEffect(() => {
    if (authChecked) {
      console.log("[AdminView] Auth Check Complete. User:", user?.email || 'Guest');
    }
  }, [authChecked, user]);
  const lang = (localStorage.getItem('appLang') as LanguageCode) || 'en';
  const t = translations[lang] ?? translations.en;

  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      setPageError(e.message);
      showSystemError(`[Runtime] ${e.message}`);
    };
    const handleRejection = (e: PromiseRejectionEvent) => {
      const msg = String(e.reason?.message || e.reason);
      setPageError(msg);
      showSystemError(`[UncaughtRejection] ${msg}`);
    };
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

  const onRefresh = useCallback(() => 
    refreshCloudData(user, true, setCloudCount), 
    [user, refreshCloudData]);

  const sessionValue = React.useMemo(() => ({
    user, isAdminMode: true, 
    settings, setSettings,
    geminiApiKey, setGeminiApiKey,
    accessPasscode, setAccessPasscode,
    customModel, setCustomModel,
    viewMode, setViewMode,
    isSyncing, setIsSyncing, onRefresh,
    loginWithGoogle, logout, appLang: lang
  }), [user, settings, setSettings, geminiApiKey, accessPasscode, customModel, viewMode, setViewMode, isSyncing, setIsSyncing, onRefresh, logout, lang]);

  const photoValue = React.useMemo(() => ({
    photos, categories, tags, manufacturers,
    handleSingleAiAnalyze, handleTranslate, handleBatchAiIdentify, handleGroupAiIdentify, handlePhotoImport,
    handleSingleAiAnalyzeCallback,
    deletePhoto, handleGroupPhotos, handleUngroup, saveNewPhoto, saveBatchEdit,
    updateTag, deleteTag, updateCategory, deleteCategory, addCategory,
    addManufacturer, updateManufacturer, deleteManufacturer,
    addTag, removeTagFromPhoto,
    quickAddTag,
    quickAddManufacturer,
    deleteGroup,
    updatePhoto,
    updatePhotosBulk
  }), [
    photos, categories, tags, manufacturers,
    handleSingleAiAnalyze, handleTranslate, handleBatchAiIdentify, handleGroupAiIdentify, handlePhotoImport, 
    handleSingleAiAnalyzeCallback, deletePhoto, handleGroupPhotos, handleUngroup, saveNewPhoto, saveBatchEdit,
    updateTag, deleteTag, updateCategory, deleteCategory, addCategory, addManufacturer, updateManufacturer, deleteManufacturer,
    addTag, removeTagFromPhoto, quickAddTag, quickAddManufacturer, deleteGroup, updatePhoto, updatePhotosBulk
  ]);

  const uiValue = React.useMemo(() => ({
    activeScreen, setActiveScreen, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds,
    alertDialog, setAlertDialog, promptDialog, setPromptDialog,
    loadingType, setLoadingType, withLoading, batchProgress, aiDebugInfo, setAiDebugInfo, abortAnalysis,
    isAnalyzing: loadingType === 'analyzing',
    cloudCount, setCloudCount
  }), [
    activeScreen, editPhotoId, batchEditIds, alertDialog, setAlertDialog, promptDialog, setPromptDialog,
    loadingType, setLoadingType, withLoading, batchProgress, aiDebugInfo, setAiDebugInfo, abortAnalysis,
    cloudCount, setCloudCount
  ]);

  if (!authChecked) {
    return (
       <ErrorBoundary key="auth-verifying">
        {errorContent}
        <div className="w-full h-full min-h-screen flex flex-col bg-[#FDFBF7] overflow-hidden">
           {/* Mock Header */}
           <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between">
              <div className="h-6 w-32 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-8 w-8 bg-slate-100 rounded-full animate-pulse" />
           </div>
           {/* Skeleton Grid */}
           <div className="flex-1 p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="aspect-[4/5] bg-white rounded-2xl border border-slate-100 animate-pulse relative overflow-hidden">
                   <div className="absolute inset-0 bg-slate-50" />
                   <div className="absolute bottom-0 left-0 right-0 p-3 bg-white/80 backdrop-blur-sm space-y-2">
                      <div className="h-3 w-3/4 bg-slate-100 rounded" />
                      <div className="h-2 w-1/2 bg-slate-50 rounded" />
                   </div>
                </div>
              ))}
           </div>
           {/* Subtle loading indicator instead of full overlay */}
           <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-sm border border-slate-100 z-50 flex items-center gap-3">
              <div className="w-3 h-3 border-2 border-brand-gold/20 border-t-brand-gold rounded-full animate-spin"></div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-brand-gold">Session Check</p>
           </div>
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
                            toast.error(`${t.loginFailedAlert} ${error.message || JSON.stringify(e)}`);
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
          />
        </AdminPhotoProvider>
      </AdminSessionProvider>
    </AdminUIProvider>
  );
}
