import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CheckSquare, X, Sparkles } from 'lucide-react';
import { loginWithGoogle, saveSettings } from '../services/supabaseService';
// Removed Tag import
import { ErrorBoundary } from '../components/ErrorBoundary';
// Removed Modals import

import { PhotoEditDrawer } from '../components/admin/PhotoEditDrawer';
import { BatchEditScreen } from '../components/admin/BatchEditScreen';
import { SettingsScreen } from '../components/SettingsScreen';
import { AdminLoginGate } from '../components/admin/AdminLoginGate';
import { AdminGlobalModals } from '../components/admin/AdminGlobalModals';
import { AdminLoadingOverlay } from '../components/admin/AdminLoadingOverlay';
import { AdminEditorScreen } from '../components/admin/AdminEditorScreen';
import { AdminMainScreen } from '../components/admin/AdminMainScreen';
import { useAdminData } from '../hooks/useAdminData';
import { useAdminPhotos } from '../hooks/useAdminPhotos';
import { useAdminCategory } from '../hooks/useAdminCategory';
import { useAdminCore } from '../hooks/useAdminCore';
import { useAdminDialogs } from '../hooks/useAdminDialogs';
import { useLoading } from '../hooks/useLoading';
import { usePhotoManagement } from '../hooks/usePhotoManagement';
import { useAuth } from '../hooks/useAuth';
import { useGalleryContext } from '../context/GalleryContext';
import { useErrorHandler } from '../utils/errorHandler';
import { usePermission } from '../hooks/usePermission';
import { useDelete } from '../hooks/useDelete';
import { formatDate } from '../utils/dateFormat';
import { categoryApi } from '../api/categories';
import { tagApi } from '../api/tags';
import { groupApi } from '../api/groups';
import { photoApi } from '../api/photos';
import { translations, LanguageCode } from '../lib/translations';
import { PAGINATION } from '../constants/config';
import { AdminSessionProvider, AdminPhotoProvider, AdminUIProvider, AdminUIContextType, AdminSessionContextType, AdminPhotoContextType } from '../context/AdminContexts';
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

