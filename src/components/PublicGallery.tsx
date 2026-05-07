import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Photo, Category, Tag, Manufacturer, AppSettings, User } from '../types';
import { X, ImageIcon, Share2, Layers, ArrowUpToLine, MessageCircle } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { VirtuosoGrid } from 'react-virtuoso';
import { useGalleryContext } from '../context/GalleryContext';
import { PAGINATION } from '../constants/config';
import { PhotoCard } from './PhotoCard';
import { translations, LanguageCode } from '../lib/translations';
import { PhotoLightbox } from './PhotoLightbox';
import { StaffUnlockDialog } from './StaffUnlockDialog';
import { WhatsAppChoiceDialog } from './WhatsAppChoiceDialog';
import { PublicGalleryHeader } from './PublicGalleryHeader';
import { PublicGalleryFilters } from './PublicGalleryFilters';
import { GroupDetailView } from './GroupDetailView';
import { getTranslatedCategoryName, getPhotoDisplayName } from '../lib/ui-helpers';
import { safeArray } from '../lib/utils';

interface PublicGalleryProps {
  photos: Photo[];
  categories: Category[];
  tags: Tag[];
  manufacturers?: Manufacturer[];
  onExit?: () => void;
  showExit?: boolean;
  onLogin?: () => void;
  loginWithGoogle?: () => Promise<any>;
  internalPassword?: string;
  settings?: AppSettings;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  user?: User | null;
  isAdminMode?: boolean;
  isStaffMode?: boolean;
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
  onAiAnalyze?: (photo: Photo) => Promise<any>;
  onBatchAiAnalyze?: (photos: Photo[]) => void;
  onCancelAnalyze?: () => void;
  isAnalyzing?: boolean;
  onSetGroupCover?: (id: string, groupId: string) => Promise<void>;
  setAlertDialog?: (d: { title: string, message: string }) => void;
  totalCount?: number;
  onTogglePinned?: (photo: Photo) => void;
  onSecretTrigger?: () => void;
}

