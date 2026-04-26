import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Photo, DB_Category, Category, Tag } from '../types';
import { X, Image as ImageIcon, Share2, Layers, ArrowUpToLine, MessageCircle, Trash2, Pencil } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useGalleryContext } from '../context/GalleryContext';
import { PhotoCard } from './PhotoCard';
import { translations, LanguageCode } from '../lib/translations';
import { PhotoLightbox } from './PhotoLightbox';
import { StaffUnlockDialog } from './StaffUnlockDialog';
import { WhatsAppChoiceDialog } from './WhatsAppChoiceDialog';
import { PublicGalleryHeader } from './PublicGalleryHeader';
import { PublicGalleryFilters } from './PublicGalleryFilters';
import { GroupDetailView } from './GroupDetailView';

interface PublicGalleryProps {
  photos: Photo[];
  categories: Category[];
  tags: Tag[];
  manufacturers?: any[];
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
  onBatchEdit?: (ids: string[]) => void;
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
  onExit, onLogin, loginWithGoogle, user, 
  internalPassword, settings, isRefreshing, onRefresh,
  isAdminMode, onEditPhoto, onDeletePhotos, onGroupPhotos, onBatchEdit, onGroupClick, onOpenSettings, onAddPhoto,
  columns: propColumns, setColumns: propSetColumns,
  hideHeader,
}) => {
  const context = useGalleryContext();
  console.log("PublicGallery context:", context);
  const {
    photos,
    categories,
    tags: contextTags,
    dbCategories,
    searchQuery, setSearchQuery,
    filterCatId: selectedCatCode, setFilterCatId: setSelectedCatCode,
    filterSubId: selectedSubId, setFilterSubId: setSelectedSubId,
    filterTagIds: selectedTagIds, setFilterTagIds: setSelectedTagIds,
    sortOrder, setSortOrder,
    showGroupsCollapsed, setShowGroupsCollapsed,
    visibleCount, setVisibleCount,
    selectedIds,
    isMultiSelect, setIsMultiSelect,
    togglePhotoSelection, clearSelection,
    displayPhotos, gridPhotos
  } = context;

  const allTagIds = useMemo(() => {
    const ids = new Set<string>();
    photos.forEach(p => {
       (Array.isArray(p.tagIds) ? p.tagIds : []).forEach(id => ids.add(id));
    });
    return ids;
  }, [photos]);

  const tags = useMemo(() => {
    const tMap = new Map<string, Tag>();
    contextTags.forEach(t => tMap.set(t.id, t));
    allTagIds.forEach(id => {
        if (!tMap.has(id)) {
            tMap.set(id, { id, name: id, aliases: [] });
        }
    });
    
    const uniqueTags = new Map<string, Tag>();
    tMap.forEach(t => {
      // Need a full tag with aliases if we're creating a mock
      if(!uniqueTags.has(t.name.toLowerCase())) {
        uniqueTags.set(t.name.toLowerCase(), t);
      }
    });
    
    // Fill in missing
    allTagIds.forEach(id => {
       if (!uniqueTags.has(id.toLowerCase())) {
         uniqueTags.set(id.toLowerCase(), { id, name: id, aliases: [] });
       }
    });
    return Array.from(uniqueTags.values());
  }, [contextTags, allTagIds]);

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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    photos.forEach(p => {
      const ids = Array.isArray(p.tagIds) ? p.tagIds : [];
      ids.forEach(id => {
        counts[id] = (counts[id] || 0) + 1;
      });
    });
    return counts;
  }, [photos]);

  const sortedTags = useMemo(() => {
    return [...tags].sort((a, b) => {
      return (tagCounts[b.id] || 0) - (tagCounts[a.id] || 0);
    });
  }, [tags, tagCounts]);

  const tagMap = useMemo(() => {
    const map: Record<string, string> = {};
    tags.forEach(t => { map[t.id] = t.name; });
    return map;
  }, [tags]);

  const toggleSortOrder = useCallback(() => {
    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
  }, [sortOrder, setSortOrder]);

  const observerTarget = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < displayPhotos.length) {
          setVisibleCount(prev => prev + 12);
        }
      },
      { threshold: 0.1 }
    );
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    return () => {
      if (observerTarget.current) observer.disconnect();
    };
  }, [displayPhotos.length, visibleCount, setVisibleCount]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
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

  const getShareMessage = (p: Photo) => {
    const displayName = getPhotoDisplayName(p);
    const modelStr = p.model_number ? ` (${p.model_number})` : '';
    const manualCodeStr = p.manual_code ? ` [${p.manual_code}]` : '';
    const suffix = isStaffMode ? manualCodeStr : modelStr;
    const photoUrl = p.image_url || p.uri || '';

    if (lang === 'ms') {
      return `Halo, saya berminat dengan perabot ini:\n\n${displayName}${suffix}\n\nFoto: ${photoUrl}\n\nLihat lagi: photo-x-one.vercel.app`;
    } else if (lang === 'en') {
      return `Hello, I'm interested in this furniture:\n\n${displayName}${suffix}\n\nPhoto: ${photoUrl}\n\nView more: photo-x-one.vercel.app`;
    } else {
      return `你好，我对这个家具有兴趣：\n\n${displayName}${suffix}\n\n照片: ${photoUrl}\n\n查看更多：photo-x-one.vercel.app`;
    }
  };

  const shareSinglePhoto = async (photo: Photo) => {
    const msg = getShareMessage(photo);
    if (navigator.share) {
      try {
        await navigator.share({
          title: photo.name || t.furnitureRecord,
          text: msg,
        });
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.error('Share err:', e);
        }
      }
    } else {
      setShowWhatsAppChoice(true);
      (window as any)._pendingPhoto = photo;
    }
  };

  const openWhatsApp = (num: string, photo?: Photo) => {
    let msg = '';
    if (photo) {
      msg = getShareMessage(photo);
    } else {
      if (lang === 'ms') msg = `Halo, saya ingin bertanya tentang maklumat perabot.`;
      else if (lang === 'en') msg = `Hello, I'd like to inquire about furniture information.`;
      else msg = `你好，我想咨询家具信息。`;
    }

    if (!num) return;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
    setShowWhatsAppChoice(false);
  };

  const startLongPress = (photoId: string) => {
    if (!isAdminMode) return;
    console.log("Long press attempt started for:", photoId);
    const timer = setTimeout(() => {
      console.log("Long press triggered for:", photoId);
      if (onEditPhoto) onEditPhoto(photoId);
      if ('vibrate' in navigator) navigator.vibrate(50);
      setLongPressTimer(null);
    }, 400) as unknown as NodeJS.Timeout;
    setLongPressTimer(timer);
  };

  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
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
        <PublicGalleryHeader 
          settings={settings}
          photos={photos}
          isAdminMode={!!isAdminMode}
          isRefreshing={!!isRefreshing}
          isMultiSelect={!!isMultiSelect}
          lang={lang}
          t={t}
          onHeaderClick={handleHeaderClick}
          onRefresh={onRefresh!}
          onToggleMultiSelect={() => setIsMultiSelect(!isMultiSelect)}
          onAddPhoto={onAddPhoto!}
          onSetLang={(l) => setLang(l)}
          onExit={() => onExit ? onExit() : navigate('/admin')}
          onLogin={onLogin}
          onOpenSettings={onOpenSettings}
        />
      )}

      {/* Filter & Search */}
      <PublicGalleryFilters 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortOrder={sortOrder}
        toggleSortOrder={toggleSortOrder}
        columns={columns}
        setColumns={setColumns}
        showGroupsCollapsed={showGroupsCollapsed}
        setShowGroupsCollapsed={setShowGroupsCollapsed}
        dbCategories={dbCategories}
        categories={categories}
        selectedCatCode={selectedCatCode}
        setSelectedCatCode={setSelectedCatCode}
        selectedSubId={selectedSubId}
        setSelectedSubId={setSelectedSubId}
        selectedTagIds={selectedTagIds}
        setSelectedTagIds={setSelectedTagIds}
        sortedTags={sortedTags}
        lang={lang}
        t={t}
      />

      {/* Grid */}
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
              <PhotoCard 
                key={photo.id}
                photo={photo}
                index={i}
                isAdminMode={!!isAdminMode}
                isMultiSelect={isMultiSelect}
                isStaffMode={isStaffMode}
                isSelected={selectedIds.includes(photo.id)}
                showGroupsCollapsed={showGroupsCollapsed}
                lang={lang}
                t={t}
                dbCategories={dbCategories}
                tagMap={tagMap}
                onToggleSelection={togglePhotoSelection}
                onEditPhoto={onEditPhoto}
                onGroupClick={(groupId) => {
                  if (onGroupClick) onGroupClick(groupId);
                  else setActiveGroupId(groupId);
                }}
                onLightboxOpen={() => {
                  const realIndex = displayPhotos.findIndex(p => p.id === photo.id);
                  if (realIndex !== -1) setLightboxIndex(realIndex);
                }}
                onLongPressStart={startLongPress}
                onLongPressEnd={endLongPress}
                shareSinglePhoto={shareSinglePhoto}
              />
            ))}
          </div>
        )}
        <div ref={observerTarget} className="h-40"></div>
      </div>

      {/* Admin Bulk Actions */}
      {isAdminMode && selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-3 bg-[#1D3557] px-5 py-3 rounded-2xl shadow-2xl border border-white/10 animate-in fade-in slide-in-from-bottom-5 duration-300">
           <div className="bg-white/10 px-2 py-1 rounded-lg">
             <span className="text-xs font-black text-white">{selectedIds.length}</span>
           </div>
           <div className="flex items-center gap-2">
             <button onClick={() => onGroupPhotos?.(selectedIds)} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white transition-all active:scale-95 border border-white/10" title={t.merge}><Layers size={18} /></button>
             <button onClick={() => onBatchEdit?.(selectedIds)} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white transition-all active:scale-95 border border-white/10" title="统一编辑"><Pencil size={18} /></button>
             <button onClick={() => window.confirm(t.confirmDelete(selectedIds.length)) && onDeletePhotos?.(selectedIds)} className="w-10 h-10 bg-red-500/20 hover:bg-red-500/30 rounded-xl flex items-center justify-center text-red-400 transition-all active:scale-95 border border-red-500/20" title={t.delete}><Trash2 size={18} /></button>
             <button onClick={() => {
               const filtered = Array.isArray(photos) ? photos.filter(p => selectedIds.includes(p.id)) : [];
               const text = filtered.map(p => p.name || t.furniture).join(', ');
               navigator.share ? navigator.share({ title: t.shareTitle, text: t.shareMsgCount(selectedIds.length, text), url: window.location.origin }) : alert(t.shareNotSupported);
             }} className="w-10 h-10 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 transition-all active:scale-95 border border-blue-500/20" title={t.share}><Share2 size={18} /></button>
           </div>
           <div className="w-px h-6 bg-white/10 mx-1" />
           <button onClick={clearSelection} className="p-2 text-white/40 hover:text-white transition-colors"><X size={18} /></button>
        </div>
      )}

      {/* Floating Action Buttons */}
      {lightboxIndex === null && !isAdminMode && (
        <div className="fixed bottom-6 left-6 right-6 flex justify-between z-[400]">
            <button onClick={scrollToTop} className="bg-[#1D3557] text-[#FDFAF6] p-4 rounded-full shadow-lg transition-all active:scale-95 border border-[#1D3557]/10"><ArrowUpToLine size={24} /></button>
            <button onClick={() => setShowWhatsAppChoice(true)} className="bg-[#25D366] text-white p-4 rounded-full shadow-lg"><MessageCircle size={24} /></button>
        </div>
      )}

      {/* Group Detail View */}
      <GroupDetailView 
        activeGroupId={activeGroupId}
        setActiveGroupId={setActiveGroupId}
        photos={photos}
        displayPhotos={displayPhotos}
        setLightboxIndex={setLightboxIndex}
        isAdminMode={!!isAdminMode}
        onEditPhoto={onEditPhoto}
        onLongPressStart={startLongPress}
        onLongPressEnd={endLongPress}
      />

      {/* Dialogs */}
      <AnimatePresence>
        {showPassPrompt && (
          <StaffUnlockDialog 
            isOpen={showPassPrompt}
            onClose={() => { setShowPassPrompt(false); setPassInput(''); setPassError(false); }}
            passInput={passInput}
            setPassInput={setPassInput}
            passError={passError}
            t={t}
            loginWithGoogle={loginWithGoogle}
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
          />
        )}
      </AnimatePresence>

      <PhotoLightbox 
        photo={lightboxIndex !== null ? displayPhotos[lightboxIndex] : null}
        displayPhotos={displayPhotos}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onPrev={(e) => {
          e?.stopPropagation();
          setLightboxIndex(prev => prev! > 0 ? prev! - 1 : displayPhotos.length - 1);
        }}
        onNext={(e) => {
          e?.stopPropagation();
          setLightboxIndex(prev => prev! < displayPhotos.length - 1 ? prev! + 1 : 0);
        }}
        t={t}
        lang={lang}
        dbCategories={dbCategories}
        isAdminMode={!!isAdminMode}
        isStaffMode={isStaffMode}
        contactWhatsApp={() => setShowWhatsAppChoice(true)}
        shareSinglePhoto={shareSinglePhoto}
      />

      <WhatsAppChoiceDialog 
        isOpen={showWhatsAppChoice}
        onClose={() => setShowWhatsAppChoice(false)}
        settings={settings}
        t={t}
        onSelect={(num) => openWhatsApp(num, (window as any)._pendingPhoto)}
      />
    </div>
  );
};
