import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  X, 
  CheckSquare, 
  Settings2, 
  Layers, 
  Sparkles, 
  LogIn, 
  RefreshCcw, 
  Globe,
  ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  onAuthChange, 
  loginWithGoogle, 
  loadCategoriesFromCloud, 
  loadAllPhotosFromCloud, 
  saveSettings as saveSettingsCloud, 
  syncPhotosToCloud as syncPhotosToCloudService,
  fetchSettings as fetchSettingsCloud,
  uploadLogo,
  deletePhotoFromCloud,
  savePhotoToCloud
} from '../services/supabaseService';
import { analyzeProductPhoto } from '../services/geminiService';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Modals } from '../components/admin/Modals';
import { ProductGrid } from '../components/admin/ProductGrid';
import { PhotoEditDrawer } from '../components/admin/PhotoEditDrawer';
import { SyncPanel } from '../components/admin/SyncPanel';
import { AdminHeader } from '../components/admin/AdminHeader';
import { BatchEditScreen } from '../components/admin/BatchEditScreen';
import { SearchAndFilter } from '../components/admin/SearchAndFilter';
import { Photo, Category, Tag, SubCategory } from '../types';
import { initDB, saveData, loadData } from '../utils/indexedDB';
import { useSyncEngine } from '../hooks/useSyncEngine';
import { useAdminPhotos } from '../hooks/useAdminPhotos';
import { useAdminCategory } from '../hooks/useAdminCategory';
import { usePhotoManagement } from '../hooks/usePhotoManagement';
import { useAuth } from '../hooks/useAuth';
import { useGalleryContext } from '../context/GalleryContext';
import { SettingsScreen } from '../components/SettingsScreen';
import { UploadForm } from '../components/admin/UploadForm';
import { LoginScreen } from '../components/admin/LoginScreen';
import { GroupDetailScreen } from '../components/admin/GroupDetailScreen';
import { PublicGallery } from '../components/PublicGallery';
import { translations, LanguageCode } from '../lib/translations';

