import React, { useState, useMemo, useCallback } from 'react';
import { Photo, Category, Tag, Manufacturer, AppSettings, User } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { PhotoLightbox } from '../PhotoLightbox';
import { ErrorBoundary } from 'react-error-boundary';
import { usePublicGalleryLogic } from '../PublicGallery/usePublicGalleryLogic';
import { GalleryFilters } from '../PublicGallery/GalleryFilters';
import { GalleryGrid } from '../PublicGallery/GalleryGrid';
import { GallerySkeleton } from '../PublicGallery/GallerySkeleton';
import { GalleryEmpty } from '../PublicGallery/GalleryEmpty';
import { GroupDetailView } from '../GroupDetailView';
import { getSkeletonCount } from '../../utils/skeletonHelpers';

interface AdminGalleryProps {
  photos: Photo[];
  categories: Category[];
  tags: Tag[];
  manufacturers?: Manufacturer[];
  settings?: AppSettings;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  columns?: 2 | 3 | 5;
  setColumns?: (val: 2 | 3 | 5) => void;
  totalCount?: number;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isFetchingNextPage?: boolean;
  activeSelectedIds: string[];
  activeIsMultiSelect: boolean;
  activeToggleSelection: (id: string) => void;
  activeSetIsMultiSelect: (val: boolean) => void;
  activeClearSelection: () => void;
  isStaffMode?: boolean;
  onEditPhoto?: (id: string) => void;
  onToggleHidden?: (p: Photo) => Promise<void>;
  onAiAnalyze?: (photo: Photo) => Promise<any>;
  onSetGroupCover?: (id: string, gid: string) => Promise<void>;
  onCancelAnalyze?: () => void;
  isAnalyzing?: boolean;
}

