import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Photo, DB_Category, Category, Tag } from '../types';
import { Search, X, ChevronLeft, ChevronRight, Image as ImageIcon, Lock, Unlock, Key, LayoutGrid, Columns, ArrowUpToLine, MessageCircle, Share2, Layers, Maximize, Grid3X3, RefreshCcw, Settings2, LogIn, Globe, Plus, Trash2, ArrowDown, ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useGallery } from '../hooks/useGallery';
import { translations, LanguageCode } from '../lib/translations';

interface PublicGalleryProps {
  photos: Photo[];
  categories: Category[];
  tags: Tag[];
  dbCategories: DB_Category[];
  onExit?: () => void;
  showExit?: boolean;
  onLogin?: () => void;
  loginWithGoogle?: () => Promise<void>;
  internalPassword?: string;
  settings?: any;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  user?: any;
  isAdminMode?: boolean;
  onEditPhoto?: (id: string) => void;
  onDeletePhotos?: (ids: string[]) => void;
  onGroupPhotos?: (ids: string[]) => void;
  onGroupClick?: (groupId: string) => void;
  onOpenSettings?: () => void;
  onAddPhoto?: () => void;
  selectedIds?: string[];
  onToggleSelection?: (id: string) => void;
  onClearSelection?: () => void;
  isMultiSelect?: boolean;
  onToggleMultiSelect?: () => void;
  columns?: 2 | 3 | 5;
  setColumns?: (val: 2 | 3 | 5) => void;
  cloudCount?: number | null;
  hideHeader?: boolean;
}

