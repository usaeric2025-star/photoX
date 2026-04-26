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
  deletePhotoFromCloud
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
import { SettingsScreen } from '../components/SettingsScreen';
import { UploadForm } from '../components/admin/UploadForm';
import { LoginScreen } from '../components/admin/LoginScreen';
import { GroupDetailScreen } from '../components/admin/GroupDetailScreen';
import { PublicGallery } from '../components/PublicGallery';
import { translations, LanguageCode } from '../lib/translations';

export default function AdminView() {
  const lang = (localStorage.getItem('appLang') as LanguageCode) || 'en';
  const t = translations[lang] || translations['en'];
  const { user, authChecked, loginWithGoogle, logout } = useAuth();
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

  // Handle OAuth Hash Redirect
  useEffect(() => {
    if (window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<any>(null);
  const [alertDialog, setAlertDialog] = useState<any>(null);
  const [promptDialog, setPromptDialog] = useState<any>(null);
  const [promptValue, setPromptValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('grid');
  const [showGroupsCollapsed, setShowGroupsCollapsed] = useState(true);
  const [filterCatId, setFilterCatId] = useState<string | null>(null);
  const [filterSubId, setFilterSubId] = useState<string | null>(null);
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
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
  } = useSyncEngine();

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

  const { 
    categories, setCategories,
    tags, setTags,
    updateTag,
    deleteTag,
    dbCategories, setDbCategories,
    manufacturers, setManufacturers,
    publicCategories, setPublicCategories,
    publicTags, setPublicTags,
    publicManufacturers, setPublicManufacturers
  } = useAdminCategory();
  
  const { 
    photos, setPhotos,
    isAnalyzing, setIsAnalyzing,
    isBatchAnalyzing, batchProgress,
    isImporting, importProgress, importTotal,
    aiDebugInfo, abortAnalysis,
    cloudCount, setCloudCount,
    handleSingleAiAnalyze,
    handleBatchAiIdentify, handlePhotoImport, deletePhoto
  } = useAdminPhotos(user, geminiApiKey, aiProvider, customModel, categories, setCategories, tags, setTags, dbCategories, manufacturers, setManufacturers, setAlertDialog, setIsSyncing);

  // Auto refresh on mount if user exists
  useEffect(() => {
    if (authChecked && (user || getSafeSessionStorage('isStaffMode') === 'true')) {
      refreshCloudData(
        user, categories, tags, manufacturers, setSettings, setPublicCategories, setPublicTags, setPublicManufacturers, setDbCategories, setCategories, setTags, setManufacturers, setPhotos, setCloudCount, false
      );
    }
  }, [authChecked, user]);

  const { 
    newPhotoData, setNewPhotoData,
    editPhotoId, setEditPhotoId,
    batchEditIds, setBatchEditIds,
    addCatId, setAddCatId,
    addSubId, setAddSubId,
    addTagIds, setAddTagIds,
    addNote, setAddNote,
    addName, setAddName,
    addManualCode, setAddManualCode,
    addModelNumber, setAddModelNumber,
    addDimL, setAddDimL,
    addDimW, setAddDimW,
    addDimH, setAddDimH,
    addIsHidden, setAddIsHidden,
    showOtherFields, setShowOtherFields,
    resetAddState,
    saveNewPhoto,
    saveBatchEdit,
  } = usePhotoManagement(user, photos, setPhotos, categories, tags, dbCategories, manufacturers, setAlertDialog, setIsSyncing, setActiveScreen);

  const handleUngroup = (groupId: string) => {
    setPhotos(prev => prev.map(p => p.groupId === groupId ? { ...p, groupId: null } : p));
  };

  const [visibleCount, setVisibleCount] = useState(15);
  const observerTarget = useRef(null);

  const filteredPhotos = useMemo(() => {
    let result = photos;
    if (searchQuery) {
      result = result.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (filterCatId) {
      result = result.filter(p => p.categoryId === filterCatId);
    }
    if (filterSubId) {
      result = result.filter(p => p.subcategoryId === filterSubId);
    }
    if (filterTagIds.length > 0) {
      result = result.filter(p => {
        const rawTagIds = Array.isArray(p.tagIds) ? p.tagIds : (typeof p.tagIds === 'string' ? [p.tagIds] : []);
        return rawTagIds.some(id => filterTagIds.includes(id));
      });
    }
    return result;
  }, [photos, searchQuery, filterCatId, filterSubId, filterTagIds]);
  
  const displayPhotos = filteredPhotos.slice(0, visibleCount);
  
  const [internalPassword, setInternalPassword] = useState('');
  const [syncPercent, setSyncPercent] = useState(0);
  const [syncAction, setSyncAction] = useState('idle');
  const [showManageAccess, setShowManageAccess] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [batchIsHiddenApplied, setBatchIsHiddenApplied] = useState(false);

  const handleGroupPhotos = (ids: string[]) => {
    if (ids.length < 2) return;
    const groupId = `group-${Date.now()}`;
    setPhotos(prev => prev.map(p => ids.includes(p.id) ? { ...p, groupId } : p));
  };

  // Removed automatic cloud loading on user change to favor manual control as requested.

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
            setVisibleCount(prev => prev + 15);
        }
      },
      { threshold: 1 }
    );
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    return () => observer.disconnect();
  }, []);
  
  // Conditionally rendered content (error handling)
  const errorContent = pageError ? (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white p-4 font-bold overflow-auto max-h-[30vh]">
      <div className="flex justify-between">
        <span>Error: {pageError}</span>
        <button onClick={() => setPageError(null)} className="underline">Dismiss</button>
      </div>
    </div>
  ) : null;
  
  console.log('AdminView Debug:', { authChecked, user, isStaffMode: getSafeSessionStorage('isStaffMode') });

  // Early returns
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
           <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm text-center border border-slate-100">
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
      setTimeout(() => {
        saveSettingsCloud({
          ...s,
          categories,
          tags,
          manufacturers
        }).catch(console.error);
      }, 0);
    }
  };

  const performPushSync = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      // 1. First backup settings (categories, tags, etc.)
      await saveSettingsCloud({
        ...settings,
        categories,
        tags,
        manufacturers
      });

      // 2. Then backup photos
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

  const triggerManualSync = performPushSync;

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

  const handleGroupPhotos_Internal = (ids: string[]) => {
    // Hidden internal implementation to avoid conflict
  };

  const quickAddSubCategory = () => {
    if (!addCatId) return;
    setPromptValue('');
    setPromptDialog({
      title: '新增子分类',
      placeholder: '输入新子分类名称',
      onSubmit: async (val: string) => {
        const newSubId = crypto.randomUUID();
        const nextCats = categories.map(c => c.id === addCatId ? {
          ...c,
          subcategories: [...c.subcategories, { id: newSubId, name: val.trim(), aliases: [] }]
        } : c);
        setCategories(nextCats);
        setAddSubId(newSubId);
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
        setAddTagIds(prev => [...prev, newTagId]);
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
        setAddSubId(newMfrId);
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
           triggerManualSync={triggerManualSync}
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
              editPhotoId={editPhotoId} resetAddState={resetAddState} saveNewPhoto={saveNewPhoto} photos={photos} updateTag={updateTag}
              addName={addName} setAddName={setAddName} addCatId={addCatId} setAddCatId={setAddCatId}
              addSubId={addSubId} setAddSubId={setAddSubId} addTagIds={addTagIds} setAddTagIds={setAddTagIds}
              addNote={addNote} setAddNote={setAddNote} 
              addManualCode={addManualCode} setAddManualCode={setAddManualCode}
              addModelNumber={addModelNumber} setAddModelNumber={setAddModelNumber}
              addIsHidden={addIsHidden} setAddIsHidden={setAddIsHidden}
              addDimL={addDimL} setAddDimL={setAddDimL} addDimW={addDimW} setAddDimW={setAddDimW}
              addDimH={addDimH} setAddDimH={setAddDimH} showOtherFields={showOtherFields} setShowOtherFields={setShowOtherFields}
              isSyncing={isSyncing} dbCategories={dbCategories} categories={categories} appLang={appLang}
              quickAddSubCategory={quickAddSubCategory} quickAddTag={quickAddTag} quickAddManufacturer={quickAddManufacturer} tags={tags}
              newPhotoData={newPhotoData} manufacturers={manufacturers}
              aiDebugInfo={aiDebugInfo}
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
                filteredPhotos={filteredPhotos}
                setSelectedIds={setSelectedIds}
                setIsMultiSelect={setIsMultiSelect}
                handleBatchAiIdentifyTrigger={() => {
                  if (isBatchAnalyzing) {
                    cancelBatchAiRef.current = true;
                  } else {
                    cancelBatchAiRef.current = false;
                    let targetPhotos = filteredPhotos;
                    if (selectedIds.length > 0) {
                      targetPhotos = filteredPhotos.filter(p => selectedIds.includes(p.id));
                    }
                    handleBatchAiIdentify(targetPhotos, dbCategories, cancelBatchAiRef);
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
                photosCount={filteredPhotos.length}
                totalPhotosCount={photos.length}
                cloudCount={cloudCount}
                appLang={appLang}
             />
             <div className="flex-1 min-h-0 relative">
               <PublicGallery 
                  photos={photos}
                  categories={categories}
                  tags={tags}
                  dbCategories={dbCategories}
                  onExit={() => setViewMode('public')}
                  showExit={true}
                  user={user}
                  settings={settings}
                  isAdminMode={true}
                  isMultiSelect={isMultiSelect}
                  onToggleMultiSelect={() => {
                    if (isMultiSelect) {
                      setSelectedIds([]);
                      setIsMultiSelect(false);
                    } else {
                      setIsMultiSelect(true);
                    }
                  }}
                  selectedIds={selectedIds}
                  onToggleSelection={(id) => {
                    if (!isMultiSelect) return;
                    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
                  }}
                  onClearSelection={() => setSelectedIds([])}
                  onEditPhoto={setEditPhotoId}
                  onDeletePhotos={(ids) => {
                    setConfirmDialog({
                      message: t.confirmDelete(ids.length),
                      onConfirm: async () => {
                        await deletePhoto(ids);
                        setSelectedIds([]);
                      }
                    });
                  }}
                  onGroupPhotos={(ids) => handleGroupPhotos(ids)}
                  onGroupClick={(groupId) => setActiveGroupId(groupId)}
                  onOpenSettings={handleManageClick}
                  onAddPhoto={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.multiple = true;
                    input.onchange = (e) => handlePhotoImport(e as any, false, setActiveScreen);
                    input.click();
                  }}
                  onRefresh={() => refreshCloudData(
                      user, categories, tags, manufacturers, setSettings, setPublicCategories, setPublicTags, setPublicManufacturers, setDbCategories, setCategories, setTags, setManufacturers, setPhotos, setCloudCount, true
                  )}
                  columns={columns}
                  setColumns={setColumns}
                  cloudCount={cloudCount}
                  hideHeader={true}
               />
             </div>
        </div>
      )}
    </>
  );

  return (
    <ErrorBoundary>
      {errorContent}
      {batchEditIds && (
        <BatchEditScreen 
          resetAddState={() => { resetAddState(); setBatchIsHiddenApplied(false); }}
          isSyncing={isSyncing}
          saveBatchEdit={saveBatchEdit}
          batchEditIds={batchEditIds}
          dbCategories={dbCategories}
          categories={categories}
          appLang={appLang}
          addCatId={addCatId}
          setAddCatId={setAddCatId}
          addSubId={addSubId}
          setAddSubId={setAddSubId}
          quickAddSubCategory={quickAddSubCategory}
          tags={tags}
          quickAddTag={quickAddTag}
          quickAddManufacturer={quickAddManufacturer}
          addTagIds={addTagIds}
          setAddTagIds={setAddTagIds}
          addNote={addNote}
          setAddNote={setAddNote}
          addIsHidden={addIsHidden}
          setAddIsHidden={setAddIsHidden}
          batchIsHiddenApplied={batchIsHiddenApplied}
          setBatchIsHiddenApplied={setBatchIsHiddenApplied}
          showOtherFields={showOtherFields}
          setShowOtherFields={setShowOtherFields}
          addManualCode={addManualCode}
          setAddManualCode={setAddManualCode}
          addModelNumber={addModelNumber}
          setAddModelNumber={setAddModelNumber}
          addDimL={addDimL}
          setAddDimL={setAddDimL}
          addDimW={addDimW}
          setAddDimW={setAddDimW}
          addDimH={addDimH}
          setAddDimH={setAddDimH}
          manufacturers={manufacturers}
        />
      )}
      
      {activeScreen === 'addPhoto' && (
        <UploadForm
          onClose={() => { resetAddState(); setActiveScreen('home'); }}
          editPhotoId={editPhotoId}
          newPhotoData={newPhotoData}
          isAnalyzing={isAnalyzing}
          handleSingleAiAnalyze={async (data, catId) => {
            const result = await handleSingleAiAnalyze(data, catId, editPhotoId);
            if (result) {
              if (result.name && !addName) setAddName(result.name);
              if (result.newCategoryName && !catId && !addCatId) {
                const foundCat = categories.find(c => c.name === result.newCategoryName);
                if (foundCat) setAddCatId(foundCat.id);
              }
              if (result.tagIds) {
                const rawTagIds = Array.isArray(result.tagIds) ? result.tagIds : (typeof result.tagIds === 'string' ? [result.tagIds] : []);
                setAddTagIds(rawTagIds);
              }
              if (result.dimensions) {
                if (result.dimensions.length && !addDimL) setAddDimL(result.dimensions.length.toString());
                if (result.dimensions.width && !addDimW) setAddDimW(result.dimensions.width.toString());
                if (result.dimensions.height && !addDimH) setAddDimH(result.dimensions.height.toString());
              }
              if (result.modelNumber && !addModelNumber) {
                setAddModelNumber(result.modelNumber);
              }
            }
          }}
          deletePhoto={deletePhoto}
          saveNewPhoto={saveNewPhoto}
          isSyncing={isSyncing}
          addName={addName}
          setAddName={setAddName}
          addCatId={addCatId}
          setAddCatId={setAddCatId}
          addSubId={addSubId}
          setAddSubId={setAddSubId}
          addTagIds={addTagIds}
          setAddTagIds={setAddTagIds}
          addNote={addNote}
          setAddNote={setAddNote}
          addManualCode={addManualCode}
          setAddManualCode={setAddManualCode}
          addModelNumber={addModelNumber}
          setAddModelNumber={setAddModelNumber}
          showOtherFields={showOtherFields}
          setShowOtherFields={setShowOtherFields}
          addDimL={addDimL}
          setAddDimL={setAddDimL}
          addDimW={addDimW}
          setAddDimW={setAddDimW}
          addDimH={addDimH}
          setAddDimH={setAddDimH}
          addIsHidden={addIsHidden}
          setAddIsHidden={setAddIsHidden}
          dbCategories={dbCategories}
          appLang={appLang}
          categories={categories}
          tags={tags}
          quickAddSubCategory={quickAddSubCategory}
          quickAddTag={quickAddTag}
          quickAddManufacturer={quickAddManufacturer}
          manufacturers={manufacturers}
          abortAnalysis={abortAnalysis}
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
          setPhotos={setPhotos} // Fix: use setPhotos directly
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
            input.onchange = (e) => handlePhotoImport(e as any, false, (screen) => {
              if (screen === 'addPhoto') {
                // handle manual addition to this specific group
              }
            });
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