export const AdminGallery: React.FC<AdminGalleryProps> = (props) => {
  const logic = usePublicGalleryLogic({
    ...props,
    isAdminMode: true,
    user: null, // Admin mode
  });

  const {
    settings, searchQuery, setSearchQuery, selectedCatCode, setSelectedCatCode,
    selectedSubId, setSelectedSubId, selectedTagIds, setSelectedTagIds, sortOrder, setSortOrder,
    showGroupsCollapsed, setShowGroupsCollapsed, activeGroupId, setActiveGroupId, activePhotoId, setActivePhotoId,
    lightboxIndex, setLightboxIndex, tagMap, toggleSortOrder, virtuosoRef, scrollToTop,
    handleLoadMore, sortedTags, gridPhotos, t, lang, categories, manufacturers, contextTags
  } = logic;
  const displayPhotos = useMemo(() => logic.displayPhotos || [], [logic.displayPhotos]);

  const virtuosoComponents = useMemo(() => ({
    Footer: () => (
      <div className="py-12 mt-12 flex flex-col items-center justify-center opacity-30 select-none pb-32">
        {props.settings?.logo_url && <img src={props.settings.logo_url} className="w-6 h-6 object-cover rounded-xl mb-3 grayscale" alt="Logo" />}
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-navy">
          {props.settings?.app_name || 'PhotoX Gallery'}
        </span>
      </div>
    )
  }), [props.settings?.logo_url, props.settings?.app_name]);
  const isSyncing = !!props.isRefreshing;

  const virtuosoContext = useMemo(() => ({
    hasMore: props.hasMore,
    isSyncing,
    isFetchingNextPage: props.isFetchingNextPage,
    safePhotosLength: gridPhotos.length,
    textLoadMore: t.loadMore,
    textEndOfList: t.endOfList,
    textLoading: t.loading
  }), [props.hasMore, isSyncing, props.isFetchingNextPage, gridPhotos.length, t]);

  const handleSetLightboxIndex = useCallback((index: number) => {
    setLightboxIndex(index);
  }, [setLightboxIndex]);

  const handleToggleSelection = props.activeToggleSelection;

  const startLongPress = useCallback((id: string) => {
    props.activeSetIsMultiSelect(true);
    if (!props.activeSelectedIds.includes(id)) {
      props.activeToggleSelection(id);
    }
  }, [props.activeSetIsMultiSelect, props.activeSelectedIds, props.activeToggleSelection]);

  // Stable empty handlers to prevent unnecessary re-renders of all PhotoCards
  const noop = useCallback(() => {}, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full bg-brand-bg w-full overflow-hidden text-text"
    >
      <GalleryFilters 
        settings={settings}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortOrder={sortOrder}
        toggleSortOrder={toggleSortOrder}
        columns={props.columns || 3}
        setColumns={props.setColumns || (() => {})}
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
        {/* Persistent Watermark Background */}
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-10 pointer-events-none select-none z-0">
          {settings?.logo_url && <img src={settings.logo_url} className="w-12 h-12 object-cover rounded-2xl mb-4 grayscale" alt="Logo" />}
          <span className="text-[14px] font-black uppercase tracking-[0.3em] text-brand-navy">
            {settings?.app_name || 'PhotoX Gallery'}
          </span>
        </div>
        <AnimatePresence>
          {(() => {
            const isInitialLoad = isSyncing && gridPhotos.length === 0;
            if (isInitialLoad) {
              const skeletonCount = getSkeletonCount(props.totalCount, props.columns || 3);
              return (
                <motion.div 
                  key="skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 z-10 bg-brand-bg"
                >
                  <GallerySkeleton columns={props.columns || 3} count={skeletonCount} />
                </motion.div>
              );
            }
            if (gridPhotos.length === 0) {
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
                    columns={props.columns || 3}
                    virtuosoComponents={virtuosoComponents}
                    virtuosoContext={virtuosoContext}
                    handleLoadMore={handleLoadMore}
                    activeIsMultiSelect={props.activeIsMultiSelect}
                    isAdminMode={true}
                    activeSelectedIds={props.activeSelectedIds}
                    showGroupsCollapsed={showGroupsCollapsed}
                    lang={lang}
                    t={t}
                    categories={categories}
                    manufacturers={manufacturers}
                    tagMap={tagMap}
                    activeToggleSelection={handleToggleSelection}
                    setActiveGroupId={setActiveGroupId}
                    setActivePhotoId={setActivePhotoId}
                    setLightboxIndex={handleSetLightboxIndex}
                    startLongPress={startLongPress}
                    endLongPress={noop}
                    shareSinglePhoto={noop}
                    selectedCatCode={selectedCatCode}
                    selectedSubId={selectedSubId}
                    selectedTagIds={selectedTagIds}
                    searchQuery={searchQuery}
                    onToggleHidden={props.onToggleHidden}
                    onEditPhoto={(id) => props.onEditPhoto && props.onEditPhoto(id)}
                  />
                </ErrorBoundary>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>

          <AnimatePresence>
        {lightboxIndex !== null && displayPhotos[lightboxIndex] && (
            <PhotoLightbox 
              photo={displayPhotos[lightboxIndex]}
              displayPhotos={displayPhotos}
              index={lightboxIndex}
              onClose={() => setLightboxIndex(null)}
              onPrev={() => setLightboxIndex(lightboxIndex > 0 ? lightboxIndex - 1 : (displayPhotos?.length || 0) - 1)}
              onNext={() => setLightboxIndex(lightboxIndex < (displayPhotos?.length || 0) - 1 ? lightboxIndex + 1 : 0)}
              isStaffMode={!!props.isStaffMode}
              contactWhatsApp={() => {}}
              lang={lang}
              t={t}
              tagMap={tagMap}
              categories={categories}
              manufacturers={manufacturers || []}
              onEditPhoto={(p) => props.onEditPhoto && props.onEditPhoto(p.id)}
              onToggleHidden={props.onToggleHidden as any}
              onAiAnalyze={props.onAiAnalyze as any}
              onSetGroupCover={props.onSetGroupCover as any}
              onCancelAnalyze={props.onCancelAnalyze}
              isAnalyzing={props.isAnalyzing}
            />
        )}
      </AnimatePresence>

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
        isStaffMode={!!props.isStaffMode}
        lang={lang}
        t={t}
        categories={categories}
        manufacturers={manufacturers}
        tagMap={tagMap}
        allTags={contextTags}
        shareGroup={noop}
        contactWhatsApp={noop}
      />
    </motion.div>
  );
};

