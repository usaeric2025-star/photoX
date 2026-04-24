import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Photo, DB_Category, Category, Tag } from '../types';
import { Search, X, ChevronLeft, ChevronRight, Image as ImageIcon, Lock, Unlock, Key, LayoutGrid, Columns, ArrowUpToLine, MessageCircle, Share2, Layers, Maximize, Grid3X3, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PublicGalleryProps {
  photos: Photo[];
  categories: Category[];
  tags: Tag[];
  dbCategories: DB_Category[];
  onExit?: () => void;
  showExit?: boolean;
  onLogin?: () => void;
  internalPassword?: string;
  settings?: any;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

const translations = {
  zh: {
    galleryName: 'Gallery',
    gallerySub: (count: number) => `共 ${count} 張照片`,
    search: '在此搜尋...',
    allCats: '全部',
    name: '產品名稱',
    category: '分類',
    description: '產品說明',
    tags: '標籤',
    close: '關閉',
    empty: '沒有找到匹配的照片',
    whatsAppInquiry: 'WhatsApp 諮詢'
  },
  en: {
    galleryName: 'Gallery',
    gallerySub: (count: number) => `${count} photos`,
    search: 'Search...',
    allCats: 'All',
    name: 'Name',
    category: 'Category',
    description: 'Description',
    tags: 'Tags',
    close: 'Close',
    empty: 'No matching photos',
  },
  ms: {
    galleryName: 'Gallery',
    gallerySub: (count: number) => `Jumlah ${count} foto`,
    search: 'Cari di sini...',
    allCats: 'Semua',
    name: 'Nama',
    category: 'Kategori',
    description: 'Penerangan',
    tags: 'Tag',
    close: 'Tutup',
    empty: 'Tiada foto yang sepadan ditemui',
  }
};

export const PublicGallery: React.FC<PublicGalleryProps> = ({ photos, categories, tags, dbCategories, onExit, showExit, onLogin, internalPassword, settings, isRefreshing, onRefresh }) => {
  const [lang, setLang] = useState<'zh' | 'en' | 'ms'>('zh');
  const t = translations[lang];

  const [isStaffMode, setIsStaffMode] = useState(false);
  const [showPassPrompt, setShowPassPrompt] = useState(false);
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState(false);

  const [columns, setColumns] = useState<2 | 3 | 5>(3);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatCode, setSelectedCatCode] = useState<string | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  
  const columnCount = columns; 
  const [visibleCount, setVisibleCount] = useState(15); 
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [showGroupsCollapsed, setShowGroupsCollapsed] = useState(true);
  const [headerClickCount, setHeaderClickCount] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
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

  const displayPhotos = useMemo(() => {
    let filtered = photos;
    if (selectedCatCode) {
      // Check both category name and code for public data consistency
      const activeCat = dbCategories.find(c => c.code === selectedCatCode);
      filtered = filtered.filter(p => 
        p.category === selectedCatCode || 
        p.category === activeCat?.zh || 
        p.categoryId === selectedCatCode
      );
    }
    
    if (selectedSubId) {
      const activeSub = categories.flatMap(c => c.subcategories).find(s => s.id === selectedSubId);
      filtered = filtered.filter(p => p.subcategoryId === selectedSubId || p.sub_category === activeSub?.name);
    }

    if (selectedTagIds.length > 0) {
      filtered = filtered.filter(p => {
        const pTags = p.tags || [];
        const pTagIds = p.tagIds || [];
        return selectedTagIds.every(tid => {
          const tagName = tags.find(t => t.id === tid)?.name;
          return pTagIds.includes(tid) || (tagName && pTags.includes(tagName));
        });
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => {
        // Map tagIds to names for searching
        const mappedTagNames = (p.tagIds || []).map(tid => tags.find(t => t.id === tid)?.name).filter(Boolean);
        
        const searchableText = [
          p.name,
          p.description,
          ...(p.tags || []),
          ...mappedTagNames,
          dbCategories.find(c => c.code === p.category)?.zh || '',
          dbCategories.find(c => c.code === p.category)?.en || '',
          dbCategories.find(c => c.code === p.category)?.ms || ''
        ].filter(Boolean).join(' ').toLowerCase();

        return searchableText.includes(q);
      });
    }
    // Apply Grouping if enabled
    let sorted = [...filtered];
    if (showGroupsCollapsed) {
      const groupsSeen = new Set<string>();
      sorted = sorted.filter(p => {
        if (!p.groupId) return true;
        if (groupsSeen.has(p.groupId)) return false;
        groupsSeen.add(p.groupId);
        return true;
      });
    }
    
    return sorted;
  }, [photos, selectedCatCode, selectedSubId, selectedTagIds, searchQuery, showGroupsCollapsed]);

  const visiblePhotos = useMemo(() => {
    if (displayPhotos.length === 0) return [];
    
    const result = [];
    // Infinite loop: allow visibleCount to exceed displayPhotos.length by repeating
    for (let i = 0; i < visibleCount; i++) {
      const originalPhoto = displayPhotos[i % displayPhotos.length];
      result.push({
        ...originalPhoto,
        // Use unique ID for each instance to satisfy React keys and prevent duplicate key warnings
        id: `${originalPhoto.id}-loop-${i}`
      });
    }
    return result;
  }, [displayPhotos, visibleCount]);

  const gridPhotos = useMemo(() => {
    if (visiblePhotos.length === 0 || displayPhotos.length === 0) return visiblePhotos;
    const remainder = visiblePhotos.length % columnCount;
    if (remainder === 0) return visiblePhotos;
    
    // Fill the remainder of the last row with next items in sequence
    const fillerCount = columnCount - remainder;
    const result = [...visiblePhotos];
    for (let i = 0; i < fillerCount; i++) {
        const nextIndex = (visiblePhotos.length + i) % displayPhotos.length;
        const p = displayPhotos[nextIndex];
        if (p) {
            result.push({ ...p, id: `${p.id}-filler-${visiblePhotos.length + i}` });
        }
    }
    return result;
  }, [visiblePhotos, columnCount, displayPhotos]);

  const getRealId = (loopId: string) => loopId.split('-loop-')[0].split('-filler-')[0];

  // Observer for lazy loading
  const observerTarget = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // Keep increasing visibleCount to support infinite loop
          setVisibleCount(prev => prev + 12);
        }
      },
      { threshold: 0.1 }
    );
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    return () => {
      if (observerTarget.current) observer.unobserve(observerTarget.current);
    };
  }, [displayPhotos.length, visibleCount]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedPhotos);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    
    // Auto-exit if nothing selected
    if (next.size === 0) setSelectionMode(false);
    
    setSelectedPhotos(next);
  };

  const [showWhatsAppChoice, setShowWhatsAppChoice] = useState(false);

  const shareSelected = async () => {
    if (selectedPhotos.size === 0) {
      alert('請至少選擇一張照片進行分享');
      return;
    }
    const selected = displayPhotos.filter(p => selectedPhotos.has(p.id));
    const text = selected.map((p, i) => `${i + 1}. ${p.name} ${isStaffMode ? '[' + (p.manual_code || '') + ']' : ''}`).join('\n');
    console.log(`Share text: ${text}`);
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Furniture',
          text: `你好，我对以下家具有兴趣：\n\n${text}\n\n查看更多：photo-x-one.vercel.app`,
        });
      } catch (e) {
        console.error('Share err:', e);
      }
    }
  };

  const openWhatsApp = (num: string, singlePhotoId?: string) => {
    let msg = '';
    const isEn = lang === 'en';
    
    const getPhotoDisplayName = (p: Photo) => {
      const isPlaceholder = !p.name || p.name === '家具紀錄' || p.name === 'Furniture Record' || p.name === '未命名產品';
      if (!isPlaceholder) return p.name;
      const cat = dbCategories.find(c => c.code === p.category);
      if (cat) return cat[lang] || cat.zh;
      return isEn ? 'Furniture' : '家具';
    };

    if (singlePhotoId) {
      const p = photos.find(ph => ph.id === singlePhotoId);
      if (p) {
        const displayName = getPhotoDisplayName(p);
        msg = isEn 
          ? `Hello, I'm interested in this furniture:\n\n${displayName} ${isStaffMode ? '[' + (p.manual_code || '') + ']' : ''}\n\nView more: photo-x-one.vercel.app`
          : `你好，我對這個家具有興趣：\n\n${displayName} ${isStaffMode ? '[' + (p.manual_code || '') + ']' : ''}\n\n查看更多：photo-x-one.vercel.app`;
      }
    } else if (selectedPhotos.size > 0) {
      const selected = displayPhotos.filter(p => selectedPhotos.has(p.id));
      const text = selected.map((p, i) => `${i + 1}. ${getPhotoDisplayName(p)} ${isStaffMode ? '[' + (p.manual_code || '') + ']' : ''}`).join('\n');
      msg = isEn
        ? `Hello, I'm interested in these furniture items:\n\n${text}\n\nView more: photo-x-one.vercel.app`
        : `你好，我對以下家具有興趣：\n\n${text}\n\n查看更多：photo-x-one.vercel.app`;
    } else {
      msg = isEn ? `Hello, I'd like to inquire about furniture.` : `你好，我想諮詢家具資訊。`;
    }
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
    setShowWhatsAppChoice(false);
  };

  const contactWhatsApp = (photoId?: string) => {
    const num1 = settings?.whatsapp_1;
    const num2 = settings?.whatsapp_2;

    if (num1 && num2) {
      // Store which photo we are sharing if any
      (window as any)._pendingPhotoId = photoId;
      setShowWhatsAppChoice(true);
    } else if (num1 || num2) {
      openWhatsApp(num1 || num2, photoId);
    } else {
      const fallback = (import.meta as any).env.VITE_WHATSAPP_NUMBER;
      if (fallback) openWhatsApp(fallback, photoId);
      else alert('未設定聯繫號碼');
    }
  };
  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    }
  };
  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null && lightboxIndex < displayPhotos.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (lightboxIndex === null) return;
    if (e.key === 'ArrowLeft') {
      if (lightboxIndex > 0) setLightboxIndex(lightboxIndex - 1);
    } else if (e.key === 'ArrowRight') {
      if (lightboxIndex < displayPhotos.length - 1) setLightboxIndex(lightboxIndex + 1);
    } else if (e.key === 'Escape') {
      setLightboxIndex(null);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

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
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    
    // Swipe left (next photo)
    if (diff > 50) {
      if (lightboxIndex !== null && lightboxIndex < displayPhotos.length - 1) {
        setLightboxIndex(lightboxIndex + 1);
      }
    } 
    // Swipe right (prev photo)
    else if (diff < -50) {
      if (lightboxIndex !== null && lightboxIndex > 0) {
        setLightboxIndex(lightboxIndex - 1);
      }
    }
    
    // Reset
    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <div className="flex flex-col h-full bg-bg w-full overflow-hidden text-text">
      {/* Header */}
      {lightboxIndex === null && (
        <header className="shrink-0 z-50 bg-[#FDFAF6] px-6 pt-3 pb-3 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0" onClick={handleHeaderClick}>
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="h-10 max-w-[180px] object-contain rounded-xl border border-[#1D3557]/10 p-1 bg-white shadow-sm" />
            ) : (
              <h1 className="text-xl font-black tracking-tighter text-[#1D3557] border border-[#1D3557]/10 px-3 py-1 rounded-xl bg-white shadow-sm inline-block italic leading-none">GALLERY</h1>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest">
                {['zh', 'en', 'ms'].map(l => (
                  <button key={l} onClick={() => setLang(l as any)} className={`${lang === l ? 'bg-[#1D3557] text-[#FDFAF6]' : 'bg-[#1D3557]/5 text-[#1D3557]/40'} px-3 py-1.5 rounded-xl transition-all shadow-sm active:scale-95`}>
                    {l}
                  </button>
                ))}
              </div>
              <button 
                onClick={onRefresh}
                disabled={isRefreshing}
                className={`p-2 rounded-xl bg-[#1D3557]/5 text-[#1D3557] hover:bg-[#1D3557]/10 transition-all ${isRefreshing ? 'animate-spin opacity-50' : 'active:scale-90'}`}
              >
                <RefreshCcw size={18} />
              </button>
          </div>
        </header>
      )}

      {/* Filter & Search */}
      <div className="shrink-0 p-4 z-40 bg-[#FDFAF6] space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder={t.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/60 border border-[#1D3557]/10 rounded-2xl py-3 pl-11 pr-4 text-sm text-[#1D3557] placeholder-[#1D3557]/30 focus:outline-none focus:bg-white transition-all shadow-inner"
            />
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1D3557]/30" />
          </div>
          
          {/* Column Toggle */}
          <div className="flex gap-2">
            <button
                onClick={() => {
                  if (columns === 2) setColumns(3);
                  else if (columns === 3) setColumns(5);
                  else setColumns(2);
                }}
                className="px-4 h-11 rounded-2xl transition-all border shadow-sm flex items-center justify-center bg-white border-[#1D3557]/10 text-[#1D3557] gap-2"
                title={`Switch layout`}
            >
                <LayoutGrid size={16} className="opacity-40" />
                <span className="font-black text-xs">{columns}</span>
            </button>
            <button
                onClick={() => setShowGroupsCollapsed(!showGroupsCollapsed)}
                className={`w-11 h-11 rounded-2xl transition-all border shadow-sm flex items-center justify-center ${showGroupsCollapsed ? 'bg-[#1D3557] border-[#1D3557] text-[#FDFAF6]' : 'bg-white border-[#1D3557]/10 text-[#1D3557]/40 hover:text-[#1D3557]'}`}
                title={showGroupsCollapsed ? "Show All" : "Group Photos"}
            >
                <Layers size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 px-1">
          {selectionMode ? (
            <div className="col-span-4 flex justify-between w-full items-center p-1">
               <button onClick={() => { setSelectionMode(false); setSelectedPhotos(new Set()); }} className="text-xs font-black text-[#1D3557]/50 uppercase tracking-widest">Cancel</button>
               <span className="text-[10px] font-black text-[#1D3557] uppercase tracking-[0.2em]">{selectedPhotos.size} selected</span>
               <button onClick={() => { setSelectionMode(false); setSelectedPhotos(new Set()); }} className="text-xs font-black text-[#D4A853] uppercase tracking-widest">Done</button>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>

        {!selectionMode && (
          <div className="space-y-3">
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
                    ALL
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

            <div className="flex flex-wrap gap-1.5 items-center">
              {tags.map(tag => (
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
        )}
      </div>

      {/* Grid - Scrollable area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto no-scrollbar p-6 pb-40 bg-[#FDFAF6]">
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
                onPointerDown={(e) => {
                  const timer = setTimeout(() => {
                    if (!selectionMode) {
                      setSelectionMode(true);
                      toggleSelect(getRealId(photo.id));
                      // Haptic feedback if available
                      if ('vibrate' in navigator) navigator.vibrate(50);
                    }
                  }, 600);
                  (e.currentTarget as any)._longPressTimer = timer;
                }}
                onPointerUp={(e) => {
                  if ((e.currentTarget as any)._longPressTimer) {
                    clearTimeout((e.currentTarget as any)._longPressTimer);
                  }
                }}
                onPointerLeave={(e) => {
                  if ((e.currentTarget as any)._longPressTimer) {
                    clearTimeout((e.currentTarget as any)._longPressTimer);
                  }
                }}
                onClick={() => {
                  if (selectionMode) {
                    toggleSelect(getRealId(photo.id));
                  } else {
                    // map grid index back to actual photo index in displayPhotos
                    const photoId = getRealId(photo.id);
                    const realIndex = displayPhotos.findIndex(p => p.id === photoId);
                    if (realIndex !== -1) setLightboxIndex(realIndex);
                  }
                }}
                className={`aspect-square bg-white rounded-2xl overflow-hidden cursor-pointer relative shadow-sm transition-all active:scale-[0.98] group ${selectedPhotos.has(getRealId(photo.id)) ? 'ring-2 ring-[#D4A853]' : ''}`}
              >
                <img 
                  src={photo.image_url || photo.uri} 
                  alt={photo.name}
                  loading="lazy" 
                  className={`w-full h-full object-cover transition-transform duration-500 ${selectedPhotos.has(getRealId(photo.id)) ? 'scale-110 opacity-70' : 'group-hover:scale-105'}`}
                />

                {photo.groupId && (
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-lg text-[7px] text-white font-bold flex items-center gap-1 border border-white/20 uppercase">
                    <Layers size={9} />
                    {photo.groupId}
                  </div>
                )}
                
                {selectedPhotos.has(getRealId(photo.id)) && (
                  <div className="absolute top-2 right-2 bg-[#1D3557] text-[#FDFAF6] rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                    <X size={12} strokeWidth={3} />
                  </div>
                )}
                
                {/* Category label */}
                {(() => {
                  const cat = dbCategories.find(c => c.code === photo.category);
                  const catName = cat ? (cat[lang] || cat.en) : photo.category;
                  const isUncategorized = !catName || 
                    ['未分类', '未分類', 'uncategorized', 'Uncategorized', 'others', 'Others'].includes(catName.toLowerCase());
                  
                  return (
                    <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/80 to-transparent translate-y-1 group-hover:translate-y-0 transition-transform">
                      {!isUncategorized && (
                        <p className="text-white text-[9px] font-bold truncate uppercase tracking-wider">
                          {catName}
                        </p>
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

      {/* Selection Footer */}
      {selectionMode && lightboxIndex === null && (
         <div className="fixed bottom-20 left-0 w-full bg-bg border-t border-text/10 p-4 flex gap-4 shadow-lg z-[300]">
             <button onClick={shareSelected} className="flex-1 bg-text text-bg py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
               <Share2 size={16} /> Share
             </button>
             <button onClick={() => contactWhatsApp()} className="flex-1 bg-[#25D366] text-white py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
               <MessageCircle size={16} /> WhatsApp
             </button>
         </div>
      )}

      {/* Floating Action Buttons (Normal Mode) */}
      {!selectionMode && lightboxIndex === null && (
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
            {/* Close */}
            <button 
              className="absolute top-4 right-4 md:top-6 md:right-6 z-[210] p-3 text-white/50 hover:text-white bg-black/20 hover:bg-white/10 rounded-full transition-all"
              onClick={() => setLightboxIndex(null)}
              title={t.close}
            >
              <X size={24} />
            </button>

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
                src={displayPhotos[lightboxIndex].image_url || displayPhotos[lightboxIndex].uri} 
                alt={displayPhotos[lightboxIndex].name}
                className="max-w-full max-h-full object-contain select-none"
                onClick={(e) => e.stopPropagation()}
              />
              
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
                <div>
                   <h1 className="text-2xl font-black text-slate-900 leading-tight tracking-tight mb-1">
                     {(() => {
                        const code = displayPhotos[lightboxIndex].category;
                        const cat = dbCategories.find(c => c.code === code);
                        return cat ? (cat[lang] || cat.zh) : (displayPhotos[lightboxIndex].name || (lang === 'en' ? 'Furniture' : '家具紀錄'));
                     })()}
                   </h1>
                   {(isStaffMode || showExit) && (displayPhotos[lightboxIndex].item_code || displayPhotos[lightboxIndex].name) && (
                     <div className="space-y-0.5">
                       {displayPhotos[lightboxIndex].item_code && <p className="text-[10px] font-mono text-slate-400">ID: {displayPhotos[lightboxIndex].item_code}</p>}
                       {displayPhotos[lightboxIndex].name && displayPhotos[lightboxIndex].name !== '家具紀錄' && (
                         <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{displayPhotos[lightboxIndex].name}</p>
                       )}
                     </div>
                   )}
                </div>

                {(isStaffMode || showExit) && (displayPhotos[lightboxIndex].sub_category || displayPhotos[lightboxIndex].manual_code) && (
                  <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    {displayPhotos[lightboxIndex].sub_category && (
                      <div>
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">厂商 (Manufacturer)</h3>
                        <p className="text-slate-700 font-bold">{displayPhotos[lightboxIndex].sub_category}</p>
                      </div>
                    )}
                    {displayPhotos[lightboxIndex].manual_code && (
                      <div>
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">手动编号 (Manual ID)</h3>
                        <p className="text-[#D4A853] font-mono font-black tracking-wider text-sm">{displayPhotos[lightboxIndex].manual_code}</p>
                      </div>
                    )}
                  </div>
                )}

                {(() => {
                   const code = displayPhotos[lightboxIndex].category;
                   const cat = dbCategories.find(c => c.code === code);
                   const catName = cat ? (cat[lang] || cat.en) : code;
                   const isUncategorized = !catName || ['未分类', '未分類', 'uncategorized', 'Uncategorized', 'others', 'Others'].includes(catName.toLowerCase());
                  const subCat = (!isStaffMode && !showExit) ? displayPhotos[lightboxIndex].sub_category : null;

                  return (
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t.category}</h3>
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-medium">
                          {catName}
                        </span>
                        {subCat && (
                          <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-sm font-bold border border-orange-200 flex items-center gap-1.5 shadow-sm">
                            <Key size={12} />
                            {subCat}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {displayPhotos[lightboxIndex].manual_code && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">手動編號 (Manual ID)</h3>
                    <p className="inline-block bg-slate-800 text-white px-3 py-1 rounded-lg text-sm font-mono tracking-wider shadow-md">
                      {displayPhotos[lightboxIndex].manual_code}
                    </p>
                  </div>
                )}

                {displayPhotos[lightboxIndex].dimensions && (displayPhotos[lightboxIndex].dimensions.length > 0 || displayPhotos[lightboxIndex].dimensions.width > 0 || displayPhotos[lightboxIndex].dimensions.height > 0) && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Maximize size={10} /> 尺寸資訊 (Dimensions)
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-50">
                        <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-widest mb-1">長 (L)</span>
                        <span className="text-lg font-black text-slate-800">{displayPhotos[lightboxIndex].dimensions.length}</span>
                        <span className="text-[9px] text-slate-400 ml-1 font-bold">CM</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-50">
                        <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-widest mb-1">寬 (W)</span>
                        <span className="text-lg font-black text-slate-800">{displayPhotos[lightboxIndex].dimensions.width}</span>
                        <span className="text-[9px] text-slate-400 ml-1 font-bold">CM</span>
                      </div>
                      <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-50">
                        <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-widest mb-1">高 (H)</span>
                        <span className="text-lg font-black text-slate-800">{displayPhotos[lightboxIndex].dimensions.height}</span>
                        <span className="text-[9px] text-slate-400 ml-1 font-bold">CM</span>
                      </div>
                    </div>
                  </div>
                )}

                {(() => {
                  const photo = displayPhotos[lightboxIndex];
                  // Use tagIds to find names from current cloud tags mapping
                  let displayTags = [];
                  if (photo.tagIds && photo.tagIds.length > 0 && tags.length > 0) {
                    displayTags = tags.filter(t => photo.tagIds.includes(t.id)).map(t => t.name);
                  }
                  
                  // Fallback to photo.tags if mapping failed but names exist
                  if (displayTags.length === 0 && photo.tags && photo.tags.length > 0) {
                    displayTags = photo.tags;
                  }

                  if (displayTags.length === 0) return null;

                  return (
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t.tags}</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {displayTags.map((tagName, idx) => (
                          <span key={idx} className="bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded text-xs font-medium">
                            #{tagName}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                
                <div className="pt-4 border-t border-slate-100">
                   <button 
                    onClick={() => contactWhatsApp(displayPhotos[lightboxIndex!].id)}
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
              <h3 className="font-bold text-slate-800 text-xl mb-2">員工解鎖</h3>
              <p className="text-sm text-slate-500 mb-6">請輸入員工訪問密鑰以查看內部資訊</p>
              
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
                  placeholder="密鑰..."
                  className={`w-full bg-slate-50 border p-4 rounded-2xl text-center text-lg font-bold outline-none transition-all ${passError ? 'border-red-500 bg-red-50' : 'border-slate-100 focus:bg-white focus:border-blue-500 shadow-sm'}`}
                  value={passInput}
                  onChange={(e) => { setPassInput(e.target.value); setPassError(false); }}
                />
                {passError && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest animate-bounce">密鑰錯誤</p>}
                
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => { setShowPassPrompt(false); setPassInput(''); setPassError(false); }}
                    className="flex-1 py-4 px-4 rounded-2xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 px-4 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95"
                  >
                    解鎖
                  </button>
                </div>
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
                <h3 className="font-bold text-slate-800">選擇聯繫號碼</h3>
                <button onClick={() => setShowWhatsAppChoice(false)} className="p-1 hover:bg-slate-100 rounded-full">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
              <div className="space-y-3">
                {settings?.whatsapp_1 && (
                  <button 
                    onClick={() => openWhatsApp(settings.whatsapp_1, (window as any)._pendingPhotoId)}
                    className="w-full py-4 px-6 bg-[#25D366] text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-all"
                  >
                    <span className="text-xl">👵</span>
                    <div className="flex-1 flex flex-col items-start px-2">
                      <span className="text-[10px] opacity-70 uppercase tracking-widest">WhatsApp 01</span>
                      <span className="leading-tight truncate w-full text-left">{settings.whatsapp_1_name || '聯繫號碼 1'}</span>
                    </div>
                    <MessageCircle size={20} className="shrink-0" />
                  </button>
                )}
                {settings?.whatsapp_2 && (
                  <button 
                    onClick={() => openWhatsApp(settings.whatsapp_2, (window as any)._pendingPhotoId)}
                    className="w-full py-4 px-6 bg-[#128C7E] text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-all"
                  >
                    <span className="text-xl">🏢</span>
                    <div className="flex-1 flex flex-col items-start px-2">
                      <span className="text-[10px] opacity-70 uppercase tracking-widest">WhatsApp 02</span>
                      <span className="leading-tight truncate w-full text-left">{settings.whatsapp_2_name || '聯繫號碼 2'}</span>
                    </div>
                    <MessageCircle size={20} className="shrink-0" />
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
