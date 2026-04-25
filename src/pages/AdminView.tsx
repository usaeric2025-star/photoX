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
  const [appLang, setAppLang] = useState(() => {
    return localStorage.getItem('appLang') || 'zh';
  });
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [focusedGroupPhotoId, setFocusedGroupPhotoId] = useState<string | null>(null);
  const [columns, setColumns] = useState<2 | 3 | 5>(3);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [aiProvider, setAiProvider] = useState('gemini');
  const [customModel, setCustomModel] = useState('gemini-1.5-flash');
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
    if (settings?.lang) {
      setAppLang(settings.lang);
    }
    if (settings?.gemini_api_key) {
      setGeminiApiKey(settings.gemini_api_key);
    }
  }, [settings]);

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
    isAnalyzing, setIsAnalyzing,
    isBatchAnalyzing, batchProgress,
    handleSingleAiAnalyze,
    handleBatchAiIdentify, handlePhotoImport, deletePhoto
  } = useAdminPhotos(user, geminiApiKey, aiProvider, customModel, categories, setCategories, tags, setTags, setAlertDialog, setIsSyncing);

  // Removed automatic cloud sync on user change to favor manual control as requested.

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
      result = result.filter(p => p.tagIds?.some(id => filterTagIds.includes(id)));
    }
    return result;
  }, [photos, searchQuery, filterCatId, filterSubId, filterTagIds]);
  
  const displayPhotos = filteredPhotos.slice(0, visibleCount);
  
  const [internalPassword, setInternalPassword] = useState('');
  const [syncPercent, setSyncPercent] = useState(0);
  const [cloudCount, setCloudCount] = useState(0);
  const [syncAction, setSyncAction] = useState('idle');
  const [showManageAccess, setShowManageAccess] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
                Google 安全登录
              </button>
              <button
                onClick={() => {
                  const pass = prompt('请输入您的本地管理密码:');
                  if (pass === getSafeLocalStorage('internal_password')) {
    try { sessionStorage.setItem('isStaffMode', 'true'); } catch {}
                    window.location.reload();
                  } else if (pass) {
                    alert('密码错误');
                  }
                }}
                className="w-full py-3 bg-white text-slate-700 border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-all mb-4 text-sm"
              >
                使用本地密码登录
              </button>
              <button
                onClick={() => {
    try { sessionStorage.removeItem('isStaffMode'); } catch {}
                  navigate('/');
                }}
                className="text-sm text-slate-400 hover:text-slate-600 font-medium"
              >
                返回展示馆
              </button>
           </div>
        </div>
       </ErrorBoundary>
    );
  }

  const saveSettings = async (s: any) => { 
    setSettings(s); 
    // Save to local storage for persistence across reloads
    await saveData('public_settings', s);
    // Removed automatic cloud save to respect 'no auto-backup' request
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
        title: '推送成功', 
        message: `本地配置与照片已上传至云端。${result.skipped > 0 ? `\n(已跳过 ${result.skipped} 张重复照片)` : ''}` 
      });
    } catch (err: any) {
      setAlertDialog({ title: '推送失败', message: err.message });
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
      setAlertDialog({ title: '获取成功', message: '云端数据已同步至本地' });
    } catch (err: any) {
      setAlertDialog({ title: '获取失败', message: err.message });
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
              quickAddSubCategory={quickAddSubCategory} quickAddTag={quickAddTag} tags={tags}
              newPhotoData={newPhotoData} manufacturers={manufacturers}
              editPhotoPreview={editPhotoId ? photos.find(p => p.id === editPhotoId)?.image_url || photos.find(p => p.id === editPhotoId)?.uri : null}
          />
        </ErrorBoundary>
     );
  }

  const deleteSubCategory = (catId: string, subId: string) => {
    setConfirmDialog({
      message: '确定要删除此子分类吗？',
      onConfirm: async () => {
        const nextCats = categories.map(c => c.id === catId ? {
          ...c,
          subcategories: (c.subcategories || []).filter(s => s.id !== subId)
        } : c);
        setCategories(nextCats);
        setPhotos(prev => prev.map(p => p.subcategoryId === subId ? { ...p, subcategoryId: null } : p));
        await saveSettings({ ...settings, categories: nextCats, tags, manufacturers });
      }
    });
  };

  const deleteTag = (id: string) => {
    setConfirmDialog({
      message: '确定要删除此标签吗？',
      onConfirm: async () => {
        const nextTags = tags.filter(t => t.id !== id);
        setTags(nextTags);
        await saveSettings({ ...settings, categories, tags: nextTags, manufacturers });
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
          manufacturers={manufacturers}
        />
      )}
      
      {activeScreen === 'addPhoto' && (
        <UploadForm
          onClose={() => { resetAddState(); setActiveScreen('home'); }}
          editPhotoId={editPhotoId}
          newPhotoData={newPhotoData}
          isAnalyzing={isAnalyzing}
          handleSingleAiAnalyze={() => handleSingleAiAnalyze(newPhotoData, addCatId || undefined)}
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
          manufacturers={manufacturers}
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

      <div className="flex flex-col fixed inset-0 bg-[#FDFAF6] overflow-hidden">
           <AdminHeader 
              settings={settings}
              user={user}
              viewMode={viewMode}
              setViewMode={setViewMode}
              isBatchAnalyzing={isBatchAnalyzing}
              batchProgress={batchProgress}
              activeScreen={activeScreen}
              isMultiSelect={isMultiSelect}
              selectedIds={selectedIds}
              filteredPhotos={filteredPhotos}
              setSelectedIds={setSelectedIds}
              setIsMultiSelect={setIsMultiSelect}
              handleBatchAiIdentifyTrigger={handleBatchAiIdentify}
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
                    message: `确定要删除这 ${ids.length} 张照片吗？`,
                    onConfirm: async () => {
                      await deletePhoto(ids);
                      setSelectedIds([]);
                    }
                  });
                }}
                onGroupPhotos={(ids) => handleGroupPhotos(ids)}
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
           <Modals 
              confirmDialog={confirmDialog} setConfirmDialog={setConfirmDialog}
              alertDialog={alertDialog} setAlertDialog={setAlertDialog}
              promptDialog={promptDialog} setPromptDialog={setPromptDialog}
              promptValue={promptValue} setPromptValue={setPromptValue}
           />
      </div>
    </ErrorBoundary>
  );
}
