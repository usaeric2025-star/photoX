import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Photo, Category, Tag, Manufacturer, AppSettings, User } from '../types';
import { X, ImageIcon, Share2, Layers, ArrowUpToLine, MessageCircle, RefreshCcw } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { VirtuosoGrid } from 'react-virtuoso';
import { usePhotosQuery, useCategoriesQuery, useTagsQuery, useManufacturersQuery } from '../hooks';
import { useGalleryStore } from '../store';
import { PAGINATION } from '../constants/config';
import { PhotoCard } from './PhotoCard';
import { PhotoCardSkeleton } from './ui/Skeleton';
import { translations, LanguageCode } from '../lib/translations';
import { PhotoLightbox } from './PhotoLightbox';
import { StaffUnlockDialog } from './StaffUnlockDialog';
import { WhatsAppChoiceDialog } from './WhatsAppChoiceDialog';
import { toast } from 'sonner';
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
  onToggleHidden?: (photo: Photo) => void;
  initialHash?: string;
  initialGroupId?: string;
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


const VirtuosoGridFooter = React.memo(({ context }: any) => {
  const {
    hasMore,
    isSyncing,
    onLoadMore,
    safePhotosLength,
    textLoadMore,
    textEndOfList
  } = context || {};

  return (
    <div className="py-10 pb-32 flex flex-col items-center justify-center w-full min-h-[100px] clear-both">
      {hasMore ? (
        <button 
          onClick={onLoadMore}
          disabled={isSyncing}
          className="px-6 py-2.5 bg-white border border-brand-navy/10 text-brand-navy text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm active:scale-95 transition-all flex items-center gap-2"
        >
          {isSyncing ? (
            <div className="w-3 h-3 border-2 border-brand-navy/20 border-t-brand-navy rounded-full animate-spin" />
          ) : (
            <RefreshCcw size={12} />
          )}
          {textLoadMore || '加载更多 / Load More'}
        </button>
      ) : safePhotosLength > 0 ? (
        <div className="flex flex-col items-center gap-2 opacity-20">
          <div className="h-[1px] w-12 bg-brand-navy" />
          <p className="text-[8px] font-black uppercase tracking-[0.2em]">{textEndOfList || '已经到底了 / End'}</p>
        </div>
      ) : null}
    </div>
  );
});
VirtuosoGridFooter.displayName = 'VirtuosoGridFooter';

const virtuosoComponents = { Footer: VirtuosoGridFooter };

import { filterPhotos, groupPhotos } from '../lib/filters';
import { isValidPhoto } from '../lib/typeGuard';

