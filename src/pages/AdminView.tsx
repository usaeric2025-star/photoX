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

export default function AdminView() {
  console.log('>>> AdminView Component Executing');
  const { user, authChecked, loginWithGoogle, logout } = useAuth();
  console.log('>>> useAuth completed');
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
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const cancelBatchAiRef = useRef<boolean>(false);
  
  const { 
    isSyncing, setIsSyncing,
    viewMode, setViewMode,
    settings, setSettings,
    lastSyncTime, setLastSyncTime,
    refreshCloudData
  } = useSyncEngine();

  useEffect(() => {
    if ((user || getSafeSessionStorage('isStaffMode') === 'true') && viewMode === 'public') {
      setViewMode('private');
    }
  }, [user, viewMode, setViewMode]);
  
  const { 
    categories, setCategories,
    tags, setTags,
    dbCategories, setDbCategories,
    manufacturers, setManufacturers,
    publicCategories, setPublicCategories,
    publicTags, setPublicTags,
    publicManufacturers, setPublicManufacturers
  } = useAdminCategory();
  
  const { 
    photos, setPhotos,
    isBatchAnalyzing, batchProgress,
    handleBatchAiIdentify, handlePhotoImport, deletePhoto
  } = useAdminPhotos(user, '', 'auto', '', categories, setCategories, tags, setTags, setAlertDialog, setIsSyncing);

  useEffect(() => {
    if (user || getSafeSessionStorage('isStaffMode') === 'true') {
      refreshCloudData(
        user,
        categories,
        tags,
        manufacturers,
        setSettings,
        setPublicCategories,
        setPublicTags,
        setPublicManufacturers,
        setDbCategories,
        setPublicPhotos,
        setCloudCount,
        false
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
    addDimL, setAddDimL,
    addDimW, setAddDimW,
    addDimH, setAddDimH,
    showOtherFields, setShowOtherFields,
    resetAddState,
    saveNewPhoto,
    saveBatchEdit,
  } = usePhotoManagement(user, photos, setPhotos, categories, tags, dbCategories, setAlertDialog, setIsSyncing, setActiveScreen);

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
      result = result.filter(p => p.tagIds?.some(id => filterTagIds.includes(id)));
    }
    return result;
  }, [photos, searchQuery, filterCatId, filterSubId, filterTagIds]);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [aiProvider, setAiProvider] = useState('gemini');
  const [customModel, setCustomModel] = useState('gemini-1.5-flash');
  const [internalPassword, setInternalPassword] = useState('');
  const [syncPercent, setSyncPercent] = useState(0);
  const [cloudCount, setCloudCount] = useState(0);
  const [syncAction, setSyncAction] = useState('idle');
  const [focusedGroupPhotoId, setFocusedGroupPhotoId] = useState<string | null>(null);
  const [publicPhotos, setPublicPhotos] = useState<Photo[]>([]);
  const [showManageAccess, setShowManageAccess] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(15);
  const observerTarget = useRef(null);

  // Re-enable photo loading
  useEffect(() => {
    if (user || getSafeSessionStorage('isStaffMode') === 'true') {
      loadAllPhotosFromCloud().then(setPhotos).catch(console.error);
    }
  }, [user]);

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
              <h2 className="text-xl font-black text-slate-800 tracking-tight leading-tight mb-2">管理中心</h2>
              <p className="text-sm text-slate-500 mb-8">請登入您的授權帳戶，或使用本地驗證</p>
              <button 
                onClick={async () => {
                  try {
                    await loginWithGoogle();
                  } catch(e: any) {
                    alert('登入失敗: ' + (e.message || JSON.stringify(e)));
                  }
                }}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20 active:scale-[0.98] hover:bg-blue-700 transition-all mb-4"
              >
                Google 安全登入
              </button>
              <button
                onClick={() => {
                  const pass = prompt('請輸入您的本地管理密碼:');
                  if (pass === getSafeLocalStorage('internal_password')) {
    try { sessionStorage.setItem('isStaffMode', 'true'); } catch {}
                    window.location.reload();
                  } else if (pass) {
                    alert('密碼錯誤');
                  }
                }}
                className="w-full py-3 bg-white text-slate-700 border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-all mb-4 text-sm"
              >
                使用本地密碼登入
              </button>
              <button
                onClick={() => {
    try { sessionStorage.removeItem('isStaffMode'); } catch {}
                  navigate('/');
                }}
                className="text-sm text-slate-400 hover:text-slate-600 font-medium"
              >
                返回展示館
              </button>
           </div>
        </div>
       </ErrorBoundary>
    );
  }

  const saveSettings = async (s: any) => { setSettings(s); await saveSettingsCloud(s); };
  const handleGroupPhotos = () => {
      // Grouping logic 
      if (selectedIds.length < 2) return;
      const groupId = crypto.randomUUID();
      setPhotos(prev => prev.map(p => selectedIds.includes(p.id) ? { ...p, groupId } : p));
      setSelectedIds([]);
      setIsMultiSelect(false);
  };
  const quickAddSubCategory = () => {
    if (!addCatId) return;
    setPromptValue('');
    setPromptDialog({
      title: '新增子分類',
      placeholder: '輸入新子分類名稱',
      onSubmit: (val) => {
        const newSubId = crypto.randomUUID();
        setCategories(prev => prev.map(c => c.id === addCatId ? {
          ...c,
          subcategories: [...c.subcategories, { id: newSubId, name: val.trim(), aliases: [] }]
        } : c));
        setAddSubId(newSubId);
      }
    });
  };
  const quickAddTag = () => {
    setPromptValue('');
    setPromptDialog({
      title: '自定義標籤',
      placeholder: '輸入新標籤名稱',
      onSubmit: (val) => {
        const newTagId = crypto.randomUUID();
        setTags(prev => [...prev, { id: newTagId, name: val.trim(), aliases: [] }]);
        setAddTagIds(prev => [...prev, newTagId]);
      }
    });
  };

  if (viewMode === 'public') {
    return (
      <ErrorBoundary>
        <div className="w-full h-full min-h-screen">
          <PublicGallery 
            photos={photos} 
            categories={categories}
            tags={tags}
            dbCategories={dbCategories}
            showExit={true}
            onExit={() => setViewMode('private')}
            user={user}
            settings={settings}
            isRefreshing={false}
            onRefresh={() => refreshCloudData(
              user, categories, tags, manufacturers, setSettings, setPublicCategories, setPublicTags, setPublicManufacturers, setDbCategories, setPublicPhotos, setCloudCount, true
            )}
          />
          <div className="fixed bottom-6 right-[88px] z-50">
             <button 
               onClick={() => setViewMode('private')}
               className="bg-[#1D3557] text-[#FDFAF6] px-4 py-3 rounded-full shadow-lg font-black uppercase tracking-widest text-[10px] flex items-center gap-2 active:scale-95 transition-all outline-none"
             >
               <Settings2 size={16} /> 進入管理模式
             </button>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  const handleManageClick = () => setActiveScreen('manage');

  if (activeScreen === 'manage') {
    return (
       <ErrorBoundary>
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
       </ErrorBoundary>
    );
  }

  if (editPhotoId || newPhotoData) {
     return (
        <ErrorBoundary>
          <PhotoEditDrawer 
              editPhotoId={editPhotoId} resetAddState={resetAddState} saveNewPhoto={saveNewPhoto}
              addName={addName} setAddName={setAddName} addCatId={addCatId} setAddCatId={setAddCatId}
              addSubId={addSubId} setAddSubId={setAddSubId} addTagIds={addTagIds} setAddTagIds={setAddTagIds}
              addNote={addNote} setAddNote={setAddNote} addManualCode={addManualCode} setAddManualCode={setAddManualCode}
              addDimL={addDimL} setAddDimL={setAddDimL} addDimW={addDimW} setAddDimW={setAddDimW}
              addDimH={addDimH} setAddDimH={setAddDimH} showOtherFields={showOtherFields} setShowOtherFields={setShowOtherFields}
              isSyncing={isSyncing} dbCategories={dbCategories} categories={categories} appLang={appLang}
              quickAddSubCategory={() => {}} quickAddTag={() => {}} tags={tags}
          />
        </ErrorBoundary>
     );
  }

  const deleteSubCategory = (catId: string, subId: string) => {
    setConfirmDialog({
      message: '確定要刪除此子分類嗎？',
      onConfirm: () => {
        setCategories(prev => prev.map(c => c.id === catId ? {
          ...c,
          subcategories: (c.subcategories || []).filter(s => s.id !== subId)
        } : c));
        setPhotos(prev => prev.map(p => p.subcategoryId === subId ? { ...p, subcategoryId: null } : p));
      }
    });
  };

  const handleSingleAiAnalyze = async () => {
    if (!newPhotoData) return;
    setIsAnalyzing(true);
    try {
      // Logic restored placeholder.
      console.log("Analyzing...");
    } catch (err: any) {
      console.error("AI error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const deleteTag = (id: string) => {
    setConfirmDialog({
      message: '確定要刪除此標籤嗎？',
      onConfirm: () => {
        setTags(prev => prev.filter(t => t.id !== id));
      }
    });
  };

  const handleSetTags = (val: React.SetStateAction<Tag[]>) => { setTags(val); };
  const handleSetCategories = (val: React.SetStateAction<Category[]>) => { setCategories(val); };
  const handleSetManufacturers = (val: React.SetStateAction<SubCategory[]>) => { /* handleSetManufacturers logic */ };
  const handleEditGroupPhoto = (focusedPhoto: Photo) => { /* logic */ };
  const handleAddPhotoToGroup = () => { /* logic */ };

  return (
    <ErrorBoundary>
      {batchEditIds && (
        <BatchEditScreen 
          resetAddState={resetAddState}
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
          addTagIds={addTagIds}
          setAddTagIds={setAddTagIds}
          addNote={addNote}
          setAddNote={setAddNote}
          showOtherFields={showOtherFields}
          setShowOtherFields={setShowOtherFields}
          addManualCode={addManualCode}
          setAddManualCode={setAddManualCode}
          addDimL={addDimL}
          setAddDimL={setAddDimL}
          addDimW={addDimW}
          setAddDimW={setAddDimW}
          addDimH={addDimH}
          setAddDimH={setAddDimH}
        />
      )}
      
      {activeScreen === 'addPhoto' && (
        <UploadForm
          onClose={() => { resetAddState(); setActiveScreen('home'); }}
          editPhotoId={editPhotoId}
          newPhotoData={newPhotoData}
          isAnalyzing={false} // Placeholder, need to fix hook if needed
          handleSingleAiAnalyze={async () => {}} // Placeholder
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
          showOtherFields={showOtherFields}
          setShowOtherFields={setShowOtherFields}
          addDimL={addDimL}
          setAddDimL={setAddDimL}
          addDimW={addDimW}
          setAddDimW={setAddDimW}
          addDimH={addDimH}
          setAddDimH={setAddDimH}
          dbCategories={dbCategories}
          appLang={appLang}
          categories={categories}
          tags={tags}
          quickAddSubCategory={quickAddSubCategory}
          quickAddTag={quickAddTag}
        />
      )}

      <div className="flex flex-col min-h-screen bg-transparent pb-32">
          <AdminHeader 
              settings={settings} user={user} viewMode={viewMode} setViewMode={setViewMode}
              isBatchAnalyzing={isBatchAnalyzing} batchProgress={batchProgress} activeScreen={activeScreen}
              isMultiSelect={isMultiSelect} selectedIds={selectedIds} filteredPhotos={filteredPhotos}
              setSelectedIds={setSelectedIds} setIsMultiSelect={setIsMultiSelect}
              handleBatchAiIdentifyTrigger={() => handleBatchAiIdentify(photos, dbCategories, cancelBatchAiRef)}
              handleManageClick={handleManageClick} loginWithGoogle={loginWithGoogle}
          />
          <SearchAndFilter 
              searchQuery={searchQuery} setSearchQuery={setSearchQuery} displayMode={displayMode} setDisplayMode={setDisplayMode}
              showGroupsCollapsed={showGroupsCollapsed} setShowGroupsCollapsed={setShowGroupsCollapsed}
              filterCatId={filterCatId} setFilterCatId={setFilterCatId} filterSubId={filterSubId} setFilterSubId={setFilterSubId}
              filterTagIds={filterTagIds} setFilterTagIds={setFilterTagIds} dbCategories={dbCategories}
              categories={categories} tags={tags} appLang={appLang}
          />
          <ProductGrid 
              displayMode={displayMode} displayPhotos={displayPhotos} photos={photos}
              selectedIds={selectedIds} showGroupsCollapsed={showGroupsCollapsed} dbCategories={dbCategories}
              appLang={appLang} categories={categories} isMultiSelect={isMultiSelect}
              togglePhotoSelection={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i!==id) : [...prev, id])}
              setIsMultiSelect={setIsMultiSelect} setSelectedIds={setSelectedIds} setActiveGroupId={setActiveGroupId}
              setPreviewUri={setPreviewUri} setEditPhotoId={setEditPhotoId} setAddCatId={setAddCatId}
              setAddSubId={setAddSubId} setAddTagIds={setAddTagIds} setAddNote={setAddNote}
              setAddName={setAddName} setAddManualCode={setAddManualCode} setAddDimL={setAddDimL}
              setAddDimW={setAddDimW} setAddDimH={setAddDimH} setNewPhotoData={setNewPhotoData}
              viewMode={viewMode} user={user} handleShare={() => {}} handleGroupPhotos={handleGroupPhotos}
              deleteSelected={deletePhoto} setBatchEditIds={setBatchEditIds}
          />
          <Modals 
              confirmDialog={confirmDialog} setConfirmDialog={setConfirmDialog}
              alertDialog={alertDialog} setAlertDialog={setAlertDialog}
              promptDialog={promptDialog} setPromptDialog={setPromptDialog}
              promptValue={promptValue} setPromptValue={setPromptValue}
          />
          <div ref={observerTarget} className="h-20" />
      </div>
    </ErrorBoundary>
  );
}
