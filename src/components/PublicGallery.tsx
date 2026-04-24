import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Photo, DB_Category } from '../types';
import { Search, X, ChevronLeft, ChevronRight, Image as ImageIcon, Lock, Unlock, Key, LayoutGrid, Columns, ArrowUpToLine, MessageCircle, Share2, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PublicGalleryProps {
  photos: Photo[];
  dbCategories: DB_Category[];
  onExit?: () => void;
  showExit?: boolean;
  onLogin?: () => void;
  internalPassword?: string;
  settings?: any;
}

const translations = {
  zh: {
    galleryName: 'Gallery',
    gallerySub: (count: number) => `共 ${count} 张照片`,
    search: '在此搜寻...',
    allCats: '全部',
    name: '名称',
    category: '分类',
    description: '描述',
    tags: '标签',
    close: '关闭',
    empty: '没有找到匹配的照片',
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

export const PublicGallery: React.FC<PublicGalleryProps> = ({ photos, dbCategories, onExit, showExit, onLogin, internalPassword, settings }) => {
  const [lang, setLang] = useState<'zh' | 'en' | 'ms'>('zh');
  const t = translations[lang];

  const [isStaffMode, setIsStaffMode] = useState(false);
  const [showPassPrompt, setShowPassPrompt] = useState(false);
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatCode, setSelectedCatCode] = useState<string | null>(null);
  
  const [columnCount, setColumnCount] = useState(3);
  const [visibleCount, setVisibleCount] = useState(12);
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
    setHeaderClickCount(prev => {
        const next = prev + 1;
        if (next >= 3) {
            onLogin && onLogin();
            return 0;
        }
        return next;
    });
  }

  const displayPhotos = useMemo(() => {
    let filtered = photos;
    if (selectedCatCode) {
      filtered = filtered.filter(p => p.category === selectedCatCode);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => {
        const searchableText = [
          p.name,
          p.description,
          ...(p.tags || []),
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
  }, [photos, selectedCatCode, searchQuery, showGroupsCollapsed]);

  const visiblePhotos = useMemo(() => displayPhotos.slice(0, visibleCount), [displayPhotos, visibleCount]);

  // Observer for lazy loading
  const observerTarget = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => Math.min(prev + 12, displayPhotos.length));
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
    setSelectedPhotos(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      
      // Auto-exit if nothing selected
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  };

  const shareSelected = async () => {
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

  const contactWhatsApp = () => {
    const number = import.meta.env.VITE_WHATSAPP_NUMBER || '';
    const selected = displayPhotos.filter(p => selectedPhotos.has(p.id));
    const text = selected.map((p, i) => `${i + 1}. ${p.name} ${isStaffMode ? '[' + (p.manual_code || '') + ']' : ''}`).join('\n');
    const msg = `你好，我对以下家具有兴趣：\n\n${text}\n\n查看更多：photo-x-one.vercel.app`;
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(msg)}`, '_blank');
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
      <header className="shrink-0 z-50 bg-bg/90 backdrop-blur-sm border-b border-text/10 px-6 pt-10 pb-4 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0" onClick={handleHeaderClick}>
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="h-8 max-w-[120px] object-contain cursor-pointer" />
          ) : (
            <h1 className="text-xl font-bold tracking-tight truncate leading-tight cursor-pointer">Gallery</h1>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
           <div className="flex items-center gap-1 text-xs font-semibold">
             {['zh', 'en', 'ms'].map(l => (
               <button key={l} onClick={() => setLang(l as any)} className={`${lang === l ? 'bg-accent text-bg' : 'bg-text/10 text-text/60'} px-2.5 py-1 rounded-md transition-colors`}>
                 {l.toUpperCase()}
               </button>
             ))}
           </div>
        </div>
      </header>

      {/* Filter & Search */}
      <div className="shrink-0 p-4 z-40 bg-bg border-b border-text/10 shadow-sm">
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder={t.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-text/10 rounded-lg py-2 pl-10 pr-4 text-sm text-text placeholder-text/30 focus:outline-none"
            />
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text/40" />
          </div>
          {/* Group Toggle */}
          <button
              onClick={() => setShowGroupsCollapsed(!showGroupsCollapsed)}
              className={`p-2 rounded-xl transition-all border ${showGroupsCollapsed ? 'bg-orange-500 border-orange-500 text-white shadow-md' : 'bg-white border-text/10 text-text/40 hover:text-text'}`}
              title={showGroupsCollapsed ? "Show All" : "Group Photos"}
          >
              <Layers size={18} />
          </button>
          {/* Column Toggle */}
          <button 
            onClick={() => setColumnCount(prev => prev === 3 ? 2 : 3)}
            className="p-2 bg-white border border-text/10 rounded-lg text-text/60 hover:text-text"
          >
            {columnCount === 3 ? <Columns size={18} /> : <LayoutGrid size={18} />}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectionMode ? (
            <div className="flex justify-between w-full items-center">
               <button onClick={() => { setSelectionMode(false); setSelectedPhotos(new Set()); }} className="text-sm font-semibold">Cancel</button>
               <span className="text-sm">{selectedPhotos.size} selected</span>
               <button onClick={() => { setSelectionMode(false); setSelectedPhotos(new Set()); }} className="text-sm font-semibold">Done</button>
            </div>
          ) : (
            <>
              <button 
                onClick={() => setSelectedCatCode(null)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${!selectedCatCode ? 'bg-text text-bg' : 'bg-text/10 text-text/70'}`}
              >
                {t.allCats}
              </button>
              {dbCategories.map(cat => (
                <button 
                  key={cat.code}
                  onClick={() => setSelectedCatCode(cat.code)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${selectedCatCode === cat.code ? 'bg-text text-bg' : 'bg-text/10 text-text/70'}`}
                >
                  {cat[lang] || cat.en}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Grid - Scrollable area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto no-scrollbar p-4 pb-40">
        {displayPhotos.length === 0 ? (                
          <div className="flex flex-col items-center justify-center py-20 text-text/40">
            <p className="text-sm">{t.empty}</p>
          </div>
        ) : (
          <div className={`grid gap-3 ${columnCount === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {visiblePhotos.map((photo, i) => (
              <div 
                key={photo.id}
                onClick={() => {
                  if (selectionMode) {
                    toggleSelect(photo.id);
                  } else {
                    setLightboxIndex(i);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (!selectionMode) setSelectionMode(true);
                  toggleSelect(photo.id);
                }}
                className={`aspect-square bg-white rounded-3xl overflow-hidden cursor-pointer relative shadow-sm group ${selectedPhotos.has(photo.id) ? 'ring-4 ring-accent' : ''}`}
              >
                <img 
                  src={photo.image_url || photo.uri} 
                  alt={photo.name}
                  loading="lazy" 
                  className={`w-full h-full object-cover transition-transform duration-500 ${selectedPhotos.has(photo.id) ? 'scale-90' : 'group-hover:scale-105'}`}
                />

                {photo.groupId && (
                  <div className="absolute top-2 left-10 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-[4px] text-[7px] text-white font-bold flex items-center gap-1 border border-white/20">
                    <Layers size={8} />
                    {photo.groupId}
                  </div>
                )}
                
                {selectedPhotos.has(photo.id) && (
                  <div className="absolute top-2 right-2 bg-accent text-bg rounded-full p-1">
                    <X size={12} />
                  </div>
                )}
                
                {/* Category label */}
                {(() => {
                  const cat = dbCategories.find(c => c.code === photo.category);
                  const catName = cat ? (cat[lang] || cat.en) : photo.category;
                  const isUncategorized = !catName || 
                    ['未分类', '未分類', 'uncategorized', 'Uncategorized', 'others', 'Others'].includes(catName.toLowerCase());
                  
                  if (isUncategorized) return null;
                  
                  return (
                    <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-text/50 to-transparent">
                      <p className="text-bg text-[10px] font-semibold truncate">
                        {catName}
                      </p>
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
        <div ref={observerTarget} className="h-40"></div>
      </div>

      {/* Selection Footer */}
      {selectionMode && (
         <div className="fixed bottom-20 left-0 w-full bg-bg border-t border-text/10 p-4 flex gap-4 shadow-lg z-[300]">
             <button onClick={shareSelected} className="flex-1 bg-text text-bg py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
               <Share2 size={16} /> Share
             </button>
             <button onClick={contactWhatsApp} className="flex-1 bg-[#25D366] text-white py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
               <MessageCircle size={16} /> WhatsApp
             </button>
         </div>
      )}

      {/* Floating Action Buttons (Normal Mode) */}
      {!selectionMode && (
        <div className="fixed bottom-6 left-6 right-6 flex justify-between z-[400]">
            <button 
              onClick={scrollToTop} 
              className="bg-text text-bg p-4 rounded-full shadow-lg transition-all active:scale-95"
            >
              <ArrowUpToLine size={24} />
            </button>
            <button onClick={() => setSelectionMode(true)} className="bg-[#25D366] text-white p-4 rounded-full shadow-lg">
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
              <h2 className="text-2xl font-bold mb-4">{displayPhotos[lightboxIndex].name || '未命名家具'}</h2>
              
              <div className="space-y-6">
                {(() => {
                  const code = displayPhotos[lightboxIndex].category;
                  const cat = dbCategories.find(c => c.code === code);
                  const catName = cat ? (cat[lang] || cat.en) : code;
                  const isUncategorized = !catName || ['未分类', '未分類', 'uncategorized', 'Uncategorized', 'others', 'Others'].includes(catName.toLowerCase());
                  const subCat = (isStaffMode || showExit) ? displayPhotos[lightboxIndex].sub_category : null;

                  if (isUncategorized && !subCat) return null;

                  return (
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t.category}</h3>
                      <div className="flex flex-wrap gap-2">
                        {!isUncategorized && (
                          <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-medium">
                            {catName}
                          </span>
                        )}
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

                {(isStaffMode || showExit) && displayPhotos[lightboxIndex].manual_code && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">手動編號 (Manual ID)</h3>
                    <p className="inline-block bg-slate-800 text-white px-3 py-1 rounded-lg text-sm font-mono tracking-wider shadow-md">
                      {displayPhotos[lightboxIndex].manual_code}
                    </p>
                  </div>
                )}

                {displayPhotos[lightboxIndex].description && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t.description}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {displayPhotos[lightboxIndex].description}
                    </p>
                  </div>
                )}

                {displayPhotos[lightboxIndex].tags && displayPhotos[lightboxIndex].tags.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t.tags}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {displayPhotos[lightboxIndex].tags.map((tag, idx) => (
                        <span key={idx} className="bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded text-xs font-medium">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
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
              
              <div className="space-y-4">
                <input 
                  type="password" 
                  autoFocus
                  placeholder="密鑰..."
                  className={`w-full bg-slate-50 border p-4 rounded-2xl text-center text-lg font-bold outline-none transition-all ${passError ? 'border-red-500 bg-red-50' : 'border-slate-100 focus:bg-white focus:border-blue-500 shadow-sm'}`}
                  value={passInput}
                  onChange={(e) => { setPassInput(e.target.value); setPassError(false); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (passInput === internalPassword) {
                        setIsStaffMode(true);
                        setShowPassPrompt(false);
                        setPassInput('');
                      } else {
                        setPassError(true);
                      }
                    }
                  }}
                />
                {passError && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest animate-bounce">密鑰錯誤</p>}
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setShowPassPrompt(false); setPassInput(''); setPassError(false); }}
                    className="flex-1 py-4 px-4 rounded-2xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    onClick={() => {
                      if (passInput === internalPassword) {
                        setIsStaffMode(true);
                        setShowPassPrompt(false);
                        setPassInput('');
                      } else {
                        setPassError(true);
                      }
                    }}
                    className="flex-1 py-4 px-4 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95"
                  >
                    解鎖
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