export const PublicGallery: React.FC<PublicGalleryProps> = ({ 
  photos: incomingPhotos, // Rename to avoid shadowing
  categories: propCategories,
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
  onToggleHidden,
  isAnalyzing,
  onSetGroupCover,
  setAlertDialog: propsSetAlertDialog,
  totalCount,
  onTogglePinned,
  initialHash,
  initialGroupId,
}) => {
  const user = propsUser;
  const settings = propsSettings;
  const loginWithGoogle = propsLoginWithGoogle;
  const isSyncing = propsIsRefreshing;
  
  const accessPasscode = settings?.access_passcode;

  const {
    searchQuery, setSearchQuery,
    filterCatId: selectedCatCode, setFilterCatId: setSelectedCatCode,
    filterSubId: selectedSubId, setFilterSubId: setSelectedSubId,
    filterTagIds: selectedTagIds, setFilterTagIds: setSelectedTagIds,
    sortOrder, setSortOrder,
    showGroupsCollapsed, setShowGroupsCollapsed,
    visibleCount, setVisibleCount,
    isInfiniteMode, isStaffMode, setIsStaffMode,
    selectedIds: storeSelectedIds,
    isMultiSelect: storeIsMultiSelect,
    togglePhotoSelection,
    clearSelection,
    setIsMultiSelect: setStoreIsMultiSelect,
    setErrors
  } = useGalleryStore();
  
  const handleError = (error: any, context: string) => {
    console.error(`[Error] ${context}:`, error);
    setErrors([{ message: error.message || String(error), context, timestamp: Date.now() }]);
  };

  const { data: qCategories = [] } = useCategoriesQuery();
  const { data: qManufacturers = [] } = useManufacturersQuery();
  const { data: qTags = [] } = useTagsQuery();
  const { data: qPhotos = [] } = usePhotosQuery({ userId: user?.id ?? '' }, 0, 1000);

  const categories = propCategories || qCategories || [];
  const manufacturers = qManufacturers;
  const contextTags = qTags;
  const contextPhotos = qPhotos;

  // Derive final lists
  const localPhotos = useMemo(() => {
    if (incomingPhotos && incomingPhotos.length > 0) return incomingPhotos;
    return contextPhotos || [];
  }, [incomingPhotos, contextPhotos]);
  // Use passed in selection state if provided (for AdminGalleryShell), otherwise use store
  const activeSelectedIds = selectedIds.length > 0 || isMultiSelect ? selectedIds : storeSelectedIds;
  const activeIsMultiSelect = isMultiSelect || storeIsMultiSelect;
  const activeToggleSelection = onToggleSelection || togglePhotoSelection;
  const activeClearSelection = onClearSelection || clearSelection;
  const activeSetIsMultiSelect = onToggleMultiSelect || setStoreIsMultiSelect;
  
  const { displayPhotos, gridPhotos, totalGridCount } = useMemo(() => {
    const validPhotos = (incomingPhotos && incomingPhotos.length > 0 ? incomingPhotos : localPhotos).filter(isValidPhoto);
    
    // Pre-calculate maps once
    const tagMap = new Map<string, string[]>();
    contextTags.forEach(t => {
      const terms = [t.name.toLowerCase()];
      if (Array.isArray(t.aliases)) {
        t.aliases.forEach(a => terms.push(a.toLowerCase()));
      }
      tagMap.set(String(t.id), terms);
    });
    
    const catMap = new Map<string, string[]>();
    if (categories.length > 0) {
      categories.forEach(c => {
        const terms = [(c.zh || c.name || '').toLowerCase()];
        if (Array.isArray(c.aliases)) {
          c.aliases.forEach(a => terms.push(a.toLowerCase()));
        }
        catMap.set(String(c.id), terms);
      });
    }

    // Always run through filterPhotos to apply current search/filters
    const dp = filterPhotos(validPhotos, {
      searchQuery,
      filterCatId: selectedCatCode,
      filterSubId: selectedSubId,
      filterTagIds: selectedTagIds,
      sortOrder,
      isAdminMode,
      isStaffMode
    }, contextTags, categories, tagMap, catMap);

    const gp = groupPhotos(dp, showGroupsCollapsed, sortOrder);
    return { displayPhotos: dp, gridPhotos: gp, totalGridCount: gp.length };
  }, [
    incomingPhotos, localPhotos, filterPhotos, groupPhotos,
    searchQuery, selectedCatCode, selectedSubId, selectedTagIds, sortOrder, 
    isAdminMode, isStaffMode, contextTags, propCategories, categories, showGroupsCollapsed
  ]);

  const setAlertDialog = propsSetAlertDialog || ((d: { title: string, message: string }) => {
    console.error(d.message || d.title);
    toast.error(d.message || d.title);
  });

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
    localPhotos.forEach(p => {
       (p.tagIds || []).forEach(id => ids.add(id));
    });
    return ids;
  }, [localPhotos]);

  const tags = useMemo(() => {
    const tMap = new Map<string, Tag>();
    contextTags.forEach(t => tMap.set(t.id, t));
    
    return Array.from(tMap.values());
  }, [contextTags, allTagIds]);

  const sortedTags = useMemo(() => {
    return [...tags].sort((a, b) => a.name.localeCompare(b.name));
  }, [tags]);

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
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Handle initial hash or group link
  useEffect(() => {
    if (initialHash && lightboxIndex === null && displayPhotos.length > 0) {
      const idx = displayPhotos.findIndex(p => p.image_hash === initialHash);
      if (idx !== -1) {
        console.log(`[PublicGallery] Auto-opening photo from hash: ${initialHash}`);
        setLightboxIndex(idx);
      }
    }
  }, [initialHash, displayPhotos, lightboxIndex]);

  useEffect(() => {
    if (initialGroupId && activeGroupId === null && localPhotos.length > 0) {
        const groupExists = localPhotos.some(p => p.groupId === initialGroupId);
        if (groupExists) {
            console.log(`[PublicGallery] Auto-opening group detail: ${initialGroupId}`);
            setActiveGroupId(initialGroupId);
        } else {
            console.warn(`[PublicGallery] Group ID ${initialGroupId} not found in current photo set.`);
        }
    }
  }, [initialGroupId, localPhotos, activeGroupId]);

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

  const handleLoginClick = () => {
    if (!isAdminMode && !user && !isStaffMode) {
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
    const shareUrl = `${window.location.origin}/h/${p.image_hash}`;

    if (lang === 'ms') {
      return `Halo, saya berminat dengan perabot ini:\n\n${displayName}${suffix}\n\nLink: ${shareUrl}`;
    } else if (lang === 'en') {
      return `Hello, I'm interested in this furniture:\n\n${displayName}${suffix}\n\nLink: ${shareUrl}`;
    } else {
      return `你好，我对这个家具有兴趣：\n\n${displayName}${suffix}\n\n链接: ${shareUrl}`;
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
    }, 500);
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
    const shareUrl = `${window.location.origin}/h/${photo.image_hash}`;
    try {
      if (navigator.share) {
        // Many platforms (iOS/Android) append the 'url' to the 'text' automatically. 
        // Since 'msg' already includes the link from getShareMessage, we pass empty url to avoid duplication.
        await navigator.share({ title: t.shareTitle, text: msg });
      } else {
        await navigator.clipboard.writeText(msg);
        toast.success("分享信息已复制到剪贴板！/ Share info copied to clipboard!");
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        handleError(e, "shareSinglePhoto");
      }
    }
  }, [t.shareTitle, t.shareNotSupported, lang]);

  const shareGroup = useCallback(async (photos: Photo[]) => {
    const validPhotos = photos.filter(p => !!p);
    const gId = validPhotos[0]?.groupId || activeGroupId;
    const shareUrl = `${window.location.origin}/g/${gId}`;
    const msg = validPhotos.map(p => p.name || 'Furniture').slice(0, 3).join(', ') + (validPhotos.length > 3 ? '...' : '');
    const shareText = `${t.sharePrompt}\n\n${t.shareTitle}: ${msg}\n\nView full collection: ${shareUrl}`;
    
    try {
      if (navigator.share) {
        // Pass empty url to avoid duplication as it's already in shareText
        await navigator.share({ title: t.shareTitle, text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast.success("群组分享链接已复制！/ Group share link copied!");
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.error("Group share failed:", e);
      }
    }
  }, [t, activeGroupId, lang]);

  const handleLoadMore = useCallback(() => {
    if (onLoadMore) {
      onLoadMore();
    }
  }, [onLoadMore]);

  const prevPhotosRef = useRef<any[]>([]);
  useEffect(() => {
    // Only update ref if new photos are not empty to preserve last valid state
    if (gridPhotos && gridPhotos.length > 0) {
      prevPhotosRef.current = gridPhotos;
    }
  }, [gridPhotos]);

  const photosToShow = (isSyncing && gridPhotos.length === 0 && prevPhotosRef.current.length > 0)
    ? prevPhotosRef.current
    : gridPhotos;

  const showSkeleton = isSyncing && gridPhotos.length === 0 && prevPhotosRef.current.length === 0;

  const safePhotosToShow = photosToShow;

  const handleLoadMoreRef = useRef(handleLoadMore);
  useEffect(() => {
    handleLoadMoreRef.current = handleLoadMore;
  }, [handleLoadMore]);

  const stableLoadMore = useCallback(() => {
    if (handleLoadMoreRef.current) {
        handleLoadMoreRef.current();
    }
  }, []);

const virtuosoContext = useMemo(() => ({
    hasMore: hasMore,
    isSyncing,
    onLoadMore: stableLoadMore,
    safePhotosLength: safePhotosToShow.length,
    textLoadMore: t.loadMore,
    textEndOfList: t.endOfList
  }), [hasMore, isSyncing, stableLoadMore, safePhotosToShow.length, t.loadMore, t.endOfList]);

  return (
    <div className="flex flex-col h-full bg-bg w-full overflow-hidden text-text">
      {/* Header */}
      {lightboxIndex === null && !hideHeader && (
        <PublicGalleryHeader 
          totalCount={totalCount}
          settings={settings}
          photos={localPhotos}
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
        setSelectedTagIds={(fnOrIds) => {
          if (typeof fnOrIds === 'function') {
            setSelectedTagIds(fnOrIds(selectedTagIds));
          } else {
            setSelectedTagIds(fnOrIds);
          }
        }}
        sortedTags={sortedTags}
        lang={lang}
        t={t}
        onScrollToTop={scrollToTop}
        showHotEffects={!isAdminMode}
      />

      {/* Grid */}
      <div className="flex-1 overflow-hidden bg-brand-bg relative">
        {isSyncing && safePhotosToShow.length === 0 ? (
          <div className={`grid gap-3 p-2 ${columns === 2 ? 'grid-cols-2' : columns === 3 ? 'grid-cols-3' : 'grid-cols-5'}`}>
            {Array.from({ length: 15 }).map((_, i) => (
              <PhotoCardSkeleton key={i} />
            ))}
          </div>
        ) : safePhotosToShow.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-brand-navy/20">
            <div className="w-16 h-16 bg-white/40 rounded-full flex items-center justify-center mb-4 border border-white shadow-sm">
                <ImageIcon size={32} className="opacity-20" />
            </div>
            <p className="text-xs font-black uppercase tracking-widest">{t.empty}</p>
          </div>
        ) : (
          <VirtuosoGrid
            ref={virtuosoRef}
            style={{ height: '100%', width: '100%' }}
            totalCount={totalCount || safePhotosToShow.length}
            computeItemKey={(index) => {
              const p = safePhotosToShow[index];
              return p ? (p.type === 'group' ? `group-${p.groupId}` : `photo-${p.id}`) : `loading-${index}`;
            }}
            components={virtuosoComponents}
            context={virtuosoContext}
            endReached={stableLoadMore}
            overscan={PAGINATION.VIRTUAL_SCROLL_OVERSCAN}
            listClassName={`grid gap-3 p-2 pb-24 ${columns === 2 ? 'grid-cols-2' : columns === 3 ? 'grid-cols-3' : 'grid-cols-5'}`}
            itemContent={(index) => (
              <MemoizedPhotoCard
                key={index}
                index={index}
                photo={safePhotosToShow[index]}
                isAdminMode={!!isAdminMode}
                isMultiSelect={activeIsMultiSelect}
                isStaffMode={isStaffMode}
                isSelected={safePhotosToShow[index] ? !!activeSelectedIds.includes(safePhotosToShow[index].id) : false}
                showGroupsCollapsed={showGroupsCollapsed}
                lang={lang}
                t={t}
                categories={categories}
                manufacturers={manufacturers}
                tagMap={tagMap}
                onToggleSelection={activeToggleSelection}
                onEditPhoto={onEditPhoto}
                onGroupClick={(gid) => {
                  setActiveGroupId(gid);
                  if (safePhotosToShow[index]) {
                    setActivePhotoId(safePhotosToShow[index].id);
                  }
                }}
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
            <button onClick={scrollToTop} className="bg-brand-navy text-brand-bg p-3 rounded-full shadow-lg transition-all active:scale-95 border border-brand-navy/10"><ArrowUpToLine size={20} /></button>
            <button onClick={() => setShowWhatsAppChoice(true)} className="bg-[#25D366] text-white p-3 rounded-full shadow-lg"><MessageCircle size={20} /></button>
        </div>
      )}

      {/* Group Detail View */}
      <GroupDetailView 
        activeGroupId={activeGroupId}
        setActiveGroupId={(gid) => {
          setActiveGroupId(gid);
          if (gid === null) setActivePhotoId(null);
        }}
        initialPhotoId={activePhotoId}
        photos={localPhotos}
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
        lang={lang}
        t={t}
        categories={categories}
        manufacturers={manufacturers}
        tagMap={tagMap}
        allTags={tags}
        isMultiSelect={activeIsMultiSelect}
        setAlertDialog={setAlertDialog}
        shareGroup={shareGroup}
        contactWhatsApp={() => setShowWhatsAppChoice(true)}
        onToggleHidden={onToggleHidden || (async (photo) => {
           const newStatus = !photo.isHidden;
           import('../services/photoMutationService').then(async (m) => {
              try {
                await m.updatePhoto(photo.id, { isHidden: newStatus });
              } catch (e: any) {
                console.error("[ERROR] Failed to toggle hidden:", e);
                setAlertDialog?.({ title: '操作失败', message: e.message || 'Error' });
              }
           });
        })}
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
              console.log('DEBUG [PublicGallery]: passInput:', passInput, 'accessPasscode (from settings):', accessPasscode);
              if (passInput === accessPasscode) {
                setIsStaffMode(true);
                setShowPassPrompt(false);
                setPassInput('');
                navigate('/admin');
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
        manufacturers={manufacturers}
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
          const groupPhotos = safeArray(localPhotos).filter(p => p.groupId === groupId);
          import('../services/photoMutationService').then(async (m) => {
             try {
               await Promise.all(
                  groupPhotos.map(p => m.updatePhoto(p.id, { isGroupCover: p.id === id }))
               );
             } catch (err: any) {
               console.error("setGroupCover", err);
             }
          }).catch(err => {
             console.error("importMutationService", err);
          });
        }}
        onEditPhoto={(photo) => {
           setLightboxIndex(null);
           if (onEditPhoto) onEditPhoto(photo.id);
        }}
        onToggleHidden={onToggleHidden || (async (photo) => {
           const newStatus = !photo.isHidden;
           import('../services/photoMutationService').then(async (m) => {
              try {
                await m.updatePhoto(photo.id, { isHidden: newStatus });
              } catch (e: any) {
                console.error("[ERROR] Failed to toggle hidden:", e);
                setAlertDialog?.({ title: '操作失败', message: e.message || 'Error' });
              }
           });
        })}
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
