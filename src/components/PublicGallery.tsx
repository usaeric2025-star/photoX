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
import { PublicFloatingButtons } from './public/PublicFloatingButtons';
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
  tags?: Tag[];
  columns?: 2 | 3 | 5;
  setColumns?: (val: 2 | 3 | 5) => void;
  cloudCount?: number | null;
  hideHeader?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  totalCount?: number;
  initialHash?: string;
  initialGroupId?: string;
}

export const PublicGallery: React.FC<PublicGalleryProps> = (props) => {
  const logic = usePublicGalleryLogic(props);
  const {
    settings, user, isSyncing: rawIsSyncing, searchQuery, setSearchQuery, selectedCatCode, setSelectedCatCode,
    selectedSubId, setSelectedSubId, selectedTagIds, setSelectedTagIds, sortOrder,
    showGroupsCollapsed, setShowGroupsCollapsed, activeGroupId, setActiveGroupId, activePhotoId, setActivePhotoId,
    lightboxIndex, setLightboxIndex, tagMap, toggleSortOrder, virtuosoRef, scrollToTop,
    showWhatsAppChoice, setShowWhatsAppChoice, openWhatsApp, shareSinglePhoto, shareGroup,
    handleLoadMore, navigate, sortedTags, gridPhotos, displayPhotos, t, lang, categories, manufacturers, contextTags, isStaffMode
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
                <ErrorBoundary fallback={<div className="p-4 text-center">加载失败，请刷新页面</div>}>
                  <GalleryGrid 
                    virtuosoRef={virtuosoRef}
                    gridPhotos={gridPhotos}
                    displayPhotos={displayPhotos}
                    columns={columns}
                    virtuosoComponents={virtuosoComponents}
                    virtuosoContext={virtuosoContext}
                    handleLoadMore={handleLoadMore}
                    activeIsMultiSelect={false}
                    isStaffMode={false}
                    activeSelectedIds={[]}
                    showGroupsCollapsed={showGroupsCollapsed}
                    lang={lang}
                    t={t}
                    categories={categories}
                    manufacturers={manufacturers}
                    tagMap={tagMap}
                    activeToggleSelection={() => {}}
                    setActiveGroupId={setActiveGroupId}
                    setActivePhotoId={setActivePhotoId}
                    setLightboxIndex={setLightboxIndex}
                    startLongPress={() => {}}
                    endLongPress={() => {}}
                    shareSinglePhoto={shareSinglePhoto}
                    selectedCatCode={selectedCatCode}
                    selectedSubId={selectedSubId}
                    selectedTagIds={selectedTagIds}
                    searchQuery={searchQuery}
                  />
                </ErrorBoundary>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>

      {lightboxIndex === null && (
        <PublicFloatingButtons scrollToTop={scrollToTop} setShowWhatsAppChoice={setShowWhatsAppChoice} />
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
        isStaffMode={false}
        lang={lang}
        t={t}
        categories={categories}
        manufacturers={manufacturers}
        tagMap={tagMap}
        allTags={contextTags}
        shareGroup={shareGroup}
        contactWhatsApp={() => setShowWhatsAppChoice(true)}
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
              isStaffMode={false}
              contactWhatsApp={handleContactWhatsApp}
              lang={lang}
              t={t}
              tagMap={tagMap}
              categories={categories}
              manufacturers={manufacturers || []}
            />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