const MemoizedPhotoCard = React.memo(({ 
  index, photo, isAdminMode, isMultiSelect, isStaffMode, isSelected, showGroupsCollapsed, 
  lang, t, categories, manufacturers, tagMap, onToggleSelection, onEditPhoto, onGroupClick, 
  onLightboxOpen, onLongPressStart, onLongPressEnd, shareSinglePhoto, displayPhotos, 
  gridPhotos, onTogglePinned 
}: {
  index: number;
  photo: Photo;
  isAdminMode: boolean;
  isMultiSelect: boolean;
  isStaffMode: boolean;
  isSelected: boolean;
  showGroupsCollapsed: boolean;
  lang: string;
  t: any;
  categories: Category[];
  manufacturers: Manufacturer[];
  tagMap: Record<string, string>;
  onToggleSelection?: (id: string) => void;
  onEditPhoto?: (id: string) => void;
  onGroupClick?: (groupId: string) => void;
  onLightboxOpen: (index: number) => void;
  onLongPressStart: (id: string) => void;
  onLongPressEnd: () => void;
  shareSinglePhoto: (photo: Photo) => void;
  displayPhotos: Photo[];
  gridPhotos: Photo[];
  onTogglePinned?: (photo: Photo) => void;
}) => {
  const handleOpenLightbox = useCallback(() => {
    const target = gridPhotos[index];
    if (!target) return;
    const realIndex = displayPhotos.findIndex((p: Photo) => p?.id === target.id);
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
      onTogglePinned={onTogglePinned}
    />
  );
});
MemoizedPhotoCard.displayName = 'MemoizedPhotoCard';

const SkeletonCard = () => (
  <div className="aspect-square bg-slate-200 rounded-2xl animate-pulse" />
);

const SkeletonGrid = ({ count, columns }: { count: number, columns: number }) => (
  <div className={`grid gap-3 p-2 ${columns === 2 ? 'grid-cols-2' : columns === 3 ? 'grid-cols-3' : 'grid-cols-5'}`}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export const PublicGallery: React.FC<PublicGalleryProps> = ({ 
  onExit, onLogin, loginWithGoogle: propsLoginWithGoogle, 
  onRefresh,
  onEditPhoto, onDeletePhotos, onGroupPhotos, onBatchEdit, onGroupClick, onOpenSettings, onAddPhoto,
  columns: propColumns, setColumns: propSetColumns,
  hideHeader,
  user: propsUser,
  isAdminMode = false,
  settings: propsSettings,
  isRefreshing: propsIsRefreshing,
  onLoadMore,
  hasMore,
  selectedIds = [],
  isMultiSelect = false,
  onToggleSelection,
  onClearSelection,
  onToggleMultiSelect,
  onAiAnalyze,
  onBatchAiAnalyze,
  onCancelAnalyze,
  isAnalyzing,
  onSetGroupCover,
  setAlertDialog: propsSetAlertDialog,
  totalCount,
  onTogglePinned,
  onSecretTrigger
}) => {
  const user = propsUser;
  const settings = propsSettings;
  const loginWithGoogle = propsLoginWithGoogle;
  const isSyncing = propsIsRefreshing;
  
  const internalPassword = settings?.access_passcode;

  const context = useGalleryContext();
  const {
    photos,
    categories,
    manufacturers,
    tags: contextTags,
    sortedTags,
    searchQuery, setSearchQuery,
    filterCatId: selectedCatCode, setFilterCatId: setSelectedCatCode,
    filterSubId: selectedSubId, setFilterSubId: setSelectedSubId,
    filterTagIds: selectedTagIds, setFilterTagIds: setSelectedTagIds,
    sortOrder, setSortOrder,
    showGroupsCollapsed, setShowGroupsCollapsed,
    visibleCount, setVisibleCount,
    isInfiniteMode, isStaffMode, setIsStaffMode,
    displayPhotos, gridPhotos,
    totalGridCount
  } = context;
  
  // Use passed in selection state if provided (for AdminGalleryShell), otherwise use context
  const activeSelectedIds = selectedIds.length > 0 || isMultiSelect ? selectedIds : context.selectedIds;
  const activeIsMultiSelect = isMultiSelect || context.isMultiSelect;
  const activeToggleSelection = onToggleSelection || context.togglePhotoSelection;
  const activeClearSelection = onClearSelection || context.clearSelection;
  const activeSetIsMultiSelect = onToggleMultiSelect || context.setIsMultiSelect;

  const setAlertDialog = propsSetAlertDialog || ((d: { title: string, message: string }) => alert(d.message || d.title));

  // Handle infinite mode
  useEffect(() => {
    if ((isAdminMode || isStaffMode) && isInfiniteMode) {
      setVisibleCount(PAGINATION.INFINITE_MODE_COUNT);
    } else if (isAdminMode || isStaffMode) {
      // In admin/staff mode but not infinite, ensure we have a reasonable starting point
      setVisibleCount(prev => prev < PAGINATION.LAZY_LOAD_COUNT ? PAGINATION.LAZY_LOAD_COUNT : prev);
    }
  }, [isAdminMode, isStaffMode, isInfiniteMode, setVisibleCount]);

  const allTagIds = useMemo(() => {
    const ids = new Set<string>();
    const safePhotos = safeArray<Photo>(photos);
    safePhotos.forEach(p => {
       safeArray<string>(p.tagIds).forEach(id => ids.add(id));
    });
    return ids;
  }, [photos]);

  const tags = useMemo(() => {
    const tMap = new Map<string, Tag>();
    safeArray(contextTags).forEach(t => tMap.set(t.id, t));
    
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

  const [showPassPrompt, setShowPassPrompt] = useState(false);
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState(false);

  const [internalColumns, setInternalColumns] = useState<2 | 3 | 5>(3);
  const columns = propColumns || internalColumns;
  const setColumns = propSetColumns || setInternalColumns;
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const tagMap = useMemo(() => {
    const map: Record<string, string> = {};
    safeArray(tags).forEach(t => { map[String(t.id)] = t.name; });
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

  const handleLoginClick = () => {
    if (!isAdminMode && !user) {
      setShowPassPrompt(true);
    } else if (onExit) {
      onExit();
    } else {
      navigate('/admin');
    }
  };

  const [showWhatsAppChoice, setShowWhatsAppChoice] = useState(false);

  const getShareMessage = (p: Photo) => {
    const displayName = getPhotoDisplayName(p, categories, lang, t);
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
        activeSetIsMultiSelect(true);
        activeToggleSelection(photoId);
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
        // Fallback alert is handled by the component or set via prop?
        // We'll keep it simple for public view
        alert(t.shareNotSupported);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error("Share failed:", e);
      }
    }
  }, [t.shareTitle, t.shareNotSupported]);

  const shareGroup = useCallback(async (photos: Photo[]) => {
    const safePhotos = safeArray(photos).filter(p => !!p);
    const msg = safePhotos.map(p => p.name || 'Furniture').join(', ');
    const shareText = `${t.sharePrompt}\n\n${t.shareTitle}: ${msg}\n\nView more: ${window.location.origin}`;
    
    try {
      if (navigator.share) {
        await navigator.share({ title: t.shareTitle, text: shareText, url: window.location.origin });
      } else {
        alert(t.shareNotSupported);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error("Group share failed:", e);
      }
    }
  }, [t]);

  const handleLoadMore = useCallback(() => {
    if (onLoadMore) {
      onLoadMore();
    } else if (!isInfiniteMode && visibleCount < totalGridCount) {
      setVisibleCount(prev => prev + PAGINATION.LAZY_LOAD_COUNT);
    }
  }, [onLoadMore, isInfiniteMode, setVisibleCount, visibleCount, totalGridCount]);

  const prevPhotosRef = useRef<any[]>([]);
  useEffect(() => {
    if (!isSyncing) {
      prevPhotosRef.current = gridPhotos;
    }
  }, [gridPhotos, isSyncing]);

  const photosToShow = isSyncing && safeArray(gridPhotos).length === 0
    ? prevPhotosRef.current
    : gridPhotos;

  const safePhotosToShow = safeArray(photosToShow);

  return (
    <div className="flex flex-col h-full bg-bg w-full overflow-hidden text-text">
      {/* Header */}
      {lightboxIndex === null && !hideHeader && (
        <PublicGalleryHeader 
          totalCount={totalCount}
          settings={settings}
          photos={photos}
          isAdminMode={!!isAdminMode}
          isRefreshing={!!isSyncing}
          isMultiSelect={!!activeIsMultiSelect}
          lang={lang}
          t={t}
          onHeaderClick={() => {}}
          onRefresh={onRefresh!}
          onToggleMultiSelect={() => activeSetIsMultiSelect(!activeIsMultiSelect)}
          clearSelection={activeClearSelection}
          setIsMultiSelect={activeSetIsMultiSelect}
          onAddPhoto={onAddPhoto!}
          onSetLang={(l) => setLang(l)}
          onExit={handleLoginClick}
          onLogin={onLogin}
          onOpenSettings={onOpenSettings}
          onSecretTrigger={onSecretTrigger}
        />
      )}

      {/* Filter & Search */}
      <PublicGalleryFilters 
        settings={settings}
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
        showHotEffects={!isAdminMode}
      />

      {/* Grid */}
      <div ref={virtuosoRef} className="flex-1 overflow-hidden bg-[#FDFAF6] relative">
        {isSyncing && (
          <div className="absolute top-3 right-3 z-10 w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
        )}
        {safePhotosToShow.length === 0 ? (
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
            totalCount={safePhotosToShow.length}
            endReached={handleLoadMore}
            overscan={200}
            listClassName={`grid gap-3 p-2 pb-40 ${columns === 2 ? 'grid-cols-2' : columns === 3 ? 'grid-cols-3' : 'grid-cols-5'}`}
            itemContent={(index) => (
              <MemoizedPhotoCard
                key={index}
                index={index}
                photo={safePhotosToShow[index]}
                isAdminMode={!!isAdminMode}
                isMultiSelect={activeIsMultiSelect}
                isStaffMode={isStaffMode}
                isSelected={!!activeSelectedIds.includes(safePhotosToShow[index].id)}
                showGroupsCollapsed={showGroupsCollapsed}
                lang={lang}
                t={t}
                categories={categories}
                manufacturers={manufacturers}
                tagMap={tagMap}
                onToggleSelection={activeToggleSelection}
                onEditPhoto={onEditPhoto}
                onGroupClick={onGroupClick || setActiveGroupId}
                onLightboxOpen={setLightboxIndex}
                onLongPressStart={startLongPress}
                onLongPressEnd={endLongPress}
                shareSinglePhoto={shareSinglePhoto}
                onTogglePinned={onTogglePinned}
                displayPhotos={displayPhotos}
                gridPhotos={safePhotosToShow}
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
        isStaffMode={isStaffMode}
        onEditPhoto={onEditPhoto ? (photo: Photo) => onEditPhoto(photo.id) : undefined}
        onLongPressStart={isAdminMode ? (p: Photo) => startLongPress(p.id) : undefined}
        onLongPressEnd={isAdminMode ? endLongPress : undefined}
        onBatchEdit={onBatchEdit}
        onUngroup={onGroupPhotos && activeGroupId ? () => onGroupPhotos([activeGroupId]) : undefined} 
        onAddPhotoToGroup={onAddPhoto}
        onAiAnalyze={onAiAnalyze}
        onCancelAnalyze={onCancelAnalyze}
        isAnalyzing={isAnalyzing}
        onBatchAiAnalyze={onBatchAiAnalyze}
        setPhotos={context.setPhotos}
        lang={lang}
        t={t}
        categories={categories}
        manufacturers={context.manufacturers}
        tagMap={tagMap}
        allTags={tags}
        isMultiSelect={activeIsMultiSelect}
        setAlertDialog={setAlertDialog}
        shareGroup={shareGroup}
        contactWhatsApp={() => setShowWhatsAppChoice(true)}
        onToggleHidden={async (photo) => {
           const newStatus = !photo.isHidden;
           import('../services/photoMutationService').then(async (m) => {
              try {
                await m.updatePhoto(photo.id, { isHidden: newStatus }, context.setPhotos);
              } catch (e) {
                console.error("[ERROR] Failed to toggle hidden:", e);
              }
           });
        }}
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
        onAiAnalyze={onAiAnalyze}
        onCancelAnalyze={onCancelAnalyze}
        isAnalyzing={isAnalyzing}
        contactWhatsApp={() => setShowWhatsAppChoice(true)}
        onUngroup={async (id) => {
          if (onGroupPhotos) onGroupPhotos([id]);
          setLightboxIndex(null);
        }}
        onSetGroupCover={async (id, groupId) => {
          const groupPhotos = safeArray(photos).filter(p => p.groupId === groupId);
          import('../services/photoMutationService').then(async (m) => {
             try {
               await Promise.all(
                  groupPhotos.map(p => m.updatePhoto(p.id, { isGroupCover: p.id === id }, context.setPhotos))
               );
             } catch (err: any) {
               setAlertDialog?.({ title: '设置封面失败', message: err.message });
             }
          }).catch(err => {
             console.error("[ERROR] Failed to update group cover:", err);
          });
        }}
        onEditPhoto={(photo) => {
           setLightboxIndex(null);
           if (onEditPhoto) onEditPhoto(photo.id);
        }}
        onToggleHidden={async (photo) => {
           const newStatus = !photo.isHidden;
           import('../services/photoMutationService').then(async (m) => {
              try {
                await m.updatePhoto(photo.id, { isHidden: newStatus }, context.setPhotos);
              } catch (e) {
                console.error("[ERROR] Failed to toggle hidden:", e);
              }
           });
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
