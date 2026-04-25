import React, { useState, useEffect, useRef } from 'react';
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
  Globe 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthChange, loginWithGoogle, loadCategoriesFromCloud } from '../services/supabaseService';
import { Modals } from '../components/admin/Modals';
import { ProductGrid } from '../components/admin/ProductGrid';
import { PhotoEditDrawer } from '../components/admin/PhotoEditDrawer';
import { SyncPanel } from '../components/admin/SyncPanel';
import { AdminHeader } from '../components/admin/AdminHeader';
import { SearchAndFilter } from '../components/admin/SearchAndFilter';
import { Photo, Category, Tag, SubCategory } from '../types';
import { initDB, saveData, loadData } from '../utils/indexedDB';
import { useSyncEngine } from '../hooks/useSyncEngine';
import { useAdminPhotos } from '../hooks/useAdminPhotos';
import { useAdminCategory } from '../hooks/useAdminCategory';
import { usePhotoManagement } from '../hooks/usePhotoManagement';

export default function AdminView() {
  const [user, setUser] = useState<any>(null);
  const [activeScreen, setActiveScreen] = useState('home');
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
  
  const { 
    categories, setCategories,
    tags, setTags,
    dbCategories, setDbCategories,
  } = useAdminCategory();
  
  const { 
    photos, setPhotos,
    isBatchAnalyzing, batchProgress,
    handleBatchAiIdentify, handlePhotoImport, deletePhoto
  } = useAdminPhotos(user, '', 'auto', '', categories, setCategories, tags, setTags, setAlertDialog, setIsSyncing);

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
    handleGroupPhotos,
  } = usePhotoManagement(user, photos, setPhotos, categories, tags, dbCategories, setAlertDialog, setIsSyncing, setActiveScreen);

  const filteredPhotos = useMemo(() => {
    return photos.filter(p => true);
  }, [photos, searchQuery, filterCatId, filterSubId, filterTagIds]);
  
  const displayPhotos = filteredPhotos;

  const handleManageClick = () => setActiveScreen('manage');

  if (activeScreen === 'manage') {
    return (
       <SettingsScreen onBack={() => setActiveScreen('home')} settings={settings} />
    );
  }

  if (editPhotoId || newPhotoData) {
     return (
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
     );
  }

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

  const handleShare = async () => {
    if (selectedIds.length === 0) return;
    const selectedPhotos = photos.filter(p => selectedIds.includes(p.id));

    try {
      if (navigator.share) {
        // Prepare files for sharing from base64 data URIs
        const shareFiles = await Promise.all(
          selectedPhotos.map(async (photo, index) => {
            const res = await fetch(photo.uri);
            const blob = await res.blob();
            // Assign a reliable filename with jpg extension since we compressed as image/jpeg
            return new File([blob], `photoX_${new Date().getTime()}_${index + 1}.jpg`, { type: 'image/jpeg' });
          })
        );

        if (navigator.canShare && navigator.canShare({ files: shareFiles })) {
          await navigator.share({
            title: 'photoX 照片分享',
            files: shareFiles
          });
          return; // Exit after successful share
        }
      } 
      
      // Fallback: If share API fails or is not supported (WebView environment)
      setAlertDialog({ title: '提示', message: '環境不支援分享，改為自動下載' });
      selectedPhotos.forEach((photo, index) => {
        // slight delay to prevent popup blockers for multiple downloads
        setTimeout(() => {
          const link = document.createElement('a');
          link.href = photo.uri;
          link.download = `photoX_export_${new Date().getTime()}_${index + 1}.jpg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }, index * 200);
      });

    } catch (err) {
      console.error('Share/Download error:', err);
      // Sometimes user cancelling share throws an error, we ignore it usually. If it fails, fallback to download.
      if (err instanceof Error && err.name !== 'AbortError') {
        setAlertDialog({ title: '提示', message: '分享或下載失敗' });
      }
    }
  };

  const handleLongPressStart = (uri: string) => {
    if (isMultiSelect) return;
    pressTimer.current = setTimeout(() => {
      setPreviewUri(uri);
    }, 300);
  };

  const handleLongPressEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    setPreviewUri(null);
  };

  const deleteSelected = () => {
    const selectedPhotos = photos.filter(p => selectedIds.includes(p.id));
    setConfirmDialog({
      message: `確定要刪除這 ${selectedIds.length} 張照片嗎？`,
      onConfirm: async () => {
        setPhotos(prev => prev.filter(p => !selectedIds.includes(p.id)));
        setSelectedIds([]);
        setIsMultiSelect(false);
        if (user) {
          for (const photo of selectedPhotos) {
            try {
              await deletePhotoFromCloud(user.id, photo);
            } catch (err) {
              console.error("Cloud deletion error:", err);
            }
          }
        }
      }
    });
  };

  return (
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
    </div>
  );


  // --- UI Render Functions (Defined as functions to prevent remounting) ---
  const renderMainHeader = () => (
    <header className="shrink-0 z-50 bg-[#FDFAF6] px-6 py-4 flex items-center justify-between gap-4 sticky top-0 pt-safe">
      <div className="flex-1 min-w-0">
        {settings?.logo_url ? (
          <img src={settings.logo_url} alt="Logo" className="h-10 max-w-[180px] object-contain rounded-xl border border-[#1D3557]/10 p-1 bg-white shadow-sm" />
        ) : (
          <h1 className="text-xl font-black tracking-tighter text-[#1D3557] border border-[#1D3557]/10 px-3 py-1 rounded-xl bg-white shadow-sm inline-block italic leading-none">MANAGEMENT</h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        {!user ? (
          <button 
            onClick={async () => {
              try {
                await loginWithGoogle();
              } catch(e: any) {
                alert('登入失敗: ' + (e.message || JSON.stringify(e)));
              }
            }}
            className="px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-[#1D3557] text-[#FDFAF6] shadow-sm active:scale-95 transition-all flex items-center gap-2"
          >
            <LogIn size={14} />
            LOGIN
          </button>
        ) : (
          <div className="flex items-center gap-1.5 bg-[#1D3557]/5 p-1 rounded-2xl border border-[#1D3557]/10">
            <button 
              onClick={() => setViewMode(viewMode === 'public' ? 'private' : 'public')}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${viewMode === 'public' ? 'bg-[#D4A853] text-white shadow-md' : 'text-[#1D3557]/40 hover:text-[#1D3557]'}`}
              title="切換公開頁面"
            >
              <Globe size={18} />
            </button>

            {viewMode === 'private' && (
              <>
                <button 
                  onClick={handleBatchAiIdentifyTrigger}
                  disabled={isBatchAnalyzing}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isBatchAnalyzing ? 'bg-[#1D3557] text-white' : 'text-purple-600/50 hover:text-purple-600'}`}
                  title="AI 批量辨識"
                >
                  {isBatchAnalyzing ? (
                    <span className="animate-pulse text-[9px] font-bold">{batchProgress.current}</span>
                  ) : (
                    <Sparkles size={18} />
                  )}
                </button>
                
                <button 
                  onClick={() => {
                    if (isMultiSelect) {
                      if (selectedIds.length === filteredPhotos.length) {
                        setSelectedIds([]);
                      } else {
                        setSelectedIds(filteredPhotos.map(p => p.id));
                      }
                    } else {
                      setIsMultiSelect(true);
                    }
                  }}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${isMultiSelect ? 'bg-[#1D3557] text-white shadow-md' : 'text-[#1D3557]/40 hover:text-[#1D3557]'}`}
                  title="多選模式"
                >
                  <CheckSquare size={18} />
                </button>

                <button 
                  onClick={handleManageClick}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${activeScreen === 'manage' ? 'bg-[#1D3557] text-white shadow-md' : 'text-[#1D3557]/40 hover:text-[#1D3557]'}`}
                  title="設定與管理"
                >
                  <Settings2 size={18} />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );

  const renderFloatingActionButton = () => (
    viewMode === 'private' && (
      <label className="fixed bottom-8 right-8 w-14 h-14 bg-[#1D3557] text-white rounded-[28px] flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all z-[100] cursor-pointer border border-white/20">
        <Plus size={28} />
        <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoImportTrigger} />
      </label>
    )
  );

  const renderSearchAndFilter = () => (
    <div className="bg-[#FDFAF6] border-b border-[#1D3557]/5 px-6 py-4 space-y-3 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1D3557]/30 transition-colors" size={14} />
          <input 
            type="text" 
            placeholder="搜尋產品..."
            className="w-full bg-white/60 border border-[#1D3557]/10 rounded-2xl py-2.5 pl-10 pr-4 text-xs focus:bg-white transition-all outline-none text-[#1D3557] placeholder-[#1D3557]/30 shadow-inner"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1D3557]/30 hover:text-[#1D3557]/60 p-1">
              <X size={14} />
            </button>
          )}
        </div>
        <button 
          onClick={() => setDisplayMode(displayMode === 'grid' ? 'list' : 'grid')}
          className="w-10 h-10 rounded-2xl border transition-all flex items-center justify-center bg-white border-[#1D3557]/10 text-[#1D3557]/40 hover:text-[#1D3557] shadow-sm active:scale-95"
          title={displayMode === 'grid' ? "切換至大圖" : "切換至網格"}
        >
          {displayMode === 'grid' ? <LayoutGrid size={18} /> : <Grid3X3 size={18} />}
        </button>
        <button 
          onClick={() => setShowGroupsCollapsed(!showGroupsCollapsed)}
          className={`w-10 h-10 rounded-2xl border transition-all flex items-center justify-center shadow-sm active:scale-95 ${showGroupsCollapsed ? 'bg-[#1D3557] border-[#1D3557] text-white' : 'bg-white border-[#1D3557]/10 text-[#1D3557]/50 hover:text-[#1D3557]'}`}
          title={showGroupsCollapsed ? "展开群组" : "合併群組"}
        >
          <Layers size={18} />
        </button>
      </div>

      {/* Directory Row 1: Main Categories */}
      <div className="grid grid-cols-4 gap-2">
        <button 
          onClick={() => { setFilterCatId(null); setFilterSubId(null); }}
          className={`w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all shadow-sm border truncate px-1 ${!filterCatId ? 'bg-[#1D3557] border-[#1D3557] text-[#FDFAF6]' : 'bg-white border-[#1D3557]/10 text-[#1D3557]/60'}`}
        >
          全部产品
        </button>
        {dbCategories.map(cat => (
          <button 
            key={cat.code}
            onClick={() => { setFilterCatId(cat.code); setFilterSubId(null); }}
            className={`w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all shadow-sm border truncate px-1 ${filterCatId === cat.code ? 'bg-[#1D3557] border-[#1D3557] text-[#FDFAF6]' : 'bg-white border-[#1D3557]/10 text-[#1D3557]/60'}`}
          >
            {cat[appLang] || cat.zh}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {(filterCatId || tags.length > 0) && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            {/* Directory Row 2: Sub-categories (Conditional) */}
            {filterCatId && (
              <div className="flex overflow-x-auto pb-1 gap-1.5 no-scrollbar">
                <button 
                  onClick={() => setFilterSubId(null)}
                  className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest whitespace-nowrap border transition-all ${!filterSubId ? 'bg-[#D4A853] border-[#D4A853] text-white shadow-md' : 'bg-white/50 border-[#1D3557]/5 text-[#1D3557]/40 font-medium'}`}
                >
                  ALL
                </button>
                {(() => {
                  const legacyMatchedCat = categories.find(c => c.name === dbCategories.find(dc => dc.code === filterCatId)?.zh || c.id === filterCatId);
                  return legacyMatchedCat?.subcategories.map(sub => (
                    <button 
                      key={sub.id}
                      onClick={() => setFilterSubId(sub.id)}
                      className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest whitespace-nowrap border transition-all ${filterSubId === sub.id ? 'bg-[#D4A853] border-[#D4A853] text-white shadow-md' : 'bg-white/50 border-[#1D3557]/5 text-[#1D3557]/40 font-medium hover:text-[#1D3557]/60'}`}
                    >
                      {sub.name}
                    </button>
                  ));
                })()}
              </div>
            )}
            
            <div className="flex overflow-x-auto pb-1 gap-2 no-scrollbar scroll-smooth px-1">
              {tags.map(tag => (
                <button 
                  key={tag.id}
                  onClick={() => setFilterTagIds(prev => prev.includes(tag.id) ? prev.filter(t => t !== tag.id) : [...prev, tag.id])}
                  className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border shadow-sm ${filterTagIds.includes(tag.id) ? 'bg-[#1D3557] border-[#1D3557] text-[#FDFAF6]' : 'bg-white/40 border-[#1D3557]/10 text-[#1D3557]/40 hover:bg-white'}`}
                >
                  #{tag.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderHomeView = () => (
    <div className="flex flex-col min-h-screen bg-transparent pb-32">
      {renderMainHeader()}
      {renderSearchAndFilter()}
      
      <div className="px-6 py-2">
        <div className={`grid gap-3 ${displayMode === 'grid' ? 'grid-cols-3' : 'grid-cols-1'}`}>
          {displayPhotos.map((photo) => {
            const groupPhotos = photo.groupId ? photos.filter(p => p.groupId === photo.groupId) : [];
            const isGroupMaster = photo.groupId && showGroupsCollapsed;
            const groupCount = groupPhotos.length;
            const isGroupSelected = isGroupMaster ? groupPhotos.every(p => selectedIds.includes(p.id)) : selectedIds.includes(photo.id);

            return (
              <PhotoCard 
                key={photo.id}
                photo={photo}
                isMultiSelect={isMultiSelect}
                isSelected={isGroupSelected}
                isGroupMaster={isGroupMaster}
                groupCount={groupCount}
                categoryName={(() => {
                  const code = photo.category;
                  const dbCat = dbCategories.find(c => c.code === code);
                  if (dbCat) {
                    const name = dbCat[appLang] || dbCat.zh;
                    const isUncat = (n: string) => ['未分类', '未分類', 'uncategorized', 'others'].includes(n.toLowerCase());
                    return isUncat(name) ? undefined : name;
                  }
                  const legacyCat = categories.find(c => c.id === photo.categoryId);
                  const legacyName = legacyCat?.name;
                  const isUncategorized = (n: string) => 
                    ['未分类', '未分類', 'uncategorized', 'Uncategorized', 'others', 'Others'].includes(n.toLowerCase());
                  
                  if (legacyName && !isUncategorized(legacyName)) return legacyName;
                  if (code && !isUncategorized(code)) return code;
                  return undefined;
                })()}
                onClick={() => {
                  if (isMultiSelect) {
                    if (isGroupMaster) {
                      const gIds = groupPhotos.map(p => p.id);
                      if (isGroupSelected) {
                        const next = selectedIds.filter(id => !gIds.includes(id));
                        setSelectedIds(next);
                        if (next.length === 0) setIsMultiSelect(false);
                      } else {
                        setSelectedIds(prev => [...new Set([...prev, ...gIds])]);
                      }
                    } else {
                      togglePhotoSelection(photo.id);
                    }
                  } else {
                    if (isGroupMaster) {
                      setActiveGroupId(photo.groupId!);
                    } else {
                      setPreviewUri(photo.uri);
                    }
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (viewMode === 'public' || !user) return;
                  setEditPhotoId(photo.id);
                  setAddCatId(photo.categoryId);
                  setAddSubId(photo.subcategoryId);
                  setAddTagIds(photo.tagIds || []);
                  setAddNote(photo.description || '');
                  setAddName(photo.name || '');
                  setAddManualCode(photo.manual_code || '');
                  setAddDimL(photo.dimensions?.length?.toString() || '');
                  setAddDimW(photo.dimensions?.width?.toString() || '');
                  setAddDimH(photo.dimensions?.height?.toString() || '');
                  setNewPhotoData(photo.uri);
                }}
              />
            );
          })}
        </div>
        
        {displayPhotos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-16 h-16 bg-white/40 rounded-full flex items-center justify-center mb-4 border border-white/50 shadow-sm">
              <ImageIcon size={32} className="opacity-40" />
            </div>
            <p className="text-xs font-medium">找不到符合條件的照片</p>
          </div>
        )}
      <AnimatePresence>
        {isMultiSelect && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-10 left-10 right-10 z-40 bg-white/80 backdrop-blur-xl rounded-[32px] p-4 flex flex-col gap-3 shadow-2xl border border-white/50"
          >
            <div className="flex justify-between items-center px-2">
              <span className={`text-xs font-bold transition-colors ${selectedIds.length > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                {selectedIds.length > 0 ? `已選取 ${selectedIds.length} 張` : `選取照片`}
              </span>
              <button 
                onClick={() => { setIsMultiSelect(false); setSelectedIds([]); }}
                className="text-[10px] text-slate-400 font-medium hover:text-slate-600"
              >
                結束選擇
              </button>
            </div>
            <div className="flex gap-4 items-center justify-center">
                <button 
                  disabled={selectedIds.length === 0}
                  onClick={() => {
                    setBatchEditIds(selectedIds);
                    setAddCatId(null);
                    setAddSubId(null);
                    setAddTagIds([]);
                  }}
                  className="flex flex-col items-center group disabled:opacity-30 disabled:pointer-events-none"
                >
                   <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm group-active:scale-90 transition-transform">
                     <Settings2 size={20} />
                   </div>
                   <span className="text-[9px] mt-1 text-indigo-600 font-bold">批量分類</span>
                </button>
                <button 
                  disabled={selectedIds.length === 0}
                  onClick={handleShare}
                  className="flex flex-col items-center group disabled:opacity-30 disabled:pointer-events-none"
                >
                   <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shadow-sm group-active:scale-90 transition-transform">
                     <Share2 size={18} />
                   </div>
                   <span className="text-[9px] mt-1 text-blue-600 font-bold">分享</span>
                </button>

                <button 
                  disabled={selectedIds.length < 2}
                  onClick={handleGroupPhotos}
                  className="flex flex-col items-center group disabled:opacity-30 disabled:pointer-events-none"
                >
                   <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 shadow-sm group-active:scale-90 transition-transform">
                     <Layers size={18} />
                   </div>
                   <span className="text-[9px] mt-1 text-purple-600 font-bold">設為同組</span>
                </button>

                {selectedIds.length > 0 && (
                  <button 
                    onClick={deleteSelected}
                    className="flex flex-col items-center group text-red-500"
                  >
                     <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center shadow-sm group-active:scale-90 transition-transform">
                       <Trash2 size={18} />
                     </div>
                     <span className="text-[9px] mt-1 font-bold">刪除</span>
                  </button>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );

  const renderBatchEditScreen = () => (
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col pt-safe">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm">
        <button onClick={resetAddState} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 transition-colors rounded-full active:bg-slate-100">
          <X size={24} />
        </button>
        <h2 className="font-bold text-lg text-slate-800 ml-1 tracking-tight">批量修改 ({batchEditIds?.length})</h2>
        <button 
          onClick={() => {
            saveBatchEdit();
          }}
          className={`bg-blue-600 text-white px-6 py-2.5 rounded-2xl text-xs font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-[0.95] flex items-center gap-2 ${isSyncing ? 'opacity-50 pointer-events-none' : ''}`}
        >
          {isSyncing ? <RefreshCcw size={14} className="animate-spin" /> : null}
          套用修改
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-32">
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-3xl">
          <p className="text-[11px] text-blue-700 font-medium leading-relaxed flex items-start gap-2">
            <span className="shrink-0 w-1.5 h-1.5 bg-blue-500 rounded-full mt-1"></span>
            注意：這會更新所有選中照片。僅手動修改的欄位會被套用至所有選取項目。
          </p>
        </div>

        <section className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">目標主分類 *</h3>
          <div className="grid grid-cols-2 gap-3">
            {dbCategories.map(cat => (
              <button 
                key={cat.code}
                onClick={() => { setAddCatId(cat.code); setAddSubId(null); }}
                className={`p-4 rounded-3xl border-2 text-left transition-all active:scale-[0.98] ${addCatId === cat.code ? 'bg-white border-blue-600 text-blue-600 shadow-xl shadow-blue-600/5' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}
              >
                <span className="font-bold block text-sm tracking-tight">{cat[appLang] || cat.zh}</span>
                <span className="text-[9px] uppercase tracking-wider opacity-60 font-mono">{cat.en}</span>
              </button>
            ))}
          </div>
        </section>

        <AnimatePresence mode="wait">
          {addCatId && (
            <motion.section 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between pl-1">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">目標子分類</h3>
                <button onClick={quickAddSubCategory} className="text-[10px] text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-full active:scale-95 transition-transform">+ 新增</button>
              </div>
              <div className="flex flex-wrap gap-2 p-1">
                {categories.find(c => c.id === addCatId)?.subcategories.map(sub => (
                  <button 
                    key={sub.id}
                    onClick={() => setAddSubId(sub.id)}
                    className={`px-5 py-2.5 rounded-full border text-xs font-bold transition-all active:scale-[0.97] ${addSubId === sub.id ? 'bg-slate-800 border-slate-800 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600 shadow-sm'}`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <section className="space-y-4">
          <div className="flex items-center justify-between pl-1">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">統一風格標籤</h3>
            <button onClick={quickAddTag} className="text-[10px] text-purple-600 font-bold bg-purple-50 px-3 py-1 rounded-full active:scale-95 transition-transform">+ 新增</button>
          </div>
          <div className="flex flex-wrap gap-2 p-1">
            {tags.map(tag => (
              <button 
                key={tag.id}
                onClick={() => setAddTagIds(prev => prev.includes(tag.id) ? prev.filter(tid => tid !== tag.id) : [...prev, tag.id])}
                className={`px-4 py-2 rounded-full border text-xs font-bold transition-all active:scale-[0.97] ${addTagIds.includes(tag.id) ? 'bg-purple-500 border-purple-500 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600 shadow-sm'}`}
              >
                #{tag.name}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">統一產品備註</h3>
            <textarea 
              placeholder="輸入統一修改的備註內容..."
              className="w-full bg-slate-100/50 border border-slate-200 p-5 rounded-3xl text-sm outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner font-medium min-h-[100px]"
              value={addNote}
              onChange={(e) => setAddNote(e.target.value)}
            />
        </section>

        <section className="space-y-4">
          <button 
            onClick={() => setShowOtherFields(!showOtherFields)}
            className="w-full flex items-center justify-between p-5 bg-white border border-slate-200 rounded-3xl text-sm font-bold text-slate-800 shadow-sm active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className={`p-1 rounded-full bg-slate-100 text-slate-500 transition-transform duration-300 ${showOtherFields ? 'rotate-90' : ''}`}>
                <ChevronRight size={16} />
              </div>
              <span>其他詳細資訊 (編號、尺寸)</span>
            </div>
            <div className="w-2 h-2 rounded-full bg-slate-200"></div>
          </button>

          <AnimatePresence>
            {showOtherFields && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-4 pt-2"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">統一產品編號</label>
                  <input 
                    type="text" 
                    placeholder="輸入編號 (例如: SK-2024)..."
                    value={addManualCode}
                    onChange={(e) => setAddManualCode(e.target.value)}
                    className="w-full bg-slate-100/50 border border-slate-200 p-4 rounded-3xl text-sm outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner font-medium"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">統一尺寸 (長 x 寬 x 高) cm</label>
                  <div className="grid grid-cols-3 gap-3">
                    <input 
                      type="number"
                      placeholder="長"
                      value={addDimL}
                      onChange={(e) => setAddDimL(e.target.value)}
                      className="w-full bg-slate-100/50 border border-slate-200 p-3.5 rounded-2xl text-center text-sm font-bold shadow-inner outline-none focus:bg-white focus:border-blue-500"
                    />
                    <input 
                      type="number"
                      placeholder="寬"
                      value={addDimW}
                      onChange={(e) => setAddDimW(e.target.value)}
                      className="w-full bg-slate-100/50 border border-slate-200 p-3.5 rounded-2xl text-center text-sm font-bold shadow-inner outline-none focus:bg-white focus:border-blue-500"
                    />
                    <input 
                      type="number"
                      placeholder="高"
                      value={addDimH}
                      onChange={(e) => setAddDimH(e.target.value)}
                      className="w-full bg-slate-100/50 border border-slate-200 p-3.5 rounded-2xl text-center text-sm font-bold shadow-inner outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );

  const renderAddPhotoScreen = () => (
    <UploadForm
      onClose={() => { resetAddState(); setActiveScreen('home'); }}
      editPhotoId={editPhotoId}
      newPhotoData={newPhotoData}
      isAnalyzing={isAnalyzing}
      handleSingleAiAnalyze={handleSingleAiAnalyze}
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
  );

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

  const handleDelete = (id: string, photo: Photo) => {
    setConfirmDialog({
      message: '確定要刪除這張照片嗎？',
      onConfirm: async () => {
        await deletePhotoFromHook(id, photo);
        if (editPhotoId === id) {
          resetAddState();
          setActiveScreen('home');
        }
      }
    });
  };

  const handleSingleAiAnalyze = async () => {
    if (!newPhotoData) return;
    
    // Check key
    const effectiveKey = geminiApiKey;
    if (!effectiveKey) {
      setAlertDialog({ title: '需要 API 金鑰', message: '請先在設定中設定相容的 API 金鑰 (Gemini, Groq, OpenRouter 或 GitHub Models)。' });
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeProductPhoto(newPhotoData, categories, tags, effectiveKey, aiProvider, customModel);
      
      if (result.name) setAddName(result.name);
      if (result.categoryId) setAddCatId(result.categoryId);
      if (result.subcategoryId) setAddSubId(result.subcategoryId);
      
      if (result.newCategoryName) {
        const catName = result.newCategoryName.trim();
        const existingCat = categories.find(c => c.name === catName);
        if (existingCat) {
          setAddCatId(existingCat.id);
        } else {
          const newId = crypto.randomUUID();
          const newCat: Category = {
            id: newId,
            name: catName,
            aliases: [catName],
            subcategories: []
          };
          const updatedCats = [...categories, newCat];
          setCategories(updatedCats);
          setAddCatId(newId);
          
          if (user) {
            saveSettings({
              ...settings,
              categories: updatedCats,
              tags,
              manufacturers
            });
          }
        }
      }

      if (result.tagIds) setAddTagIds(result.tagIds);
      if (result.newTagName) {
        const newNames = result.newTagName.split(',').map((s: string) => s.trim()).filter(Boolean);
        const newTagsToAdd: Tag[] = [];
        const newTagIds: string[] = [];
        
        newNames.forEach((name: string) => {
          const id = crypto.randomUUID();
          newTagsToAdd.push({ id, name, aliases: [] });
          newTagIds.push(id);
        });
        
        if (newTagsToAdd.length > 0) {
          const updatedTags = [...tags, ...newTagsToAdd];
          setTags(updatedTags);
          setAddTagIds(prev => Array.from(new Set([...prev, ...newTagIds])));
          
          if (user) {
            saveSettings({
              ...settings,
              categories,
              tags: updatedTags,
              manufacturers
            });
          }
        }
      }
      
      // Auto-set additional fields if they are empty
      if (result.dimensions) {
        if (!addDimL) setAddDimL(String(result.dimensions.length || ''));
        if (!addDimW) setAddDimW(String(result.dimensions.width || ''));
        if (!addDimH) setAddDimH(String(result.dimensions.height || ''));
      }
      
    } catch (err: any) {
      console.error("AI error:", err);
      setAlertDialog({ title: '辨識失敗', message: err.message || '無法辨識此照片' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const deleteTag = (id: string) => {
    setConfirmDialog({
      message: '確定要刪除此標籤嗎？',
      onConfirm: () => {
        setTags(prev => prev.filter(t => t.id !== id));
        setPhotos(prev => prev.map(p => ({
          ...p,
          tagIds: (p.tagIds || []).filter(tid => tid !== id)
        })));
      }
    });
  };

  const renderManageScreen = () => {
    return renderSettingsScreen();
  };

  const triggerManualSync = async () => {
    if (!user) return;
    setIsSyncing(true);
    setSyncPercent(0);
    try {
      await syncPhotosToCloud(user.id, photos, (p) => setSyncPercent(Math.round(p)));
      
      // Sync master settings as well during manual sync
      await saveSettings({
        ...settings,
        categories: categories,
        tags: tags,
        manufacturers: manufacturers
      });

      const cloudPhotos = await loadPhotosFromCloud(user.id);
      if (cloudPhotos) {
        setPhotos(cloudPhotos);
        setCloudCount(cloudPhotos.length);
        await saveData('product_photos', cloudPhotos);
      }
      const now = Date.now();
      setLastSyncTime(now);
      await saveData('last_sync_time', now);
      alert('同步成功');
    } catch (e: any) {
      const msg = e?.message || e?.details || JSON.stringify(e);
      alert('同步失敗: ' + msg);
    } finally {
      setIsSyncing(false);
      setSyncPercent(0);
    }
  };

  const performPushSync = async () => {
    if (!user) return;
    setConfirmDialog({
      message: "警告：上傳備份將會以『目前本地資料』完整覆蓋雲端數據。如果雲端存有本地目前已刪除的照片，雲端上的對應記錄也將被移除。此操作不可逆，您確定要開始備份嗎？",
      onConfirm: async () => {
        setIsSyncing(true);
        setSyncAction('push');
        setSyncPercent(0);
        try {
          await syncPhotosToCloud(user.id, photos, (p) => setSyncPercent(Math.round(p)));
          
          // CRITICAL: Also sync master settings (Categories, Tags, Manufacturers)
          await saveSettings({
            ...settings,
            categories: categories,
            tags: tags,
            manufacturers: manufacturers
          });

          // NEW: Performing deduplication per user as requested
          console.log("Running deduplication...");
          const { deduplicatePhotos } = await import('../services/supabaseService');
          const dedupResult = await deduplicatePhotos(user.id);
          if (dedupResult.removed > 0) {
            console.log(`Deduplication removed ${dedupResult.removed} duplicate records for user.`);
          }

          // Fetch updated photos from cloud to get proper image URLs
          const cloudPhotos = await loadPhotosFromCloud(user.id);
          if (cloudPhotos) {
            setPhotos(cloudPhotos);
            setCloudCount(cloudPhotos.length);
            await saveData('product_photos', cloudPhotos);
          }
          
          const now = Date.now();
          setLastSyncTime(now);
          await saveData('last_sync_time', now);
          alert('備份成功');
        } catch (e: any) {
          console.error(e);
          const msg = e?.message || e?.details || JSON.stringify(e);
          alert('同步發生錯誤: ' + msg);
        } finally {
          setIsSyncing(false);
          setSyncAction('idle');
          setSyncPercent(0);
        }
      }
    });
  };

  const performPullSync = async () => {
    if (!user) return;
    setConfirmDialog({
      message: "警告：從雲端下載將會覆蓋您設備上目前的所有資料。如果您近期在本機有新增或刪除相片且「尚未上傳備份」，這些變更將因覆蓋而遺失。您確定要繼續下載雲端資料嗎？",
      onConfirm: async () => {
        setIsSyncing(true);
        setSyncAction('pull');
        setSyncPercent(0);
        try {
          const cloudPhotos = await loadPhotosFromCloud(user.id);
          const cloudSettings = await fetchSettings();
          
          if (cloudPhotos) {
            setPhotos(cloudPhotos);
            setCloudCount(cloudPhotos.length);
            await saveData('product_photos', cloudPhotos);
          }

          if (cloudSettings) {
            setSettings(cloudSettings);
            // Overwrite categories, tags, and manufacturers from cloud
            setCategories(cloudSettings.categories || []);
            await saveData('product_categories', cloudSettings.categories || []);
            
            setTags(cloudSettings.tags || []);
            await saveData('product_tags', cloudSettings.tags || []);
            
            setManufacturers(cloudSettings.manufacturers || []);
            await saveData('product_manufacturers', cloudSettings.manufacturers || []);
          }
          
          const now = Date.now();
          setLastSyncTime(now);
          await saveData('last_sync_time', now);
          
          alert('下載並同步成功');
        } catch (e: any) {
          console.error(e);
          const msg = e?.message || e?.details || JSON.stringify(e);
          alert(`下載失敗: ${msg}`);
        } finally {
          setIsSyncing(false);
          setSyncAction('idle');
          setSyncPercent(0);
        }
      }
    });
  };

  const handleSetTags = (val: React.SetStateAction<Tag[]>) => {
    setTags(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      saveData('product_tags', next);
      return next;
    });
  };

  const handleSetCategories = (val: React.SetStateAction<Category[]>) => {
    setCategories(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      saveData('product_categories', next);
      return next;
    });
  };

  const handleSetManufacturers = (val: React.SetStateAction<SubCategory[]>) => {
    setManufacturers(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      saveData('product_manufacturers', next);
      return next;
    });
  };

  const renderSettingsScreen = () => {
    return (
      <SettingsScreen 
        activeScreen={activeScreen}
        setActiveScreen={setActiveScreen}
        settings={settings}
        setSettings={setSettings}
        saveSettings={saveSettings}
        manufacturers={manufacturers}
        setManufacturers={handleSetManufacturers}
        tags={tags}
        setTags={handleSetTags}
        user={user}
        loginWithGoogle={loginWithGoogle}
        logout={logout}
        triggerManualSync={triggerManualSync}
        isSyncing={isSyncing}
        syncPercent={syncPercent}
        handleLogoUpload={handleLogoUpload}
        setCategories={handleSetCategories}
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
    );
  };

  const handleEditGroupPhoto = (focusedPhoto: Photo) => {
    setEditPhotoId(focusedPhoto.id);
    setAddCatId(focusedPhoto.categoryId);
    setAddSubId(focusedPhoto.subcategoryId);
    setAddTagIds(focusedPhoto.tagIds);
    setAddNote(focusedPhoto.description || '');
    setAddManualCode(focusedPhoto.manual_code || '');
    setAddDimL(focusedPhoto.dimensions?.length?.toString() || '');
    setAddDimW(focusedPhoto.dimensions?.width?.toString() || '');
    setAddDimH(focusedPhoto.dimensions?.height?.toString() || '');
    setNewPhotoData(focusedPhoto.uri);
    setActiveScreen('add');
  };

  const handleAddPhotoToGroup = () => {
    setActiveGroupId(null);
    setFocusedGroupPhotoId(null);
    setIsMultiSelect(true);
    setAlertDialog({ title: '提示', message: '請從主畫面選取照片' });
  };

  const renderGroupDetailScreen = () => (
    <GroupDetailScreen
      activeGroupId={activeGroupId!}
      setActiveGroupId={setActiveGroupId}
      focusedGroupPhotoId={focusedGroupPhotoId}
      setFocusedGroupPhotoId={setFocusedGroupPhotoId}
      viewMode={viewMode}
      publicPhotos={publicPhotos}
      photos={photos}
      setPhotos={setPhotos}
      setPreviewUri={setPreviewUri}
      setAlertDialog={setAlertDialog}
      setConfirmDialog={setConfirmDialog}
      user={user}
      onEditPhoto={handleEditGroupPhoto}
      dbCategories={dbCategories}
      appLang={appLang}
      categories={categories}
      tags={tags}
      handleUngroup={handleUngroup}
      onAddPhotoToGroup={handleAddPhotoToGroup}
    />
  );
  
  const renderLoginScreen = () => (
    <LoginScreen loginWithGoogle={loginWithGoogle} />
  );

  if (authChecked && !user) {
    return (
       <div className="w-full h-full min-h-screen flex items-center justify-center bg-[#FDFBF7]">
          <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm text-center border border-slate-100">
             <h2 className="text-xl font-black text-slate-800 tracking-tight leading-tight mb-2">管理中心</h2>
             <p className="text-sm text-slate-500 mb-8">請登入您的授權帳戶</p>
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
                onClick={() => navigate('/')}
                className="text-sm text-slate-400 hover:text-slate-600 font-medium"
             >
                返回展示館
             </button>
          </div>
       </div>
    );
  }

  return (
    <div className="w-full h-full min-h-screen bg-transparent p-4 font-sans select-none flex items-center justify-center relative overflow-hidden">
      <div className="frosted-bg">
        <div className="blob-1"></div>
        <div className="blob-2"></div>
      </div>

      <div className="w-full max-w-[420px] h-[85vh] bg-white/40 backdrop-blur-2xl rounded-[48px] border border-white/50 shadow-2xl overflow-hidden flex flex-col relative z-10 animate-in fade-in zoom-in duration-700">
        <div className={`flex-1 relative flex flex-col ${viewMode === 'public' ? 'overflow-hidden' : 'overflow-y-auto no-scrollbar'}`}>
          {isInitializing ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Initializing...</p>
            </div>
          ) : (
            activeScreen === 'home' && (
              viewMode === 'public' ? (
                <PublicGallery 
                  photos={publicPhotos} 
                  categories={publicCategories}
                  tags={publicTags}
                  dbCategories={dbCategories}
                  showExit={!!user} 
                  onExit={() => setViewMode('private')} 
                  internalPassword={internalPassword}
                  onLogin={() => setShowManageAccess(true)}
                  settings={settings}
                  isRefreshing={isRefreshing}
                  onRefresh={() => refreshCloudData(true)}
                />
              ) : (
                renderHomeView()
              )
            )
          )}
        </div>
      </div>

      <AnimatePresence>
        {(activeScreen === 'add' || editPhotoId) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {renderAddPhotoScreen()}
          </motion.div>
        )}
        {batchEditIds && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {renderBatchEditScreen()}
          </motion.div>
        )}
        {activeScreen === 'manage' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {renderManageScreen()}
          </motion.div>
        )}
        {activeScreen === 'settings' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {renderSettingsScreen()}
          </motion.div>
        )}
        {activeGroupId && (
          <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}>
            {renderGroupDetailScreen()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen preview optimized for screenshots */}
      <AnimatePresence>
        {previewUri && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
            onClick={() => setPreviewUri(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full h-full flex items-center justify-center p-0"
            >
              <img 
                src={previewUri} 
                className="max-w-full max-h-full object-contain"
                alt="Fullscreen preview"
              />
              
              {/* Subtle close hint that fades out */}
              <motion.div 
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ delay: 2, duration: 1 }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/30 text-[10px] font-medium tracking-widest uppercase pointer-events-none"
              >
                點擊任意處退出
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Manage Access Dialog */}
      {showManageAccess && (
          <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4">
              <h3 className="font-bold text-lg">登入</h3>
              <div className="relative">
                <input 
                  autoFocus
                  type="password" 
                  placeholder="輸入管理密碼" 
                  className="w-full border p-4 rounded-xl"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (e.currentTarget.value === internalPassword) {
                        setActiveScreen('manage');
                        setShowManageAccess(false);
                      } else {
                        alert('密碼錯誤');
                      }
                    }
                  }}
                />
              </div>
              <button onClick={() => setShowManageAccess(false)} className="w-full text-slate-500">取消</button>
              
              <button 
                onClick={async () => {
                  await loginWithGoogle();
                  setShowManageAccess(false);
                  setActiveScreen('manage');
                }}
                className="w-full text-slate-400 text-sm hover:text-slate-600"
              >
                Google 登入
              </button>
            </div>
          </div>
      )}

      {/* Custom Dialogs */}
      <Modals 
        confirmDialog={confirmDialog} setConfirmDialog={setConfirmDialog}
        alertDialog={alertDialog} setAlertDialog={setAlertDialog}
        promptDialog={promptDialog} setPromptDialog={setPromptDialog}
        promptValue={promptValue} setPromptValue={setPromptValue}
      />
      
      {/* Footer / Mobile Nav could go here if needed */}

      {/* AI Progress Toast / Overlay */}
      <AnimatePresence>
        {isBatchAnalyzing && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-28 left-6 right-6 z-[160] bg-slate-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-3xl shadow-2xl flex items-center gap-4"
          >
            <div className="w-10 h-10 bg-purple-500 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-purple-500/40">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div className="flex-1">
               <div className="flex justify-between items-end mb-1.5">
                  <p className="text-white text-[11px] font-bold">批量 AI 智能辨識中...</p>
                  <p className="text-purple-400 text-[10px] font-black">{batchProgress.current} / {batchProgress.total}</p>
               </div>
               <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                  />
               </div>
            </div>
            
            <button 
              onClick={() => { cancelBatchAiRef.current = true; }}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/20 transition-all shrink-0"
              title="取消辨識"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}


