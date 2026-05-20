import React, { useState, useMemo, useCallback } from 'react';
import { Photo, Category, Tag, Manufacturer, AppSettings, User } from '../types';
import { ArrowUpToLine, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PhotoLightbox } from './PhotoLightbox';
import { StaffUnlockDialog } from './StaffUnlockDialog';
import { WhatsAppChoiceDialog } from './WhatsAppChoiceDialog';
import { GroupDetailView } from './GroupDetailView';
import { usePublicGalleryLogic } from './PublicGallery/usePublicGalleryLogic';
import { GalleryHeader } from './PublicGallery/GalleryHeader';
import { GalleryFilters } from './PublicGallery/GalleryFilters';
import { GalleryGrid } from './PublicGallery/GalleryGrid';
import { GallerySkeleton } from './PublicGallery/GallerySkeleton';
import { GalleryEmpty } from './PublicGallery/GalleryEmpty';
import { GalleryDialogs } from './PublicGallery/GalleryDialogs';
import { GalleryFloatButtons } from './PublicGallery/GalleryFloatButtons';
import { getSkeletonCount } from '../utils/skeletonHelpers';

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
  isFetchingNextPage?: boolean;
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
  setIsMultiSelect?: (val: boolean) => void;
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

const VirtuosoGridFooter = React.memo(({ context }: any) => {
  const { hasMore, isSyncing, isFetchingNextPage, safePhotosLength, textEndOfList, textLoading } = context || {};
  
  if (isFetchingNextPage) {
    return (
      <div className="py-8 px-2 w-full">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="aspect-square bg-brand-navy/5 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isSyncing && safePhotosLength === 0) return null; // Handled by main skeleton
  if (!hasMore && safePhotosLength > 0) return (
    <div className="py-12 pb-16 flex flex-col items-center justify-center w-full clear-both border-t border-brand-navy/5 bg-brand-navy/[0.02]">
      <div className="flex flex-col items-center gap-2 opacity-20">
        <div className="h-[1px] w-12 bg-brand-navy" />
        <p className="text-[8px] font-black uppercase tracking-[0.2em]">{textEndOfList}</p>
      </div>
    </div>
  );
  return <div className="h-40" />;
});
VirtuosoGridFooter.displayName = 'VirtuosoGridFooter';

const virtuosoComponents = { Footer: VirtuosoGridFooter };

export const PublicGallery: React.FC<PublicGalleryProps> = (props) => {
  const logic = usePublicGalleryLogic(props);
  const {
    settings, user, isSyncing: rawIsSyncing, searchQuery, setSearchQuery, selectedCatCode, setSelectedCatCode,
    selectedSubId, setSelectedSubId, selectedTagIds, setSelectedTagIds, sortOrder,
    showGroupsCollapsed, setShowGroupsCollapsed, isStaffMode, setIsStaffMode, activeSelectedIds,
    activeIsMultiSelect, activeToggleSelection, activeClearSelection, activeSetIsMultiSelect,
    displayPhotos, gridPhotos, categories, manufacturers, contextTags, lang, setLang, t,
    columns, setColumns, activeGroupId, setActiveGroupId, activePhotoId, setActivePhotoId,
    lightboxIndex, setLightboxIndex, tagMap, toggleSortOrder, virtuosoRef, scrollToTop,
    showWhatsAppChoice, setShowWhatsAppChoice, openWhatsApp, shareSinglePhoto, shareGroup,
    handleLoadMore, navigate, sortedTags
  } = logic;

  // Only show syncing state if it lasts longer than 150ms to prevent skeleton flash
  const [isSyncing, setIsSyncing] = useState(false);
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (rawIsSyncing) {
      timer = setTimeout(() => setIsSyncing(true), rawIsSyncing === true && gridPhotos.length === 0 ? 0 : 800);
    } else {
      setIsSyncing(false);
    }
    return () => clearTimeout(timer);
  }, [rawIsSyncing, gridPhotos.length]);

  const [showPassPrompt, setShowPassPrompt] = useState(false);
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState(false);

  const handleLoginClick = () => {
    if (!props.isAdminMode && !user && !isStaffMode) setShowPassPrompt(true);
    else if (props.onExit) props.onExit();
    else navigate('/admin');
  };

  const virtuosoContext = useMemo(() => ({
    hasMore: props.hasMore,
    isSyncing,
    isFetchingNextPage: props.isFetchingNextPage,
    safePhotosLength: gridPhotos.length,
    textLoadMore: t.loadMore,
    textEndOfList: t.endOfList,
    textLoading: t.loading
  }), [props.hasMore, isSyncing, props.isFetchingNextPage, gridPhotos.length, t]);

  const startLongPressTimer = React.useRef<NodeJS.Timeout | null>(null);

  const startLongPress = (id: string) => {
    // Basic implementation, simplified for refactor
    if (props.isAdminMode) {
      startLongPressTimer.current = setTimeout(() => {
        activeSetIsMultiSelect(true);
        activeToggleSelection(id);
      }, 400); // 400ms delay for long press
    }
  };

  const endLongPress = () => {
    if (startLongPressTimer.current) {
        clearTimeout(startLongPressTimer.current);
        startLongPressTimer.current = null;
    }
  };

  const handleContactWhatsApp = (photo: Photo) => {
    if (settings?.whatsapp_1 && !settings?.whatsapp_2) {
      openWhatsApp(settings.whatsapp_1, photo);
    } else {
      setShowWhatsAppChoice(true);
      // Wait, we can't easily pass photo to the dialog right now without state.
      // So let's just let it be generic for now if they have multiple options.
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full bg-bg w-full overflow-hidden text-text"
    >
      {lightboxIndex === null && !props.hideHeader && (
        <GalleryHeader 
          totalCount={props.totalCount}
          settings={settings}
          photos={props.photos}
          isRefreshing={!!isSyncing}
          isMultiSelect={!!activeIsMultiSelect}
          lang={lang}
          t={t}
          onRefresh={props.onRefresh}
          onToggleMultiSelect={() => activeSetIsMultiSelect(!activeIsMultiSelect)}
          clearSelection={activeClearSelection}
          setIsMultiSelect={props.setIsMultiSelect || activeSetIsMultiSelect}
          onAddPhoto={props.onAddPhoto}
          onSetLang={setLang}
          onExit={props.onExit || handleLoginClick}
          onLogin={props.onLogin}
          onOpenSettings={props.onOpenSettings}
        />
      )}

      <GalleryFilters 
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
      />

      <div className="flex-1 overflow-hidden bg-brand-bg relative">
        <AnimatePresence mode="wait">
          {(() => {
            const isInitialLoad = isSyncing && gridPhotos.length === 0;
            if (isInitialLoad) {
              const skeletonCount = getSkeletonCount(props.totalCount, columns);
              return (
                <motion.div 
                  key="skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 z-10 bg-brand-bg"
                >
                  <GallerySkeleton columns={columns} count={skeletonCount} />
                </motion.div>
              );
            }
            if (gridPhotos.length === 0 && !props.isFetchingNextPage) {
              return (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full"
                >
                  <GalleryEmpty t={t} />
                </motion.div>
              );
            }
            return (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                <GalleryGrid 
                  virtuosoRef={virtuosoRef}
                  gridPhotos={gridPhotos}
                  displayPhotos={displayPhotos}
                  columns={columns}
                  virtuosoComponents={virtuosoComponents}
                  virtuosoContext={virtuosoContext}
                  handleLoadMore={handleLoadMore}
                  activeIsMultiSelect={activeIsMultiSelect}
                  isStaffMode={isStaffMode}
                  activeSelectedIds={activeSelectedIds}
                  showGroupsCollapsed={showGroupsCollapsed}
                  lang={lang}
                  t={t}
                  categories={categories}
                  manufacturers={manufacturers}
                  tagMap={tagMap}
                  activeToggleSelection={activeToggleSelection}
                  onEditPhoto={props.onEditPhoto}
                  setActiveGroupId={setActiveGroupId}
                  setActivePhotoId={setActivePhotoId}
                  setLightboxIndex={setLightboxIndex}
                  startLongPress={startLongPress}
                  endLongPress={endLongPress}
                  shareSinglePhoto={shareSinglePhoto}
                  onTogglePinned={props.onTogglePinned}
                  onToggleHidden={props.onToggleHidden}
                  selectedCatCode={selectedCatCode}
                  selectedSubId={selectedSubId}
                  selectedTagIds={selectedTagIds}
                  searchQuery={searchQuery}
                />
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>

      {lightboxIndex === null && !props.isAdminMode && (
        <GalleryFloatButtons scrollToTop={scrollToTop} setShowWhatsAppChoice={setShowWhatsAppChoice} />
      )}


      <GroupDetailView 
        activeGroupId={activeGroupId}
        setActiveGroupId={(gid) => {
          setActiveGroupId(gid);
          if (gid === null) setActivePhotoId(null);
        }}
        initialPhotoId={activePhotoId}
        photos={props.photos}
        displayPhotos={displayPhotos}
        setLightboxIndex={setLightboxIndex}
        isStaffMode={isStaffMode}
        onEditPhoto={props.onEditPhoto ? (photo) => props.onEditPhoto!(photo.id) : undefined}
        onLongPressStart={props.isAdminMode ? (p) => startLongPress(p.id) : undefined}
        onLongPressEnd={() => {}}
        onBatchEdit={props.onBatchEdit}
        onUngroup={props.onGroupPhotos && activeGroupId ? () => props.onGroupPhotos!([activeGroupId]) : undefined} 
        onAddPhotoToGroup={props.onAddPhoto}
        onAiAnalyze={props.onAiAnalyze}
        onCancelAnalyze={props.onCancelAnalyze}
        isAnalyzing={props.isAnalyzing}
        onBatchAiAnalyze={props.onBatchAiAnalyze}
        lang={lang}
        t={t}
        categories={categories}
        manufacturers={manufacturers}
        tagMap={tagMap}
        allTags={contextTags}
        isMultiSelect={activeIsMultiSelect}
        setAlertDialog={props.setAlertDialog}
        shareGroup={shareGroup}
        contactWhatsApp={() => setShowWhatsAppChoice(true)}
        onToggleHidden={props.onToggleHidden}
      />

      <GalleryDialogs 
        showPassPrompt={showPassPrompt}
        setShowPassPrompt={setShowPassPrompt}
        passInput={passInput}
        setPassInput={setPassInput}
        passError={passError}
        setPassError={setPassError}
        t={t}
        loginWithGoogle={props.loginWithGoogle}
        settings={settings}
        setIsStaffMode={setIsStaffMode}
        navigate={navigate}
        showWhatsAppChoice={showWhatsAppChoice}
        setShowWhatsAppChoice={setShowWhatsAppChoice}
        openWhatsApp={openWhatsApp}
      />

      <AnimatePresence>
        {lightboxIndex !== null && displayPhotos[lightboxIndex] && (
            <PhotoLightbox 
              photo={displayPhotos[lightboxIndex]}
              displayPhotos={displayPhotos}
              index={lightboxIndex}
              onClose={() => setLightboxIndex(null)}
              onPrev={() => setLightboxIndex(lightboxIndex > 0 ? lightboxIndex - 1 : displayPhotos.length - 1)}
              onNext={() => setLightboxIndex(lightboxIndex < displayPhotos.length - 1 ? lightboxIndex + 1 : 0)}
              isStaffMode={isStaffMode}
              contactWhatsApp={handleContactWhatsApp}
              onEditPhoto={(photo) => props.onEditPhoto?.(photo.id)}
              lang={lang}
              t={t}
              tagMap={tagMap}
              categories={categories}
              manufacturers={manufacturers || []}
              onToggleHidden={props.onToggleHidden}
              onAiAnalyze={props.onAiAnalyze}
              onCancelAnalyze={props.onCancelAnalyze}
              isAnalyzing={props.isAnalyzing}
            />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