export default function AdminView() {
  const lang = (localStorage.getItem('appLang') as LanguageCode) || 'en';
  const t = translations[lang] || translations['en'];
  const { user, authChecked, logout } = useAuth();
  const {
    photos, setPhotos,
    categories, setCategories,
    tags, setTags,
    dbCategories, setDbCategories,
    manufacturers, setManufacturers,
    searchQuery, setSearchQuery,
    filterCatId, setFilterCatId,
    filterSubId, setFilterSubId,
    filterTagIds, setFilterTagIds,
    sortOrder, setSortOrder,
    showGroupsCollapsed, setShowGroupsCollapsed,
    selectedIds, setSelectedIds,
    isMultiSelect, setIsMultiSelect,
    gridPhotos, // Use this for filtered/sorted list
    displayPhotos,
    visibleCount, setVisibleCount
  } = useGalleryContext();
  
  const navigate = useNavigate();
  const [pageError, setPageError] = useState<string | null>(null);

  const getSafeSessionStorage = (key: string) => { try { return sessionStorage.getItem(key); } catch { return null; } };
  const getSafeLocalStorage = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };

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

  const [activeScreen, setActiveScreen] = useState('home');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Handle OAuth Hash Redirect
  useEffect(() => {
    if (window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<any>(null);
  const [alertDialog, setAlertDialog] = useState<any>(null);
  const [promptDialog, setPromptDialog] = useState<any>(null);
  const [promptValue, setPromptValue] = useState('');
  // const [searchQuery, setSearchQuery] = useState('');
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('grid');
  // const [showGroupsCollapsed, setShowGroupsCollapsed] = useState(true);
  // const [filterCatId, setFilterCatId] = useState<string | null>(null);
  // const [filterSubId, setFilterSubId] = useState<string | null>(null);
  // const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  // const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [appLang] = useState('zh');
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [focusedGroupPhotoId, setFocusedGroupPhotoId] = useState<string | null>(null);
  const [columns, setColumns] = useState<2 | 3 | 5>(3);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [aiProvider, setAiProvider] = useState('gemini');
  const [customModel, setCustomModel] = useState(getSafeLocalStorage('ai_custom_model') || 'gemini-1.5-flash');
  const cancelBatchAiRef = useRef<boolean>(false);
  
  const { 
    isSyncing, setIsSyncing,
    viewMode, setViewMode,
    settings, setSettings,
    lastSyncTime, setLastSyncTime,
    refreshCloudData,
    handleLogoUpload
    // Note: internalPassword and setInternalPassword are not returned by useSyncEngine 
    // They are usually in Settings state or settings object
  } = useSyncEngine();

  const [internalPassword, setInternalPassword] = useState('');

  useEffect(() => {
    if (settings) {
      if (settings.gemini_api_key) setGeminiApiKey(settings.gemini_api_key);
      if (settings.internal_password) setInternalPassword(settings.internal_password);
      if (settings.custom_model) {
        setCustomModel(settings.custom_model);
        localStorage.setItem('ai_custom_model', settings.custom_model);
      }
    }
  }, [settings]);

  const reconciled = useRef(false);
  useEffect(() => {
    if (reconciled.current) return;
    if (photos.length > 0) {
        import('../lib/reconcileData').then(({ reconcileData }) => {
            const { 
              reconciledCategories, 
              reconciledTags, 
              reconciledManufacturers, 
              hasChanged 
            } = reconcileData(photos, dbCategories, tags, manufacturers);
            
            if (hasChanged) {
                console.log("Reconciling data consistency...");
                saveSettingsCloud({ 
                    ...settings, 
                    categories: reconciledCategories,
                    tags: reconciledTags,
                    manufacturers: reconciledManufacturers
                });
                reconciled.current = true;
            }
        });
    }
  }, [photos, dbCategories, tags, manufacturers, settings]);


  const { 
    // categories, setCategories,
    // tags, setTags,
    updateTag,
    deleteTag,
    // dbCategories, setDbCategories,
    // manufacturers, setManufacturers,
    publicCategories, setPublicCategories,
    publicTags, setPublicTags,
    publicManufacturers, setPublicManufacturers
  } = useAdminCategory();
  
  const { 
    // photos, setPhotos,
    isAnalyzing, setIsAnalyzing,
    isBatchAnalyzing, batchProgress,
    isImporting, importProgress, importTotal,
    aiDebugInfo, abortAnalysis,
    cloudCount, setCloudCount,
    handleSingleAiAnalyze,
    handleBatchAiIdentify, handlePhotoImport, deletePhoto
  } = useAdminPhotos(user, geminiApiKey, aiProvider, customModel, setAlertDialog, setIsSyncing);

  // Auto refresh on mount if user exists
  useEffect(() => {
    if (authChecked && (user || sessionStorage.getItem('isStaffMode') === 'true')) {
      refreshCloudData(
        user, categories, tags, manufacturers, setSettings, setPublicCategories, setPublicTags, setPublicManufacturers, setDbCategories, setCategories, setTags, setManufacturers, setPhotos, setCloudCount, false
      );
    }
  }, [authChecked, user]);

  const { 
    newPhotoData, setNewPhotoData,
    editPhotoId, setEditPhotoId,
    batchEditIds, setBatchEditIds,
    formState, updateForm,
    showOtherFields, setShowOtherFields,
    resetAddState,
    saveNewPhoto,
    saveBatchEdit,
  } = usePhotoManagement(user, setAlertDialog, setIsSyncing, setActiveScreen);

  const handleUngroup = (groupId: string) => {
    setPhotos(prev => prev.map(p => p.groupId === groupId ? { ...p, groupId: null } : p));
  };

  const [syncPercent, setSyncPercent] = useState(0);
  const [syncAction, setSyncAction] = useState('idle');
  const [showManageAccess, setShowManageAccess] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [batchIsHiddenApplied, setBatchIsHiddenApplied] = useState(false);

  const handleGroupPhotos = async (ids: string[]) => {
    if (ids.length < 2) return;
    const groupId = `group-${Date.now()}`;
    
    // Update local state
    const updatedPhotos = photos.map(p => ids.includes(p.id) ? { ...p, groupId } : p);
    setPhotos(updatedPhotos);

    // Save changes to IndexedDB
    saveData('product_photos', updatedPhotos);
    
    // Persist changes to Cloud
    if (user) {
       for (const photo of updatedPhotos.filter(p => ids.includes(p.id))) {
         await savePhotoToCloud(user.id, photo);
       }
    }
  };

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

  const saveSettings = async (s: any) => { 
    setSettings(s); 
    await saveData('product_settings', s);
    if (user) {
      // Use the provided object 's' to ensure we aren't using stale scope variables
      const { categories: cats, tags: tg, manufacturers: mfrs } = s;
      setTimeout(() => {
        saveSettingsCloud({
          ...s,
          categories: cats || categories,
          tags: tg || tags,
          manufacturers: mfrs || manufacturers
        }).catch(console.error);
      }, 0);
    }
  };

  const performPushSync = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      await saveSettingsCloud({
        ...settings,
        categories,
        tags,
        manufacturers
      });
      const result = await syncPhotosToCloudService(user.id, photos, setSyncPercent);
      setAlertDialog({ 
        title: t.pushSuccess, 
        message: t.pushSuccessMsg(result.skipped) 
      });
    } catch (err: any) {
      setAlertDialog({ title: t.pushFail, message: err.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const performPullSync = async () => {
    setIsSyncing(true);
    try {
      await refreshCloudData(
        user, categories, tags, manufacturers, setSettings, 
        setPublicCategories, setPublicTags, setPublicManufacturers, 
        setDbCategories, setCategories, setTags, setManufacturers, setPhotos, setCloudCount, true
      );
      setAlertDialog({ title: t.pullSuccess, message: t.pullSuccessMsg });
    } catch (err: any) {
      setAlertDialog({ title: t.pullFail, message: err.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const quickAddSubCategory = () => {
    if (!formState.categoryId) return;
    setPromptValue('');
    setPromptDialog({
      title: '新增子分类',
      placeholder: '输入新子分类名称',
      onSubmit: async (val: string) => {
        const newSubId = crypto.randomUUID();
        const nextCats = categories.map(c => c.id === formState.categoryId ? {
          ...c,
          subcategories: [...c.subcategories, { id: newSubId, name: val.trim(), aliases: [] }]
        } : c);
        setCategories(nextCats);
        updateForm({ subcategoryId: newSubId });
        await saveSettings({ ...settings, categories: nextCats, tags, manufacturers });
      }
    });
  };
  const quickAddTag = () => {
    setPromptValue('');
    setPromptDialog({
      title: '自定义标签',
      placeholder: '输入新标签名称',
      onSubmit: async (val: string) => {
        const newTagId = crypto.randomUUID();
        const nextTags = [...tags, { id: newTagId, name: val.trim(), aliases: [] }];
        setTags(nextTags);
        updateForm({ tagIds: [...formState.tagIds, newTagId] });
        await saveSettings({ ...settings, categories, tags: nextTags, manufacturers });
      }
    });
  };
  const quickAddManufacturer = () => {
    setPromptValue('');
    setPromptDialog({
      title: '新增厂商',
      placeholder: '输入新厂商名称',
      onSubmit: async (val: string) => {
        const newMfrId = crypto.randomUUID();
        const nextMfrs = [...manufacturers, { id: newMfrId, name: val.trim(), aliases: [] }];
        setManufacturers(nextMfrs);
        updateForm({ subcategoryId: newMfrId });
        await saveSettings({ ...settings, categories, tags, manufacturers: nextMfrs });
      }
    });
  };

  const handleManageClick = () => setActiveScreen('manage');

  const mainContent = (
    <>
      {activeScreen === 'manage' && (
         <SettingsScreen 
           setActiveScreen={setActiveScreen}
           settings={settings}
           setSettings={setSettings}
           saveSettings={saveSettings}
           manufacturers={manufacturers}
           setManufacturers={setManufacturers}
           tags={tags}
           setTags={setTags}
           user={user}
           loginWithGoogle={loginWithGoogle}
           logout={logout}
           triggerManualSync={performPushSync}
           isSyncing={isSyncing}
           syncPercent={syncPercent}
           handleLogoUpload={handleLogoUpload}
           setCategories={setCategories}
           categories={categories}
           dbCategories={dbCategories}
           performPushSync={performPushSync}
           performPullSync={performPullSync}
           cloudCount={cloudCount}
           lastSyncTime={lastSyncTime}
           geminiApiKey={geminiApiKey}
           setGeminiApiKey={setGeminiApiKey}
           customModel={customModel}
           setCustomModel={setCustomModel}
           internalPassword={internalPassword}
           setInternalPassword={setInternalPassword}
           photos={photos}
           setPhotos={setPhotos}
         />
      )}

      {(editPhotoId || newPhotoData) && (
          <PhotoEditDrawer 
              editPhotoId={editPhotoId} resetAddState={resetAddState} saveNewPhoto={async () => {
                await saveNewPhoto();
                showToast(t.saveSuccess || '保存成功');
              }} photos={photos} updateTag={updateTag}
              formState={formState}
              updateForm={updateForm}
              showOtherFields={showOtherFields} setShowOtherFields={setShowOtherFields}
              isSyncing={isSyncing} dbCategories={dbCategories} categories={categories} appLang={appLang}
              quickAddSubCategory={quickAddSubCategory} quickAddTag={quickAddTag} quickAddManufacturer={quickAddManufacturer} tags={tags}
              newPhotoData={newPhotoData} manufacturers={manufacturers}
              aiDebugInfo={aiDebugInfo}
              isAnalyzing={isAnalyzing}
              handleSingleAiAnalyze={async (data, catId) => {
                const result = await handleSingleAiAnalyze(data, catId, editPhotoId);
                if (result) {
                  const updates: Partial<any> = {};
                  if (result.name && !formState.name) updates.name = result.name;
                  
                  if (result.categoryId && !catId && !formState.categoryId) {
                    updates.categoryId = result.categoryId;
                  } else if (result.newCategoryName && !catId && !formState.categoryId) {
                    const foundCat = dbCategories.find(c => c.zh === result.newCategoryName || c.en === result.newCategoryName);
                    if (foundCat) updates.categoryId = foundCat.code;
                  }

                  if (result.tagIds) {
                    updates.tagIds = Array.isArray(result.tagIds) ? result.tagIds : (typeof result.tagIds === 'string' ? [result.tagIds] : []);
                  }
                  if (result.dimensions) {
                    if (Array.isArray(result.dimensions)) {
                       updates.dimensions = result.dimensions;
                       if (result.dimensions.length > 0) {
                          const first = result.dimensions[0];
                          if (first.length && !formState.dimL) updates.dimL = first.length.toString();
                          if (first.width && !formState.dimW) updates.dimW = first.width.toString();
                          if (first.height && !formState.dimH) updates.dimH = first.height.toString();
                       }
                    } else if (typeof result.dimensions === 'object') {
                       if ((result.dimensions as any).length && !formState.dimL) updates.dimL = (result.dimensions as any).length.toString();
                       if ((result.dimensions as any).width && !formState.dimW) updates.dimW = (result.dimensions as any).width.toString();
                       if ((result.dimensions as any).height && !formState.dimH) updates.dimH = (result.dimensions as any).height.toString();
                       updates.dimensions = [result.dimensions];
                    }
                  }

                  if (result.modelNumber && !formState.model_number) {
                    updates.model_number = result.modelNumber;
                  }
                  
                  updateForm(updates);
                }
              }}
              onDelete={(id) => {
                setConfirmDialog({
                  message: t.confirmDeleteSingle,
                  onConfirm: async () => {
                    await deletePhoto(id);
                    resetAddState();
                  }
                });
              }}
              editPhotoPreview={editPhotoId ? photos.find(p => p.id === editPhotoId)?.image_url || photos.find(p => p.id === editPhotoId)?.uri : null}
              abortAnalysis={abortAnalysis}
              deleteTag={(id) => deleteTag(id, photos, setPhotos)}
          />
      )}
      
      {activeScreen === 'home' && (
        <div className="flex flex-col fixed inset-0 bg-[#FDFAF6] overflow-hidden">
                <AdminHeader 
                    settings={settings}
                    user={user}
                    viewMode={viewMode}
                    setViewMode={(newMode) => {
                      setViewMode(newMode);
                      if (newMode === 'public') navigate('/');
                    }}
                    isBatchAnalyzing={isBatchAnalyzing}
                    batchProgress={batchProgress}
                    activeScreen={activeScreen}
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
                        handleBatchAiIdentify(gridPhotos, dbCategories, cancelBatchAiRef);
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
                       onExit={() => setViewMode('public')}
                       showExit={true}
                       user={user}
                       settings={settings}
                       isAdminMode={true}
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
                       onGroupPhotos={handleGroupPhotos}
                       hideHeader={true}
                       onRefresh={() => refreshCloudData(
                           user, categories, tags, manufacturers, setSettings, setPublicCategories, setPublicTags, setPublicManufacturers, setDbCategories, setCategories, setTags, setManufacturers, setPhotos, setCloudCount, true
                       )}
                       columns={columns}
                       setColumns={setColumns}
                       cloudCount={cloudCount}
                    />
                 </div>
        </div>
      )}
    </>
  );

  return (
    <ErrorBoundary>
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
          isSyncing={isSyncing}
          saveBatchEdit={saveBatchEdit}
          batchEditIds={batchEditIds}
          dbCategories={dbCategories}
          categories={categories}
          appLang={appLang}
          formState={formState}
          updateForm={updateForm}
          batchIsHiddenApplied={batchIsHiddenApplied}
          setBatchIsHiddenApplied={setBatchIsHiddenApplied}
          showOtherFields={showOtherFields}
          setShowOtherFields={setShowOtherFields}
          manufacturers={manufacturers}
          tags={tags}
          quickAddSubCategory={quickAddSubCategory}
          quickAddTag={quickAddTag}
          quickAddManufacturer={quickAddManufacturer}
        />
      )}
      
      {activeGroupId && (
        <GroupDetailScreen
          activeGroupId={activeGroupId}
          setActiveGroupId={setActiveGroupId}
          focusedGroupPhotoId={focusedGroupPhotoId}
          setFocusedGroupPhotoId={setFocusedGroupPhotoId}
          viewMode={viewMode}
          publicPhotos={photos}
          photos={photos}
          setPhotos={setPhotos}
          setPreviewUri={setPreviewUri}
          setAlertDialog={setAlertDialog}
          setConfirmDialog={setConfirmDialog}
          user={user}
          onEditPhoto={(photo) => { setEditPhotoId(photo.id); setActiveGroupId(null); }}
          dbCategories={dbCategories}
          manufacturers={manufacturers}
          appLang={appLang}
          categories={categories}
          tags={tags}
          handleUngroup={handleUngroup}
          onAddPhotoToGroup={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = true;
            input.onchange = (e) => handlePhotoImport(e as any, false, (screen) => {});
            input.click();
          }}
        />
      )}

      {mainContent}

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
          confirmDialog={confirmDialog} setConfirmDialog={setConfirmDialog}
          alertDialog={alertDialog} setAlertDialog={setAlertDialog}
          promptDialog={promptDialog} setPromptDialog={setPromptDialog}
          promptValue={promptValue} setPromptValue={setPromptValue}
      />
    </ErrorBoundary>
  );
}