export const PublicGallery: React.FC<PublicGalleryProps> = ({ 
  photos, categories, tags, dbCategories, onExit, showExit, onLogin, loginWithGoogle, user, 
  internalPassword, settings, isRefreshing, onRefresh,
  isAdminMode, onEditPhoto, onDeletePhotos, onGroupPhotos, onGroupClick, onOpenSettings, onAddPhoto,
  selectedIds = [], onToggleSelection, onClearSelection,
  isMultiSelect, onToggleMultiSelect,
  columns: propColumns, setColumns: propSetColumns,
  cloudCount,
  hideHeader
}) => {
  const [lang, setLang] = useState<LanguageCode>(() => {
    return (localStorage.getItem('appLang') as LanguageCode) || 'en';
  });
  const t = translations[lang] || translations['en'];
  
  useEffect(() => {
    localStorage.setItem('appLang', lang);
  }, [lang]);
  const navigate = useNavigate();

  const [isStaffMode, setIsStaffMode] = useState(() => {
    return sessionStorage.getItem('isStaffMode') === 'true';
  });
  
  useEffect(() => {
    sessionStorage.setItem('isStaffMode', String(isStaffMode));
  }, [isStaffMode]);
  const [showPassPrompt, setShowPassPrompt] = useState(false);
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState(false);

  const [internalColumns, setInternalColumns] = useState<2 | 3 | 5>(3);
  const columns = propColumns || internalColumns;
  const setColumns = propSetColumns || setInternalColumns;
  const [headerClickCount, setHeaderClickCount] = useState(0);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  const {
    searchQuery, setSearchQuery,
    selectedCatCode, setSelectedCatCode,
    selectedSubId, setSelectedSubId,
    selectedTagIds, setSelectedTagIds,
    showGroupsCollapsed, setShowGroupsCollapsed,
    visibleCount, setVisibleCount,
    lightboxIndex, setLightboxIndex,
    displayPhotos, gridPhotos,
    totalPhotoCount,
    getRealId, observerTarget,
    sortOrder, toggleSortOrder
  } = useGallery({ photos, categories, tags, dbCategories, columns, isAdminMode });

  const activeGroupPhotos = useMemo(() => {
    if (!activeGroupId) return [];
    return photos.filter(p => p.groupId === activeGroupId);
  }, [activeGroupId, photos]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    // Reset visible count to free up DOM nodes when snapping to top
    setVisibleCount(15);
  };

  const handleHeaderClick = () => {
    const next = headerClickCount + 1;
    if (next >= 3) {
        setShowPassPrompt(true);
        setHeaderClickCount(0);
    } else {
        setHeaderClickCount(next);
    }
  }

  const [showWhatsAppChoice, setShowWhatsAppChoice] = useState(false);

  const shareSinglePhoto = async (photo: Photo) => {
    const text = `${photo.name || ''} ${isStaffMode ? '[' + (photo.manual_code || '') + ']' : ''}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: t.shareTitle,
          text: `${t.sharePrompt}\n\n${text}\n\nView more: photo-x-one.vercel.app`,
        });
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.error('Share err:', e);
        }
      }
    }
  };

  const openWhatsApp = (num: string, photo?: Photo) => {
    let msg = '';
    
    const getPhotoDisplayName = (p: Photo) => {
      const isPlaceholder = !p.name || p.name === t.furnitureRecord || p.name === 'Furniture Record' || p.name === '未命名产品' || p.name === translations['zh'].furnitureRecord || p.name === translations['en'].furnitureRecord;
      if (!isPlaceholder) return p.name;
      const safeCat = (p.category || '').trim().toLowerCase();
      const cat = dbCategories.find(c => 
        (c.code || '').trim().toLowerCase() === safeCat || 
        (c.zh || '').trim().toLowerCase() === safeCat || 
        (c.en || '').trim().toLowerCase() === safeCat || 
        (c.ms || '').trim().toLowerCase() === safeCat
      );
      if (cat) return cat[lang as keyof DB_Category] || cat.zh;
      if (lang === 'ms') return translations['ms'].furniture;
      return lang === 'en' ? translations['en'].furniture : translations['zh'].furniture;
    };

    if (photo) {
      const displayName = getPhotoDisplayName(photo);
      const manualCodeStr = photo.manual_code ? ` [${photo.manual_code}]` : '';
      if (lang === 'ms') {
        msg = `Halo, saya berminat dengan perabot ini:\n\n${displayName}${isStaffMode ? manualCodeStr : ''}\n\nFoto: ${photo.image_url}\n\nLihat lagi: photo-x-one.vercel.app`;
      } else if (lang === 'en') {
        msg = `Hello, I'm interested in this furniture:\n\n${displayName}${isStaffMode ? manualCodeStr : ''}\n\nPhoto: ${photo.image_url}\n\nView more: photo-x-one.vercel.app`;
      } else {
        msg = `你好，我对这个家具有兴趣：\n\n${displayName}${isStaffMode ? manualCodeStr : ''}\n\n照片: ${photo.image_url}\n\n查看更多：photo-x-one.vercel.app`;
      }
    } else {
      if (lang === 'ms') {
        msg = `Halo, saya ingin bertanya tentang maklumat perabot.`;
      } else if (lang === 'en') {
        msg = `Hello, I'd like to inquire about furniture information.`;
      } else {
        msg = `你好，我想咨询家具信息。`;
      }
    }
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
    setShowWhatsAppChoice(false);
  };

  const contactWhatsApp = (photo?: Photo) => {
    // Store which photo we are sharing if any
    (window as any)._pendingPhoto = photo;
    setShowWhatsAppChoice(true);
  };
  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null) {
      if (lightboxIndex > 0) {
        setLightboxIndex(lightboxIndex - 1);
      } else {
        setLightboxIndex(displayPhotos.length - 1);
      }
    }
  };
  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null) {
      if (lightboxIndex < displayPhotos.length - 1) {
        setLightboxIndex(lightboxIndex + 1);
      } else {
        setLightboxIndex(0);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (lightboxIndex === null) return;
    if (e.key === 'ArrowLeft') {
      if (lightboxIndex > 0) {
        setLightboxIndex(lightboxIndex - 1);
      } else {
        setLightboxIndex(displayPhotos.length - 1);
      }
    } else if (e.key === 'ArrowRight') {
      if (lightboxIndex < displayPhotos.length - 1) {
        setLightboxIndex(lightboxIndex + 1);
      } else {
        setLightboxIndex(0);
      }
    } else if (e.key === 'Escape') {
      setLightboxIndex(null);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex]); // Added dependencies to avoid unnecessary re-attachment while allowing cleanup

  // Swipe support for Lightbox
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) {
      touchStartX.current = null;
      touchEndX.current = null;
      return;
    }
    const diff = touchStartX.current - touchEndX.current;
    
    // Swipe left (next photo)
    if (diff > 30) {
      if (lightboxIndex !== null) {
        if (lightboxIndex < displayPhotos.length - 1) {
          setLightboxIndex(lightboxIndex + 1);
        } else {
          setLightboxIndex(0);
        }
      }
    } 
    // Swipe right (prev photo)
    else if (diff < -30) {
      if (lightboxIndex !== null) {
        if (lightboxIndex > 0) {
          setLightboxIndex(lightboxIndex - 1);
        } else {
          setLightboxIndex(displayPhotos.length - 1);
        }
      }
    }
    
    // Reset
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const startLongPress = (photoId: string) => {
    if (!isAdminMode) return;
    const timer = setTimeout(() => {
      if (onEditPhoto) onEditPhoto(photoId);
      if ('vibrate' in navigator) navigator.vibrate(50);
      setLongPressTimer(null);
    }, 600) as unknown as NodeJS.Timeout;
    setLongPressTimer(timer);
  };

  const endLongPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg w-full overflow-hidden text-text">
      {/* Header */}
      {lightboxIndex === null && !hideHeader && (
        <header className="shrink-0 z-50 bg-[#FDFAF6] px-3 sm:px-4 py-1.5 flex items-center justify-between gap-1 sm:gap-4 border-b border-[#1D3557]/5">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0" onClick={handleHeaderClick}>
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="h-12 sm:h-14 max-w-[150px] sm:max-w-[220px] object-contain rounded-xl border border-[#1D3557]/10 p-1 bg-white shadow-sm cursor-pointer" />
            ) : (
              <div className="shrink-0 cursor-pointer">
                <h1 className="text-sm sm:text-lg font-black tracking-tighter text-[#1D3557] italic leading-none">GALLERY</h1>
              </div>
            )}
            
            <div className="flex items-center gap-1 bg-[#1D3557]/5 px-2 py-0.5 rounded-full border border-[#1D3557]/10 shrink-0 cursor-pointer" onClick={onRefresh}>
              <span className="text-[8px] sm:text-[9px] font-black text-[#1D3557]/60 italic">
                {t.gallerySub(photos.filter(p => !p.isHidden).length)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {isAdminMode && (
                <div className="flex items-center gap-2 mr-2">
                  <button 
                    onClick={onToggleMultiSelect}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm active:scale-95 border ${isMultiSelect ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}
                    title={t.selectMode}
                  >
                    <Grid3X3 size={20} />
                  </button>
                  <button 
                    onClick={onAddPhoto}
                    className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center transition-all shadow-lg hover:bg-blue-700 active:scale-95"
                    title={t.addPhoto}
                  >
                    <Plus size={20} />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest">
                {[
                  { code: 'zh', label: '中文' },
                  { code: 'en', label: 'EN' },
                  { code: 'ms', label: 'BM' }
                ].map(l => (
                  <button key={l.code} onClick={() => setLang(l.code as any)} className={`${lang === l.code ? 'bg-[#1D3557] text-[#FDFAF6]' : 'bg-[#1D3557]/5 text-[#1D3557]/40'} px-2 sm:px-3 h-10 flex items-center justify-center rounded-xl transition-all shadow-sm active:scale-95`}>
                    {l.label}
                  </button>
                ))}
              </div>
              <button 
                onClick={onRefresh}
                disabled={isRefreshing}
                className={`w-10 h-10 flex items-center justify-center rounded-xl bg-[#1D3557]/5 text-[#1D3557] hover:bg-[#1D3557]/10 transition-all shadow-sm ${isRefreshing ? 'animate-spin opacity-50' : 'active:scale-90'}`}
              >
                <RefreshCcw size={18} />
              </button>

              {isAdminMode ? (
                onExit && (
                  <button 
                    onClick={onExit}
                    className="w-10 h-10 bg-white border border-slate-200 text-slate-500 rounded-xl flex items-center justify-center shadow-sm hover:bg-slate-50 active:scale-95 transition-all ml-1"
                    title="Globe"
                  >
                    <Globe size={18} />
                  </button>
                )
              ) : (
                <button
                  onClick={() => onExit ? onExit() : navigate('/admin')}
                  className="w-10 h-10 bg-white border border-slate-200 text-slate-500 rounded-xl flex items-center justify-center shadow-sm hover:bg-slate-50 active:scale-95 transition-all ml-1 text-blue-600"
                  title={t.login}
                >
                  <Globe size={20} />
                </button>
              )}

              {isAdminMode && (
                <button 
                  onClick={onOpenSettings}
                  className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center transition-all shadow-sm hover:ring-2 hover:ring-blue-500 active:scale-95"
                  title={t.settings}
                >
                  <Settings2 size={18} />
                </button>
              )}
          </div>
        </header>
      )}

      {/* Filter & Search */}
      <div className="shrink-0 p-3 z-40 bg-[#FDFAF6] space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder={t.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/60 border border-[#1D3557]/10 rounded-2xl py-2.5 pl-11 pr-4 text-sm text-[#1D3557] placeholder-[#1D3557]/30 focus:outline-none focus:bg-white transition-all shadow-inner"
            />
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1D3557]/30" />
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-1 sm:gap-2 shrink-0">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toggleSortOrder();
              }}
              className="w-10 sm:w-10 h-10 bg-white border border-[#1D3557]/10 text-[#1D3557] rounded-xl flex items-center justify-center shadow-sm hover:bg-[#1D3557]/5 active:scale-95 transition-all"
              title={sortOrder === 'desc' ? t.sortOldest : t.sortNewest}
            >
              {sortOrder === 'desc' ? <ArrowDown size={18} /> : <ArrowUp size={18} />}
            </button>
            <button
                onClick={() => {
                  if (columns === 2) setColumns(3);
                  else if (columns === 3) setColumns(5);
                  else setColumns(2);
                }}
                className="w-10 sm:w-auto px-2 sm:px-4 h-10 rounded-xl transition-all border shadow-sm flex items-center justify-center bg-white border-[#1D3557]/10 text-[#1D3557] gap-1 sm:gap-2"
                title={`Switch layout`}
            >
                <LayoutGrid size={16} className="opacity-40" />
                <span className="font-black text-xs hidden sm:inline">{columns}</span>
            </button>
            <button
                onClick={() => setShowGroupsCollapsed(!showGroupsCollapsed)}
                className={`w-10 sm:w-10 h-10 rounded-xl transition-all border shadow-sm flex items-center justify-center ${showGroupsCollapsed ? 'bg-[#1D3557] border-[#1D3557] text-[#FDFAF6]' : 'bg-white border-[#1D3557]/10 text-[#1D3557]/40 hover:text-[#1D3557]'}`}
                title={showGroupsCollapsed ? "Show All" : "Group Photos"}
            >
                <Layers size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 px-1">
              <button 
                onClick={() => { setSelectedCatCode(null); setSelectedSubId(null); }}
                className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all shadow-sm border truncate px-1 ${!selectedCatCode ? 'bg-[#1D3557] border-[#1D3557] text-[#FDFAF6]' : 'bg-white border-[#1D3557]/10 text-[#1D3557]/60'}`}
              >
                {t.allCats}
              </button>
              {dbCategories.map(cat => (
                <button 
                  key={cat.code}
                  onClick={() => { setSelectedCatCode(cat.code); setSelectedSubId(null); }}
                  className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all shadow-sm border truncate px-1 ${selectedCatCode === cat.code ? 'bg-[#1D3557] border-[#1D3557] text-[#FDFAF6]' : 'bg-white border-[#1D3557]/10 text-[#1D3557]/60'}`}
                >
                  {cat[lang] || cat.en}
                </button>
              ))}
        </div>

        <div className="space-y-2">
          <AnimatePresence>
            {selectedCatCode && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap gap-1.5"
                >
                  <button 
                    onClick={() => setSelectedSubId(null)}
                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest whitespace-nowrap border transition-all ${!selectedSubId ? 'bg-[#D4A853] border-[#D4A853] text-white' : 'bg-white/50 border-[#1D3557]/5 text-[#1D3557]/40 font-medium'}`}
                  >
                    {t.all}
                  </button>
                  {(() => {
                    const legacyMatchedCat = categories.find(c => c.name === dbCategories.find(dc => dc.code === selectedCatCode)?.zh || c.id === selectedCatCode);
                    return legacyMatchedCat?.subcategories.map(sub => (
                      <button 
                        key={sub.id}
                        onClick={() => setSelectedSubId(sub.id)}
                        className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest whitespace-nowrap border transition-all ${selectedSubId === sub.id ? 'bg-[#D4A853] border-[#D4A853] text-white' : 'bg-white/50 border-[#1D3557]/5 text-[#1D3557]/40 font-medium'}`}
                      >
                        {sub.name}
                      </button>
                    ));
                  })()}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-wrap gap-1.5 items-center max-h-16 overflow-y-hidden overflow-x-auto flex-nowrap pb-2">
              {[...tags].sort((a,b) => photos.filter(p => p.tagIds?.includes(b.id)).length - photos.filter(p => p.tagIds?.includes(a.id)).length).map(tag => (
                <button 
                  key={tag.id}
                  onClick={() => setSelectedTagIds(prev => prev.includes(tag.id) ? prev.filter(t => t !== tag.id) : [...prev, tag.id])}
                  className={`px-2.5 py-1 rounded-lg text-[8px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border shadow-sm ${selectedTagIds.includes(tag.id) ? 'bg-[#1D3557] border-[#1D3557] text-[#FDFAF6]' : 'bg-white/40 border-[#1D3557]/5 text-[#1D3557]/50'}`}
                >
                  #{tag.name}
                </button>
              ))}
            </div>
          </div>
      </div>

      {/* Grid - Scrollable area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto no-scrollbar p-2 pb-40 bg-[#FDFAF6]">
        {displayPhotos.length === 0 ? (                
          <div className="flex flex-col items-center justify-center py-20 text-[#1D3557]/20">
            <div className="w-16 h-16 bg-white/40 rounded-full flex items-center justify-center mb-4 border border-white shadow-sm">
                <ImageIcon size={32} className="opacity-20" />
            </div>
            <p className="text-xs font-black uppercase tracking-widest">{t.empty}</p>
          </div>
        ) : (
          <div className={`grid gap-3 ${columns === 2 ? 'grid-cols-2' : columns === 3 ? 'grid-cols-3' : 'grid-cols-5'}`}>
            {gridPhotos.map((photo, i) => (
              <motion.div 
                key={photo.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: (i % 15) * 0.03 }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (isAdminMode) return;
                  shareSinglePhoto(photo);
                  if ('vibrate' in navigator) navigator.vibrate(50);
                }}
                onMouseDown={() => startLongPress(photo.id)}
                onMouseUp={endLongPress}
                onMouseLeave={endLongPress}
                onTouchStart={() => startLongPress(photo.id)}
                onTouchEnd={endLongPress}
                onClick={(e) => {
                  if (longPressTimer) {
                    endLongPress();
                  }
                  if (isAdminMode && onToggleSelection && isMultiSelect) {
                    onToggleSelection(photo.id);
                    return;
                  }
                  if (photo.groupId && showGroupsCollapsed) {
                    if (onGroupClick) {
                      onGroupClick(photo.groupId);
                    } else {
                      setActiveGroupId(photo.groupId);
                    }
                  } else {
                    // map grid index back to actual photo index in displayPhotos
                    const photoId = getRealId(photo.id);
                    const realIndex = displayPhotos.findIndex(p => p.id === photoId);
                    if (realIndex !== -1) setLightboxIndex(realIndex);
                  }
                }}
                className={`aspect-square bg-white rounded-2xl overflow-hidden cursor-pointer relative shadow-sm transition-all active:scale-[0.98] group ${isAdminMode && selectedIds.includes(photo.id) ? 'ring-4 ring-blue-500 ring-offset-2 scale-[0.95]' : ''}`}
              >
                <img 
                  src={photo.thumb_url || photo.image_url || photo.uri || undefined} 
                  alt={photo.name}
                  loading="lazy" 
                  className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105`}
                />

                {isAdminMode && selectedIds.includes(photo.id) && (
                  <div className="absolute top-2 right-2 bg-blue-600 text-white p-1 rounded-full shadow-lg z-10">
                    <X size={12} className="rotate-45" />
                  </div>
                )}
                {photo.groupId && (
                   <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-lg text-[7px] text-white font-bold flex items-center gap-1 border border-white/20 uppercase">
                     <Layers size={9} />
                     {photo.groupId.slice(-4)}
                   </div>
                 )}
                {/* Category/Tags label */}
                {(() => {
                  const catCodeOrId = (photo.categoryId || photo.category || '').trim();
                  const cat = dbCategories.find(c => 
                    (c.code || '').trim().toLowerCase() === catCodeOrId.toLowerCase() || 
                    (c.zh || '').trim().toLowerCase() === catCodeOrId.toLowerCase() || 
                    (c.en || '').trim().toLowerCase() === catCodeOrId.toLowerCase() || 
                    (c.ms || '').trim().toLowerCase() === catCodeOrId.toLowerCase()
                  );
                  
                  let catName = cat ? (cat[lang as keyof DB_Category] || cat.en) : (photo.category || '');
                  
                  // Normalize uncategorized
                  const uncatValues = ['未分类', '未分類', 'uncategorized', 'others', 'tiada kategori'];
                  if (!cat || uncatValues.includes(catName.toLowerCase())) {
                    catName = t.uncategorized;
                  }

                  const isUncategorized = catName === t.uncategorized || uncatValues.includes(catName.toLowerCase());
                  
                  let photoTags = [];
                  if (photo.tagIds && photo.tagIds.length > 0 && tags.length > 0) {
                    photoTags = tags.filter(t => photo.tagIds!.includes(t.id)).map(t => t.name);
                  }
                  if (photoTags.length === 0 && photo.tags && photo.tags.length > 0) {
                    photoTags = photo.tags || [];
                  }
                  
                  return (
                    <div className="absolute bottom-0 left-0 w-full p-2">
                       {!isUncategorized && catName && (
                        <p className="text-[10px] font-black tracking-tighter leading-none text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                          {catName.toUpperCase()}
                        </p>
                      )}
                      
                      {photoTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5 overflow-hidden max-h-4">
                          {photoTags.slice(0, 2).filter(t => typeof t === 'string' && t.trim() !== '').map((tagName, idx) => (
                            <span key={idx} className="bg-slate-900/30 backdrop-blur-sm text-white text-[6px] px-1 py-0.5 rounded-sm uppercase tracking-widest font-extrabold whitespace-nowrap border border-white/10">
                              {tagName}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {(isAdminMode || isStaffMode || showExit) && photo.model_number && (
                        <div className="mt-1">
                          <span className="bg-blue-500/80 text-white text-[6px] px-1 rounded font-black tracking-widest uppercase">
                             MOD: {photo.model_number}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </motion.div>
            ))}
          </div>
        )}
        <div ref={observerTarget} className="h-40"></div>
      </div>

      {/* Floating Action Buttons (Normal Mode) */}
      {lightboxIndex === null && !isAdminMode && (
        <div className="fixed bottom-6 left-6 right-6 flex justify-between z-[400]">
            <button 
              onClick={scrollToTop} 
              className="bg-[#1D3557] text-[#FDFAF6] p-4 rounded-full shadow-lg transition-all active:scale-95 border border-[#1D3557]/10"
            >
              <ArrowUpToLine size={24} />
            </button>
            <button onClick={() => contactWhatsApp()} className="bg-[#25D366] text-white p-4 rounded-full shadow-lg">
              <MessageCircle size={24} />
            </button>
        </div>
      )}

      {/* Admin Bulk Actions Bar */}
      {isAdminMode && selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-3 bg-[#1D3557] px-5 py-3 rounded-2xl shadow-2xl border border-white/10 animate-in fade-in slide-in-from-bottom-5 duration-300">
           <div className="bg-white/10 px-2 py-1 rounded-lg">
             <span className="text-xs font-black text-white">{selectedIds.length}</span>
           </div>
           
           <div className="flex items-center gap-2">
             <button 
               onClick={() => onGroupPhotos?.(selectedIds)}
               className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white transition-all active:scale-95 border border-white/10"
               title={t.merge}
             >
               <Layers size={18} />
             </button>
             
             <button 
               onClick={() => {
                 if (window.confirm(t.confirmDelete(selectedIds.length))) {
                   onDeletePhotos?.(selectedIds);
                 }
               }}
               className="w-10 h-10 bg-red-500/20 hover:bg-red-500/30 rounded-xl flex items-center justify-center text-red-400 transition-all active:scale-95 border border-red-500/20"
               title={t.delete}
             >
               <Trash2 size={18} />
             </button>

             <button 
               onClick={() => {
                 const selectedPhotos = photos.filter(p => selectedIds.includes(p.id));
                 const text = selectedPhotos.map(p => p.name || t.furniture).join(', ');
                 if (navigator.share) {
                   navigator.share({
                     title: t.shareTitle,
                     text: t.shareMsgCount(selectedIds.length, text),
                     url: window.location.origin
                   });
                 } else {
                   alert(t.shareNotSupported);
                 }
               }}
               className="w-10 h-10 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 transition-all active:scale-95 border border-blue-500/20"
               title={t.share}
             >
               <Share2 size={18} />
             </button>
           </div>

           <div className="w-px h-6 bg-white/10 mx-1" />

           <button 
             onClick={onClearSelection}
             className="p-2 text-white/40 hover:text-white transition-colors"
           >
             <X size={18} />
           </button>
        </div>
      )}

      {/* Group Detail View */}
      <AnimatePresence>
        {activeGroupId !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-[#FDFAF6] p-6 overflow-y-auto"
          >
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-[#1D3557] tracking-tighter">Group {activeGroupId}</h2>
                <button 
                  onClick={() => setActiveGroupId(null)}
                  className="p-3 bg-white border border-[#1D3557]/10 rounded-full text-[#1D3557] shadow-sm hover:ring-2 hover:ring-[#D4A853] transition-all"
                >
                  <X size={20} />
                </button>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {activeGroupPhotos.map((photo, i) => (
                  <motion.div 
                    key={photo.id}
                    className="aspect-square bg-white rounded-2xl overflow-hidden shadow-sm border border-[#1D3557]/5"
                    onClick={() => {
                        const realIndex = displayPhotos.findIndex(p => p.id === photo.id);
                        if (realIndex !== -1) setLightboxIndex(realIndex);
                    }}
                  >
                     <img src={photo.thumb_url || photo.image_url || photo.uri || undefined} className="w-full h-full object-cover" />
                  </motion.div>
                ))}
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && displayPhotos[lightboxIndex] && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm flex flex-col md:flex-row items-stretch"
            onClick={() => setLightboxIndex(null)}
          >
            {/* Close & Edit */}
            <div className="absolute top-4 right-4 md:top-6 md:right-6 z-[210] flex gap-2">
              {isAdminMode && (
                <button
                  className="p-3 bg-blue-600 text-white rounded-full shadow-lg active:scale-95 transition-all"
                  onClick={() => {
                    const photo = displayPhotos[lightboxIndex];
                    if (onEditPhoto) onEditPhoto(photo.id);
                  }}
                 title={t.edit}
                >
                  <Settings2 size={24} />
                </button>
              )}
              <button 
                className="p-3 text-white/50 hover:text-white bg-black/20 hover:bg-white/10 rounded-full transition-all"
                onClick={() => setLightboxIndex(null)}
                title={t.close}
              >
                <X size={24} />
              </button>
            </div>

            {/* Left Col: Image */}
            <div 
              className="flex-1 relative flex items-center justify-center min-h-[50vh] md:min-h-screen p-4 md:p-12 touch-pan-y"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <button 
                onClick={prevPhoto}
                className={`absolute left-2 md:left-6 z-[210] p-3 rounded-full bg-black/20 hover:bg-white/20 text-white transition-all backdrop-blur-md ${lightboxIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
              >
                <ChevronLeft size={32} />
              </button>
              
              <img 
                src={displayPhotos[lightboxIndex].image_url || displayPhotos[lightboxIndex].uri || undefined} 
                alt={displayPhotos[lightboxIndex].name}
                className="max-w-full max-h-full object-contain select-none opacity-0 transition-opacity duration-300"
                onLoad={(e) => (e.target as HTMLImageElement).style.opacity = '1'}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="absolute inset-0 flex items-center justify-center -z-10">
                 <RefreshCcw size={32} className="animate-spin text-white/20" />
              </div>
              
              <button 
                onClick={nextPhoto}
                className={`absolute right-2 md:right-6 z-[210] p-3 rounded-full bg-black/20 hover:bg-white/20 text-white transition-all backdrop-blur-md ${lightboxIndex === displayPhotos.length - 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
              >
                <ChevronRight size={32} />
              </button>
            </div>

            {/* Right Col / Bottom Info */}
            <div 
              className="w-full md:w-[350px] lg:w-[400px] bg-white text-slate-800 p-6 md:p-8 flex flex-col h-[50vh] md:h-full overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-6">

                {/* 1. 编号 (Item Code / Manual Code) */}
                {(isAdminMode || isStaffMode || showExit) && (
                  <div>
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.manualId}</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      {displayPhotos[lightboxIndex].manual_code ? (
                        <span className="text-xl font-black text-[#D4A853] tracking-widest leading-none">
                          {displayPhotos[lightboxIndex].manual_code}
                        </span>
                      ) : (
                        <span className="text-xl font-bold text-slate-300 italic align-middle leading-none">No Code</span>
                      )}
                      {displayPhotos[lightboxIndex].item_code && (
                        <span className="ml-auto text-[10px] bg-slate-100 text-slate-400 px-2 py-1 flex items-center rounded font-mono border border-slate-200">{t.sysCode}: {displayPhotos[lightboxIndex].item_code}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Model Number (Staff/Admin only) */}
                {(isAdminMode || isStaffMode || showExit) && displayPhotos[lightboxIndex].model_number && (
                  <div>
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">型号编号 / Model Number</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200 shadow-sm">
                        {displayPhotos[lightboxIndex].model_number}
                      </span>
                    </div>
                  </div>
                )}

                {/* 2. 名称 (Product Name) */}
                <div>
                   <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.name}</h3>
                   <h1 className="text-2xl font-black text-slate-900 leading-tight tracking-tight">
                     {displayPhotos[lightboxIndex].name && displayPhotos[lightboxIndex].name !== '家具记录' 
                       ? displayPhotos[lightboxIndex].name 
                       : t.unnamed}
                   </h1>
                </div>

                {/* 3. 目录 (Category) */}
                {(() => {
                   const code = (displayPhotos[lightboxIndex].categoryId || displayPhotos[lightboxIndex].category || '').trim().toLowerCase();
                   const cat = dbCategories.find(c => 
                     (c.code || '').trim().toLowerCase() === code || 
                     (c.zh || '').trim().toLowerCase() === code || 
                     (c.en || '').trim().toLowerCase() === code || 
                     (c.ms || '').trim().toLowerCase() === code
                   );
                   const catName = cat ? (cat[lang as keyof DB_Category] || cat.zh) : (displayPhotos[lightboxIndex].category || t.uncategorized);
                   return (
                     <div>
                       <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.category}</h3>
                       <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-bold inline-block border border-slate-200">
                         {catName}
                       </span>
                     </div>
                   );
                })()}

                {/* 4. 厂商 (Manufacturer) (Only if staff/admin/showExit) */}
                {(isAdminMode || isStaffMode || showExit) && displayPhotos[lightboxIndex].sub_category && (
                  <div>
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.manufacturer}</h3>
                    <span className="bg-orange-50 text-orange-600 px-3 py-1 border border-orange-200 rounded-full text-sm font-bold inline-block shadow-sm">
                      <Key size={12} className="inline-block mr-1.5 -translate-y-[1px]" />
                      {displayPhotos[lightboxIndex].sub_category}
                    </span>
                  </div>
                )}

                {/* 5. 标签 (Tags) */}
                {(() => {
                  const photo = displayPhotos[lightboxIndex];
                  let displayTags = [];
                  if (photo.tagIds && photo.tagIds.length > 0 && tags.length > 0) {
                    displayTags = tags.filter(t => photo.tagIds.includes(t.id)).map(t => t.name);
                  }
                  if (displayTags.length === 0 && photo.tags && photo.tags.length > 0) {
                    displayTags = photo.tags;
                  }
                  if (displayTags.length === 0) return null;

                  return (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.tags}</h3>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {displayTags.map((tagName, idx) => (
                          <span key={idx} className="bg-slate-800 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm whitespace-nowrap">
                            {tagName}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* 6. 其他 (尺寸/备注) */}
                {((displayPhotos[lightboxIndex].dimensions && (displayPhotos[lightboxIndex].dimensions.length > 0 || displayPhotos[lightboxIndex].dimensions.width > 0 || displayPhotos[lightboxIndex].dimensions.height > 0)) || displayPhotos[lightboxIndex].description) && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-4">
                    {displayPhotos[lightboxIndex].dimensions && (displayPhotos[lightboxIndex].dimensions.length > 0 || displayPhotos[lightboxIndex].dimensions.width > 0 || displayPhotos[lightboxIndex].dimensions.height > 0) && (
                      <div>
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                           {t.dimensions}
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-50">
                            <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-widest mb-1">{t.length} (L)</span>
                            <span className="text-lg font-black text-slate-800">{displayPhotos[lightboxIndex].dimensions.length}</span>
                            <span className="text-[9px] text-slate-400 ml-1 font-bold">CM</span>
                          </div>
                          <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-50">
                            <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-widest mb-1">{t.width} (W)</span>
                            <span className="text-lg font-black text-slate-800">{displayPhotos[lightboxIndex].dimensions.width}</span>
                            <span className="text-[9px] text-slate-400 ml-1 font-bold">CM</span>
                          </div>
                          <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-50">
                            <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-widest mb-1">{t.height} (H)</span>
                            <span className="text-lg font-black text-slate-800">{displayPhotos[lightboxIndex].dimensions.height}</span>
                            <span className="text-[9px] text-slate-400 ml-1 font-bold">CM</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {displayPhotos[lightboxIndex].description && (
                      <div>
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                           {t.description}
                        </h3>
                        <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">{displayPhotos[lightboxIndex].description}</p>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="pt-4 border-t border-slate-100 mt-2">
                   <button 
                    onClick={() => contactWhatsApp(displayPhotos[lightboxIndex!])}
                    className="w-full bg-[#25D366] text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg hover:shadow-xl active:scale-[0.98] transition-all"
                   >
                     <MessageCircle size={20} />
                     {t.whatsAppInquiry}
                   </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showPassPrompt && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => { setShowPassPrompt(false); setPassInput(''); setPassError(false); }}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-[320px] bg-white rounded-3xl p-8 shadow-2xl relative text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-white">
                <Lock size={32} />
              </div>
              <h3 className="font-bold text-slate-800 text-xl mb-2">{t.staffUnlock}</h3>
              <p className="text-sm text-slate-500 mb-6">{t.staffUnlockSub}</p>
              
              <form 
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (passInput === internalPassword) {
                    setIsStaffMode(true);
                    setShowPassPrompt(false);
                    setPassInput('');
                  } else {
                    setPassError(true);
                  }
                }}
              >
                <input 
                  type="password" 
                  autoFocus
                  placeholder={t.keyPlaceholder}
                  className={`w-full bg-slate-50 border p-4 rounded-2xl text-center text-lg font-bold outline-none transition-all ${passError ? 'border-red-500 bg-red-50' : 'border-slate-100 focus:bg-white focus:border-blue-500 shadow-sm'}`}
                  value={passInput}
                  onChange={(e) => { setPassInput(e.target.value); setPassError(false); }}
                />
                {passError && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest animate-bounce">{t.invalidKey}</p>}
                
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => { setShowPassPrompt(false); setPassInput(''); setPassError(false); }}
                    className="flex-1 py-4 px-4 rounded-2xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    {t.cancel}
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 px-4 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95"
                  >
                    {t.unlock}
                  </button>
                </div>
                {(onLogin || loginWithGoogle) && (
                  <div className="pt-4 border-t border-slate-100 mt-4 flex flex-col gap-2">
                    {loginWithGoogle && (
                      <button
                        type="button"
                        onClick={async () => {
                          setShowPassPrompt(false);
                          try {
                            await loginWithGoogle();
                          } catch (e: any) { alert(t.loginFailed); }
                        }}
                        className="w-full py-3 px-4 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all text-sm flex items-center justify-center gap-2"
                      >
                         <LogIn size={16} /> {t.googleLogin}
                      </button>
                    )}
                  </div>
                )}
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showWhatsAppChoice && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-md flex items-end justify-center p-6"
            onClick={() => setShowWhatsAppChoice(false)}
          >
            <motion.div 
              initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
              className="w-full max-w-sm bg-white rounded-t-[32px] p-6 pb-12 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-slate-800">{t.selectContact}</h3>
                <button onClick={() => setShowWhatsAppChoice(false)} className="p-1 hover:bg-slate-100 rounded-full">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
              <div className="space-y-3">
                {settings?.whatsapp_1 && (
                  <button 
                    onClick={() => openWhatsApp(settings.whatsapp_1, (window as any)._pendingPhoto)}
                    className="w-full py-4 px-6 bg-[#25D366] text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-all"
                  >
                    <span className="text-xl">👵</span>
                    <div className="flex-1 flex flex-col items-start px-2">
                      <span className="text-[10px] opacity-70 uppercase tracking-widest">{t.contactNo} 1</span>
                      <span className="leading-tight truncate w-full text-left">{settings.whatsapp_1_name || 'Contact 1'}</span>
                    </div>
                    <MessageCircle size={20} className="shrink-0" />
                  </button>
                )}
                {settings?.whatsapp_2 && (
                  <button 
                    onClick={() => openWhatsApp(settings.whatsapp_2, (window as any)._pendingPhoto)}
                    className="w-full py-4 px-6 bg-[#128C7E] text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-all"
                  >
                    <span className="text-xl">🏢</span>
                    <div className="flex-1 flex flex-col items-start px-2">
                      <span className="text-[10px] opacity-70 uppercase tracking-widest">{t.contactNo} 2</span>
                      <span className="leading-tight truncate w-full text-left">{settings.whatsapp_2_name || 'Contact 2'}</span>
                    </div>
                    <MessageCircle size={20} className="shrink-0" />
                  </button>
                )}
                {!settings?.whatsapp_1 && !settings?.whatsapp_2 && (
                  (() => {
                    const fallback = (import.meta as any).env.VITE_WHATSAPP_NUMBER;
                    if (!fallback) return null;
                    return (
                      <button 
                        onClick={() => openWhatsApp(fallback, (window as any)._pendingPhoto)}
                        className="w-full py-4 px-6 bg-slate-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-all"
                      >
                        <MessageCircle size={20} />
                        {t.contactNo}
                      </button>
                    )
                  })()
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
