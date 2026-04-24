import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Photo, DB_Category } from '../types';
import { Search, X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PublicGalleryProps {
  photos: Photo[];
  dbCategories: DB_Category[];
  onExit?: () => void;
  showExit?: boolean;
  onLogin?: () => void;
}

const translations = {
  zh: {
    galleryName: '公开相库',
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
    galleryName: 'Public Gallery',
    gallerySub: (count: number) => `${count} photos in total`,
    search: 'Search here...',
    allCats: 'All',
    name: 'Name',
    category: 'Category',
    description: 'Description',
    tags: 'Tags',
    close: 'Close',
    empty: 'No matching photos found',
  },
  ms: {
    galleryName: 'Galeri Awam',
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

export const PublicGallery: React.FC<PublicGalleryProps> = ({ photos, dbCategories, onExit, showExit, onLogin }) => {
  const [lang, setLang] = useState<'zh' | 'en' | 'ms'>('zh');
  const t = translations[lang];

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
      filtered = filtered.filter(p => 
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(q))) ||
        (p.category && p.category.toLowerCase().includes(q))
      );
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
    <div className="flex flex-col min-h-screen bg-transparent w-full">
      {/* Header */}
      <header className="relative z-50 bg-white/10 border-b border-white/20 px-6 pt-10 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{t.galleryName}</h1>
          <p className="text-[10px] text-slate-600 font-medium uppercase tracking-wider">
            {t.gallerySub(photos.length)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!showExit && onLogin && (
            <button 
              onClick={onLogin}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all border bg-white text-slate-800 shadow-sm border-slate-200"
            >
              {lang === 'zh' ? '登入管理' : 'Login'}
            </button>
          )}
          {showExit && onExit && (
            <button 
              onClick={onExit}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all border bg-blue-50 text-blue-600 border-blue-200"
            >
              {lang === 'zh' ? '我的相库' : 'Management'}
            </button>
          )}
          <div className="flex bg-white/40 backdrop-blur-md border border-white/50 rounded-xl overflow-hidden p-0.5 shadow-sm">
            {[
              { id: 'zh', label: '中文' },
              { id: 'en', label: 'EN' },
              { id: 'ms', label: 'BM' }
            ].map(l => (
              <button
                key={l.id}
                onClick={() => setLang(l.id as any)}
                className={`px-3 py-1 text-[10px] font-black tracking-wider transition-all rounded-[9px] ${lang === l.id ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Filter & Search */}
      <div className="p-6 sticky top-0 z-40 bg-white/40 backdrop-blur-xl border-b border-white/50 space-y-4 shadow-sm">
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
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${!selectedCatCode ? 'bg-slate-800 text-white shadow-md' : 'bg-white/60 border-white text-slate-600 hover:bg-white'}`}
          >
            {t.allCats}
          </button>
          {dbCategories.map(cat => (
            <button 
              key={cat.code}
              onClick={() => setSelectedCatCode(cat.code)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${selectedCatCode === cat.code ? 'bg-slate-800 text-white shadow-md' : 'bg-white/60 border-white text-slate-600 hover:bg-white'}`}
            >
              {cat[lang] || cat.en}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="p-6">
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
        <div ref={observerTarget} className="h-10 mt-4 flex items-center justify-center">
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
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t.category}</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-medium">
                      {(() => {
                        const code = displayPhotos[lightboxIndex].category;
                        const cat = dbCategories.find(c => c.code === code);
                        return cat ? (cat[lang] || cat.en) : (code || 'Uncategorized');
                      })()}
                    </span>
                    {displayPhotos[lightboxIndex].sub_category && (
                      <span className="bg-slate-50 text-slate-600 px-3 py-1 rounded-full text-sm font-medium border border-slate-200">
                        {displayPhotos[lightboxIndex].sub_category}
                      </span>
                    )}
                  </div>
                </div>

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
    </div>
  );
};