export default function AdminView() {
  const { user, authChecked, logout } = useAuth();
  const navigate = useNavigate();
  const lang = (localStorage.getItem('appLang') as LanguageCode) || 'en';
  const t = translations[lang] ?? translations.en;

  const { alertDialog, setAlertDialog, promptDialog, setPromptDialog, promptValue, setPromptValue } = useAdminDialogs();

  // Lift UI states to the top level AdminView to avoid ReferenceErrors in login gate
  const [activeScreen, setActiveScreen] = useState<'home' | 'manage' | 'editor' | 'login'>('home');
  const [editPhotoId, setEditPhotoId] = useState<string | null>(null);
  const [batchEditIds, setBatchEditIds] = useState<string[] | null>(null);
  const { loadingState, setLoadingState, startLoading, stopLoading, withLoading } = useLoading();
  const [cloudCount, setCloudCount] = useState<number | null>(null);
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

  // --- Lifted state/hooks from AdminViewContent ---
  const [adTemplatesDB, setAdTemplatesDB] = useState<any[]>([]);
  const { 
    photos, setPhotos, categories, setCategories, tags, setTags, manufacturers, setManufacturers, 
    gridPhotos, displayPhotos, isMultiSelect, setIsMultiSelect, selectedIds, setSelectedIds,
    setUser, setIsAdminMode,
    visibleCount, setVisibleCount, tagIdToNameMap, clearSelection
  } = useGalleryContext();
  
  const { handleError } = useErrorHandler();
  const { canDelete, canEdit, isAdmin } = usePermission();
  const { deletePhotos, deleteGroup, deleteTag: deleteTagHook, deleteCategory: deleteCategoryHook } = useDelete();
  
  const cancelBatchAiRef = useRef(false);
  const [publicCategories, setPublicCategories] = useState<any[]>([]);
  const [publicTags, setPublicTags] = useState<any[]>([]);
  const [publicManufacturers, setPublicManufacturers] = useState<any[]>([]);

  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('grid');
  const [appLang] = useState('zh');
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [focusedGroupPhotoId, setFocusedGroupPhotoId] = useState<string | null>(null);
  const [columns, setColumns] = useState<2 | 3 | 5>(3);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  
  const { viewMode, setViewMode, settings, setSettings, refreshCloudData, handleLogoUpload, isSyncing: dataIsSyncing, saveSettings, performPushSync, performPullSync, handleSingleAiAnalyzeCallback, handleUngroup, handleGroupPhotos, adTemplatesDB: adTemplatesDB1, setAdTemplatesDB: setAdTemplatesDB1 } = useAdminData(user, withLoading, setCloudCount, setPublicCategories, setPublicTags, setPublicManufacturers);
  const [isSyncing, setIsSyncing] = useState(dataIsSyncing);
  useEffect(() => setIsSyncing(dataIsSyncing), [dataIsSyncing]);
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

  // Context values computed at top level
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
    setSettings
  }), [settings, setSettings]);

  const tValue = React.useMemo(() => t, [t]);

  const { newPhotoData, setNewPhotoData, formState, updateForm, showOtherFields, setShowOtherFields, resetAddState, saveNewPhoto, saveBatchEdit } = usePhotoManagement(user, uiBasicValue, sessionBasicValue);

  const { 
    updateTag, deleteTag, 
    addCategory, updateCategory, deleteCategory, 
    addManufacturer, updateManufacturer, deleteManufacturer,
    addTag, removeTagFromPhoto
  } = useAdminCategory(uiBasicValue);

  const { 
    batchProgress, isImporting, importProgress, importTotal, 
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
  
  const handleDeletePhoto = useCallback(async (id: string) => {
    const { success, error } = await deletePhotos(id);
    if (success) {
      setEditPhotoId(null);
    } else {
      console.error(error);
    }
  }, [deletePhotos, setEditPhotoId]);
  
  const handleDeleteTag = useCallback((id: string) => {
    deleteTagHook(id);
  }, [deleteTagHook]);

  // Providers' values
  const onRefresh = useCallback(() => 
    refreshCloudData(user, true, setCloudCount, setPublicCategories, setPublicTags, setPublicManufacturers), 
    [user, refreshCloudData]);

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
    manufacturers, setManufacturers, adTemplates: adTemplatesDB, setAdTemplates: setAdTemplatesDB,
    handleSingleAiAnalyze, handleTranslate, handleBatchAiIdentify, handleGroupAiIdentify, handlePhotoImport,
    handleSingleAiAnalyzeCallback,
    deletePhoto: deletePhoto, deleteGroup, handleGroupPhotos, handleUngroup, saveNewPhoto, saveBatchEdit,
    updateTag, deleteTag: handleDeleteTag, 
    updateCategory, deleteCategory, addCategory,
    addManufacturer, updateManufacturer, deleteManufacturer,
    addTag, removeTagFromPhoto,
    quickAddTag: () => {}, quickAddManufacturer: () => {} // Refactored these for now
  }), [
    photos, setPhotos, categories, setCategories, tags, setTags, manufacturers, setManufacturers, adTemplatesDB, setAdTemplatesDB,
    handleSingleAiAnalyze, handleBatchAiIdentify, handleGroupAiIdentify, handlePhotoImport, 
    handleSingleAiAnalyzeCallback, deletePhoto, deleteGroup, handleGroupPhotos, handleUngroup, saveNewPhoto, saveBatchEdit,
    updateTag, handleDeleteTag, updateCategory, deleteCategory, addCategory, addManufacturer, updateManufacturer, deleteManufacturer,
    addTag
  ]);

  const uiValue = React.useMemo(() => ({
    activeScreen, setActiveScreen, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds,
    alertDialog, setAlertDialog, promptDialog, setPromptDialog,
    toast: toast, showToast: showToast,
    loadingState, setLoadingState, withLoading, batchProgress, aiDebugInfo, abortAnalysis,
    isAnalyzing: loadingState === 'analyzing'
  }), [
    activeScreen, editPhotoId, batchEditIds, alertDialog, setAlertDialog, promptDialog, setPromptDialog,
    toast, showToast, loadingState, setLoadingState, withLoading, batchProgress, aiDebugInfo, abortAnalysis
  ]);

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
              <AdminLoginGate t={t} loginWithGoogle={loginWithGoogle} showToast={showToast} navigate={navigate} />
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

