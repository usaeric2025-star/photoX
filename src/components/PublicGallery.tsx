import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Photo, DB_Category } from '../types';
import { Search, X, ChevronLeft, ChevronRight, Image as ImageIcon, Lock, Unlock, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PublicGalleryProps {
  photos: Photo[];
  dbCategories: DB_Category[];
  onExit?: () => void;
  showExit?: boolean;
  onLogin?: () => void;
  internalPassword?: string;
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

export const PublicGallery: React.FC<PublicGalleryProps> = ({ photos, dbCategories, onExit, showExit, onLogin, internalPassword }) => {
  const [lang, setLang] = useState<'zh' | 'en' | 'ms'>('zh');
  const t = translations[lang];

  const [isStaffMode, setIsStaffMode] = useState(false);
  const [showPassPrompt, setShowPassPrompt] = useState(false);
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatCode, setSelectedCatCode] = useState<string | null>(null);
  
  const [visibleCount, setVisibleCount] = useState(20);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const displayPhotos = useMemo(() => {
    let filtered = photos;
    if (selectedCatCode) {
      filtered = filtered.filter(p => p.category === selectedCatCode);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => {
        // Build a searchable string from all possible fields and languages
        const searchableText = [
          p.name,
          p.description,
          ...(p.tags || []),
          // Find category name(s)
          dbCategories.find(c => c.code === p.category)?.zh || '',
          dbCategories.find(c => c.code === p.category)?.en || '',
          dbCategories.find(c => c.code === p.category)?.ms || ''
        ].filter(Boolean).join(' ').toLowerCase();

        return searchableText.includes(q);
      });
    }
    return filtered;
  }, [photos, selectedCatCode, searchQuery]);

  const visiblePhotos = useMemo(() => displayPhotos.slice(0, visibleCount), [displayPhotos, visibleCount]);

  // Observer for lazy loading
  const observerTarget = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => Math.min(prev + 20, displayPhotos.length));
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

  // Lightbox navigation
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
    <div className="flex flex-col h-screen bg-transparent w-full overflow-hidden">
      {/* Header */}
      <header className="shrink-0 relative z-50 bg-white/10 border-b border-white/20 px-6 pt-10 pb-4 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight truncate leading-tight">{t.galleryName}</h1>
          <p className="text-[10px] text-slate-600 font-medium uppercase tracking-wider truncate">
            {t.gallerySub(photos.length)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {internalPassword && (
            <button 
              onClick={() => isStaffMode ? setIsStaffMode(false) : setShowPassPrompt(true)}
              className={`p-2 rounded-xl border transition-all ${isStaffMode ? 'bg-orange-50 border-orange-200 text-orange-600 shadow-inner' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'}`}
              title={isStaffMode ? '退出員工模式' : '員工模式登入'}
            >
              {isStaffMode ? <Unlock size={18} /> : <Lock size={18} />}
            </button>
          )}
          {!showExit && onLogin && (
            <button 
              onClick={onLogin}
              className="px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border bg-white text-slate-800 shadow-sm border-slate-200 whitespace-nowrap"
            >
              {lang === 'zh' ? '登入管理' : 'Login'}
            </button>
          )}
          {showExit && onExit && (
            <button 
              onClick={onExit}
              className="px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border bg-blue-50 text-blue-600 border-blue-200 whitespace-nowrap"
            >
              {lang === 'zh' ? '我的相库' : 'Back'}
            </button>
          )}
          {(!isStaffMode && !showExit) && (
          <div className="flex bg-white/40 backdrop-blur-md border border-white/50 rounded-xl overflow-hidden p-0.5 shadow-sm ml-1 shrink-0">
            {[
              { id: 'zh', label: '中文' },
              { id: 'en', label: 'EN' },
              { id: 'ms', label: 'BM' }
            ].map(l => (
              <button
                key={l.id}
                onClick={() => setLang(l.id as any)}
                className={`w-9 py-1 text-[10px] font-black tracking-wider transition-all rounded-[9px] flex items-center justify-center shrink-0 ${lang === l.id ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {l.label}
              </button>
            ))}
          </div>
        )}
        </div>
      </header>

      {/* Filter & Search */}
      <div className="shrink-0 p-6 z-40 bg-white/40 backdrop-blur-xl border-b border-white/50 space-y-4 shadow-sm">
        <div className="relative">
          <input 
            type="text" 
            placeholder={t.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-10 pr-4 text-sm font-medium text-slate-700 shadow-inner placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          )}
        </div>
        <div className="flex items-center overflow-x-auto no-scrollbar gap-2 pb-1 -mx-2 px-2">
          <button 
            onClick={() => setSelectedCatCode(null)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex-shrink-0 ${!selectedCatCode ? 'bg-slate-800 text-white shadow-md' : 'bg-white/60 border-white text-slate-600 hover:bg-white'}`}
          >
            {t.allCats}
          </button>
          {dbCategories.map(cat => (
            <button 
              key={cat.code}
              onClick={() => setSelectedCatCode(cat.code)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex-shrink-0 ${selectedCatCode === cat.code ? 'bg-slate-800 text-white shadow-md' : 'bg-white/60 border-white text-slate-600 hover:bg-white'}`}
            >
              {cat[lang] || cat.en}
            </button>
          ))}
        </div>
      </div>

      {/* Grid - Scrollable area */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6">
        {displayPhotos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <ImageIcon size={48} className="mb-4 opacity-50" />
            <p className="font-medium text-sm">{t.empty}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {visiblePhotos.map((photo, i) => (
              <div 
                key={photo.id}
                onClick={() => setLightboxIndex(i)}
                className="aspect-square bg-slate-200 rounded-2xl overflow-hidden cursor-pointer relative group"
              >
                <img 
                  src={photo.image_url || photo.uri} 
                  alt={photo.name}
                  loading="lazy" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 md:p-3">
                  <p className="text-white text-[10px] md:text-xs font-bold truncate">{photo.name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={observerTarget} className="h-20 mt-4 flex items-center justify-center">
            {visibleCount < displayPhotos.length && (
              <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-500 justify-center rounded-full animate-spin"></div>
            )}
        </div>
      </div>

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
