import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { updatePhotoHidden } from '../services/supabaseService';
import { Photo, Category, Tag } from '../types';
import { X, Image as ImageIcon, Share2, Layers, ArrowUpToLine, MessageCircle, Trash2, Pencil } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { VirtuosoGrid } from 'react-virtuoso';
import { useGalleryContext } from '../context/GalleryContext';
import { PhotoCard } from './PhotoCard';
import { translations, LanguageCode } from '../lib/translations';
import { PhotoLightbox } from './PhotoLightbox';
import { StaffUnlockDialog } from './StaffUnlockDialog';
import { WhatsAppChoiceDialog } from './WhatsAppChoiceDialog';
import { PublicGalleryHeader } from './PublicGalleryHeader';
import { PublicGalleryFilters } from './PublicGalleryFilters';
import { GroupDetailView } from './GroupDetailView';
import { useOptionalAdminSession, useOptionalAdminPhoto, useOptionalAdminUI } from '../context/AdminContexts';

interface PublicGalleryProps {
  photos: Photo[];
  categories: Category[];
  tags: Tag[];
  manufacturers?: any[];
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
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const MemoizedPhotoCard = React.memo(({ index, photo, isAdminMode, isMultiSelect, isStaffMode, isSelected, showGroupsCollapsed, lang, t, categories, manufacturers, tagMap, onToggleSelection, onEditPhoto, onGroupClick, onLightboxOpen, onLongPressStart, onLongPressEnd, shareSinglePhoto, displayPhotos, gridPhotos }: any) => {
  const handleOpenLightbox = useCallback(() => {
    const realIndex = displayPhotos.findIndex((p: any) => p.id === gridPhotos[index].id);
    if (realIndex !== -1) onLightboxOpen(realIndex);
  }, [index, displayPhotos, gridPhotos, onLightboxOpen]);

  return (
    <PhotoCard 
      photo={photo}
      index={index}
      isAdminMode={isAdminMode}
      isMultiSelect={isMultiSelect}
      isStaffMode={isStaffMode}
      isSelected={isSelected}
      showGroupsCollapsed={showGroupsCollapsed}
      lang={lang}
      t={t}
      categories={categories}
      manufacturers={manufacturers}
      tagMap={tagMap}
      onToggleSelection={onToggleSelection}
      onEditPhoto={onEditPhoto}
      onGroupClick={onGroupClick}
      onLightboxOpen={handleOpenLightbox}
      onLongPressStart={onLongPressStart}
      onLongPressEnd={onLongPressEnd}
      shareSinglePhoto={shareSinglePhoto}
    />
  );
});
MemoizedPhotoCard.displayName = 'MemoizedPhotoCard';

export const PublicGallery: React.FC<PublicGalleryProps> = ({ 
  onExit, onLogin, loginWithGoogle: propsLoginWithGoogle, 
  onRefresh,
  onEditPhoto, onDeletePhotos, onGroupPhotos, onBatchEdit, onGroupClick, onOpenSettings, onAddPhoto,
  columns: propColumns, setColumns: propSetColumns,
  hideHeader,
  user: propsUser,
  isAdminMode: propsIsAdminMode,
  settings: propsSettings,
  isRefreshing: propsIsRefreshing,
  onLoadMore,
  hasMore
}) => {
  const adminSession = useOptionalAdminSession();
  const adminPhoto = useOptionalAdminPhoto();
  const adminUI = useOptionalAdminUI();
  const user = propsUser !== undefined ? propsUser : adminSession?.user;
  const isAdminMode = propsIsAdminMode !== undefined ? propsIsAdminMode : !!adminSession?.isAdminMode;
  const settings = propsSettings !== undefined ? propsSettings : adminSession?.settings;
  const loginWithGoogle = propsLoginWithGoogle || adminSession?.loginWithGoogle;
  const isSyncing = adminSession?.isSyncing || propsIsRefreshing;
  
  const internalPassword = settings?.access_passcode;

  const context = useGalleryContext();
  const {
    photos,
    categories,
    manufacturers,
    tags: contextTags,
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
    
    return Array.from(tMap.values());
  }, [contextTags, allTagIds]);