function AdminViewContent({ user, authChecked, logout, errorContent, t, lang, uiProps, dialogProps }: { 
  user: any, 
  authChecked: boolean, 
  logout: () => void, 
  errorContent: React.ReactNode,
  t: any,
  lang: LanguageCode,
  uiProps: any,
  dialogProps: any
}) {
  const [adTemplatesDB, setAdTemplatesDB] = useState<any[]>([]);
  const navigate = useNavigate();
  const { 
    photos, setPhotos, categories, setCategories, tags, setTags, manufacturers, setManufacturers, 
    gridPhotos, displayPhotos, isMultiSelect, setIsMultiSelect, selectedIds, setSelectedIds,
    setUser, setIsAdminMode,
    visibleCount, setVisibleCount, tagIdToNameMap, clearSelection
  } = useGalleryContext();
  
  const { alertDialog, setAlertDialog, promptDialog, setPromptDialog, promptValue, setPromptValue, toast, showToast } = dialogProps;
  const { activeScreen, setActiveScreen, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds, loadingState, setLoadingState, withLoading, cloudCount, setCloudCount } = uiProps;

  const { handleError } = useErrorHandler();
  const { canDelete, canEdit, isAdmin } = usePermission();
  const { deletePhotos, deleteGroup, deleteTag: deleteTagHook, deleteCategory: deleteCategoryHook } = useDelete();

  useEffect(() => {
    setUser(user);
    setIsAdminMode(isAdmin || sessionStorage.getItem('isStaffMode') === 'true');
  }, [user, setUser, setIsAdminMode, isAdmin]);
  
  const cancelBatchAiRef = useRef(false);
  
  const [publicCategories, setPublicCategories] = useState<any[]>([]);
  const [publicTags, setPublicTags] = useState<any[]>([]);
  const [publicManufacturers, setPublicManufacturers] = useState<any[]>([]);

  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('grid');
  const [appLang] = useState('zh');
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [focusedGroupPhotoId, setFocusedGroupPhotoId] = useState<string | null>(null);
  const [columns, setColumns] = useState<2 | 3 | 5>(3);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  
  const { viewMode, setViewMode, settings, setSettings, refreshCloudData, handleLogoUpload, isSyncing, saveSettings, performPushSync, performPullSync, handleSingleAiAnalyzeCallback, handleUngroup, handleGroupPhotos, adTemplatesDB: adTemplatesDB2, setAdTemplatesDB: setAdTemplatesDB2 } = useAdminData(user, withLoading, setCloudCount, setPublicCategories, setPublicTags, setPublicManufacturers);
  useEffect(() => { setAdTemplatesDB(adTemplatesDB2); }, [adTemplatesDB2]);
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
    setSettings
  }), [settings, setSettings]);

  const tValue = React.useMemo(() => t, [t]);

  const { newPhotoData, setNewPhotoData, formState, updateForm, showOtherFields, setShowOtherFields, resetAddState, saveNewPhoto, saveBatchEdit } = usePhotoManagement(user, uiBasicValue, sessionBasicValue);

  const { 
    updateTag, deleteTag, 
    addCategory, updateCategory, deleteCategory, 
    addManufacturer, updateManufacturer, deleteManufacturer,
    addTag, removeTagFromPhoto
  } = useAdminCategory(uiBasicValue);

  const quickAddTag = useCallback(() => {
    console.log('[AdminView] quickAddTag triggered');
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
    console.log('[AdminView] quickAddManufacturer triggered');
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
    batchProgress, isImporting, importProgress, importTotal, 
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

  const handleDeletePhotos = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const { success, error } = await deletePhotos(ids);
    if (success) {
        showToast(`已成功刪除 ${ids.length} 張照片`, 'success');
        clearSelection();
        setEditPhotoId(null);
        setSelectedIds([]);
        setIsMultiSelect(false);
    } else {
        handleError(error, '刪除照片失敗');
    }
  }, [deletePhotos, user, clearSelection, setEditPhotoId, setSelectedIds, setIsMultiSelect, showToast, handleError]);
  
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
  
  const handleDeleteCategory = useCallback(async (id: string) => {
    const { success, error } = await deleteCategoryHook(id);
    if (success) {
        showToast('分類已成功刪除', 'success');
    } else {
        handleError(error, '刪除分類失敗');
    }
  }, [deleteCategoryHook, showToast, handleError]);

  // Auto refresh is handled in useAdminData

  const onRefresh = useCallback(() => 
    refreshCloudData(user, true, setCloudCount, setPublicCategories, setPublicTags, setPublicManufacturers), 
    [user, refreshCloudData]);

  const sessionValue = React.useMemo(() => ({
    user, isAdminMode: true, 
    settings, setSettings, geminiApiKey, setGeminiApiKey,
    internalPassword, setInternalPassword, customModel, setCustomModel,
    viewMode, setViewMode,
    isSyncing, onRefresh,
    loginWithGoogle, logout, appLang: lang
  }), [user, settings, setSettings, geminiApiKey, setGeminiApiKey, internalPassword, setInternalPassword, customModel, setCustomModel, viewMode, setViewMode, isSyncing, onRefresh, logout, lang]);

  const photoValue = React.useMemo(() => ({
    photos, setPhotos, categories, setCategories, tags, setTags,
    manufacturers, setManufacturers, adTemplates: adTemplatesDB, setAdTemplates: setAdTemplatesDB,
    handleSingleAiAnalyze, handleTranslate, handleBatchAiIdentify, handleGroupAiIdentify, handlePhotoImport,
    handleSingleAiAnalyzeCallback,
    deletePhoto: deletePhoto, handleGroupPhotos, handleUngroup, saveNewPhoto, saveBatchEdit,
    updateTag, deleteTag: handleDeleteTag, 
    updateCategory, deleteCategory, addCategory,
    addManufacturer, updateManufacturer, deleteManufacturer,
    addTag, removeTagFromPhoto,
    quickAddTag,
    quickAddManufacturer
  }), [
    photos, setPhotos, categories, setCategories, tags, setTags, manufacturers, setManufacturers, adTemplatesDB, setAdTemplatesDB,
    handleSingleAiAnalyze, handleBatchAiIdentify, handleGroupAiIdentify, handlePhotoImport, 
    handleSingleAiAnalyzeCallback, handleDeletePhoto, handleGroupPhotos, handleUngroup, saveNewPhoto, saveBatchEdit,
    updateTag, handleDeleteTag, updateCategory, deleteCategory, addCategory, addManufacturer, updateManufacturer, deleteManufacturer,
    addTag, quickAddTag, quickAddManufacturer
  ]);

  const uiValue = React.useMemo(() => ({
    activeScreen, setActiveScreen, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds,
    alertDialog, setAlertDialog, promptDialog, setPromptDialog,
    toast: toast, showToast: showToast,
    loadingState, setLoadingState, withLoading, batchProgress, aiDebugInfo, abortAnalysis,
    isAnalyzing: loadingState === 'analyzing'
  }), [
    activeScreen, editPhotoId, batchEditIds, alertDialog, setAlertDialog, promptDialog, setPromptDialog,
    toast, showToast, loadingState, setLoadingState, withLoading, batchProgress, aiDebugInfo, abortAnalysis
  ]);

  const handleBatchAiIdentifyTrigger = () => {
    if (loadingState === 'analyzing') {
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
            <AdminGlobalModals alertDialog={alertDialog} setAlertDialog={setAlertDialog} promptDialog={promptDialog} setPromptDialog={setPromptDialog} toast={toast} />

            {errorContent}
            

      
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
            
            {activeScreen === 'home' && (
              <AdminMainScreen
                activeGroupId={activeGroupId}
                setActiveGroupId={setActiveGroupId}
                setAlertDialog={setAlertDialog}
                photos={photos}
                setPhotos={setPhotos}
                setEditPhotoId={setEditPhotoId}
                setBatchEditIds={setBatchEditIds}
                handleUngroup={handleUngroup}
                handlePhotoImport={handlePhotoImport}
                lang={lang}
                t={t}
                categories={categories}
                manufacturers={manufacturers}
                tags={tags}
                tagIdToNameMap={tagIdToNameMap}
                handleGroupAiIdentify={handleGroupAiIdentify}
                handleSingleAiAnalyze={handleSingleAiAnalyze}
                handleError={handleError}
                viewMode={viewMode}
                setViewMode={setViewMode}
                isMultiSelect={isMultiSelect}
                selectedIds={selectedIds}
                gridPhotos={gridPhotos}
                setSelectedIds={setSelectedIds}
                setIsMultiSelect={setIsMultiSelect}
                handleBatchAiIdentifyTrigger={handleBatchAiIdentifyTrigger}
                setActiveScreen={setActiveScreen}
                loginWithGoogle={loginWithGoogle}
                performPullSync={performPullSync}
                cloudCount={cloudCount}
                appLang={appLang}
                settings={settings}
                loadingState={loadingState}
                columns={columns}
                setColumns={setColumns}
                user={user}
                visibleCount={visibleCount}
                setVisibleCount={setVisibleCount}
                showToast={showToast}
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

            {activeScreen === 'editor' && <AdminEditorScreen setActiveScreen={setActiveScreen} />}
      
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
            

      
            <AdminLoadingOverlay loadingState={loadingState} batchProgress={batchProgress} importProgress={importProgress} importTotal={importTotal} abortAnalysis={abortAnalysis} cancelBatchAiRef={cancelBatchAiRef} t={t} />
      


          </AdminUIProvider>
        </AdminPhotoProvider>
      </AdminSessionProvider>
    </ErrorBoundary>
  );
}