  const [lang, setLang] = useState<LanguageCode>(() => {
    return (localStorage.getItem('appLang') as LanguageCode) || 'en';
  });
  const t = useMemo(() => translations[lang] || translations['en'], [lang]);
  
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
    tags.forEach(t => { map[String(t.id)] = t.name; });
    return map;
  }, [tags]);

  const toggleSortOrder = useCallback(() => {
    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
  }, [sortOrder, setSortOrder]);

  const virtuosoRef = useRef<any>(null);

  const scrollToTop = () => {
    virtuosoRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  };

  useEffect(() => {
    scrollToTop();
  }, [selectedCatCode, selectedSubId, selectedTagIds]);

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
    
    const catId = (p.categoryId || '').trim();
    
    // Try new system
    const activeCat = categories.find(c => String(c.id) === String(catId));
    if (activeCat) {
      if (lang === 'zh') return activeCat.zh || activeCat.name;
      if (lang === 'ms') return activeCat.ms || activeCat.name || activeCat.en || activeCat.zh;
      return activeCat.en || activeCat.name || activeCat.zh;
    }

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
    const timer = setTimeout(() => {
      if ('vibrate' in navigator) navigator.vibrate(50);
      if (isAdminMode) {
        setIsMultiSelect(true);
        togglePhotoSelection(photoId);
      }
      setLongPressTimer(null);
    }, 800);
    setLongPressTimer(timer);
  };

  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const endLongPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const shareSinglePhoto = useCallback(async (photo: Photo) => {
    const msg = getShareMessage(photo);
    try {
      if (navigator.share) {
        await navigator.share({ title: t.shareTitle, text: msg, url: window.location.origin });
      } else {
        alert(t.shareNotSupported);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error("Share failed:", e);
      }
    }
  }, [t.shareTitle, t.shareNotSupported]);

  return (
    <div className="flex flex-col h-full bg-bg w-full overflow-hidden text-text">
      {/* Header */}
      {lightboxIndex === null && !hideHeader && (
        <PublicGalleryHeader 
          settings={settings}
          photos={photos}
          isAdminMode={!!isAdminMode}
          isRefreshing={!!isSyncing}
          isMultiSelect={!!isMultiSelect}
          lang={lang}
          t={t}
          onHeaderClick={handleHeaderClick}
          onRefresh={onRefresh!}
          onToggleMultiSelect={() => setIsMultiSelect(!isMultiSelect)}
          clearSelection={clearSelection}
          setIsMultiSelect={setIsMultiSelect}
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
        onScrollToTop={scrollToTop}
      />

      {/* Grid */}
      <div ref={virtuosoRef} className="flex-1 overflow-hidden bg-[#FDFAF6]">
        {displayPhotos.length === 0 ? (                
          <div className="flex flex-col items-center justify-center py-20 text-[#1D3557]/20">
            <div className="w-16 h-16 bg-white/40 rounded-full flex items-center justify-center mb-4 border border-white shadow-sm">
                <ImageIcon size={32} className="opacity-20" />
            </div>
            <p className="text-xs font-black uppercase tracking-widest">{t.empty}</p>
          </div>
        ) : (
          <VirtuosoGrid
            ref={virtuosoRef}
            style={{ height: '100%', width: '100%' }}
            totalCount={gridPhotos.length}
            endReached={onLoadMore}
            overscan={600}
            listClassName={`grid gap-3 p-2 pb-40 ${columns === 2 ? 'grid-cols-2' : columns === 3 ? 'grid-cols-3' : 'grid-cols-5'}`}
            itemContent={(index) => (
              <MemoizedPhotoCard
                key={index}
                index={index}
                photo={gridPhotos[index]}
                isAdminMode={!!isAdminMode}
                isMultiSelect={isMultiSelect}
                isStaffMode={isStaffMode}
                isSelected={!!selectedIds.includes(gridPhotos[index].id)}
                showGroupsCollapsed={showGroupsCollapsed}
                lang={lang}
                t={t}
                categories={categories}
                manufacturers={manufacturers}
                tagMap={tagMap}
                onToggleSelection={togglePhotoSelection}
                onEditPhoto={onEditPhoto}
                onGroupClick={onGroupClick || setActiveGroupId}
                onLightboxOpen={setLightboxIndex}
                onLongPressStart={startLongPress}
                onLongPressEnd={endLongPress}
                shareSinglePhoto={shareSinglePhoto}
                displayPhotos={displayPhotos}
                gridPhotos={gridPhotos}
              />
            )}
          />
        )}
      </div>

      {/* Floating Action Buttons */}
      {lightboxIndex === null && !isAdminMode && (
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-[400]">
            <button onClick={scrollToTop} className="bg-[#1D3557] text-[#FDFAF6] p-3 rounded-full shadow-lg transition-all active:scale-95 border border-[#1D3557]/10"><ArrowUpToLine size={20} /></button>
            <button onClick={() => setShowWhatsAppChoice(true)} className="bg-[#25D366] text-white p-3 rounded-full shadow-lg"><MessageCircle size={20} /></button>
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
        onEditPhoto={onEditPhoto ? (p) => onEditPhoto(p.id) : undefined}
        onLongPressStart={isAdminMode ? startLongPress : undefined}
        onLongPressEnd={isAdminMode ? endLongPress : undefined}
        onBatchEdit={(ids) => {
          setActiveGroupId(null);
          if (onBatchEdit) onBatchEdit(ids);
          else if (adminUI) adminUI.setBatchEditIds(ids);
        }}
        onUngroup={onGroupPhotos} 
        onAddPhotoToGroup={onAddPhoto}
        onAiAnalyze={(p) => adminPhoto?.handleSingleAiAnalyze(p.uri!, p.categoryId || undefined)}
        onCancelAnalyze={() => adminUI?.abortAnalysis()}
        isAnalyzing={adminUI?.loadingState === 'analyzing'}
        onBatchAiAnalyze={(photos) => adminPhoto?.handleGroupAiIdentify(photos)}
        setPhotos={context.setPhotos}
        lang={lang}
        t={t}
        categories={categories}
        tagMap={tagMap}
        isMultiSelect={isMultiSelect}
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
        categories={categories}
        manufacturers={context.manufacturers}
        tagMap={tagMap}
        isAdminMode={!!isAdminMode}
        isStaffMode={isStaffMode}
        onAiAnalyze={async (photo) => await adminPhoto?.handleSingleAiAnalyze(photo.uri!, photo.categoryId || undefined)}
        onCancelAnalyze={() => adminUI?.abortAnalysis()}
        isAnalyzing={adminUI?.loadingState === 'analyzing'}
        contactWhatsApp={() => setShowWhatsAppChoice(true)}
        onUngroup={async (id) => {
          if (onGroupPhotos) onGroupPhotos([id]);
          setLightboxIndex(null);
        }}
        onSetGroupCover={async (id, groupId) => {
          // logic
        }}
        onEditPhoto={(photo) => {
           setLightboxIndex(null);
           if (onEditPhoto) onEditPhoto(photo.id);
        }}
        onToggleHidden={async (photo) => {
           const newStatus = !photo.isHidden;
           try {
             await updatePhotoHidden(photo.id, newStatus);
             context.setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, isHidden: newStatus } : p));
           } catch (e) {
             console.error("[ERROR] Failed to toggle hidden:", e);
           }
        }}
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
