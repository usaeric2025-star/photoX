import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { Photo, Category, Tag, Manufacturer, AppSettings, User } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { PhotoLightbox } from '../PhotoLightbox';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { GalleryFilters } from '../PublicGallery/GalleryFilters';
import { GalleryGrid } from '../PublicGallery/GalleryGrid';
import { GallerySkeleton } from '../PublicGallery/GallerySkeleton';
import { GalleryEmpty } from '../PublicGallery/GalleryEmpty';
import { GroupDetailView } from '../GroupDetailView';
import { getSkeletonCount } from '../../utils/skeletonHelpers';
import { useScrollRestoration, usePhotoFilters, useManufacturersQuery, useTagsQuery } from '../../hooks';
import { useGalleryStore } from '../../store';
import { translations } from '../../lib/translations';
import { sortTagsByPopularity } from '../../utils/tagUtils';

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
  isStaffMode?: boolean;
  onEditPhoto?: (id: string) => void;
  onToggleHidden?: (p: Photo) => Promise<void>;
  onTogglePinned?: (p: Photo) => Promise<void>;
  onAiAnalyze?: (photo: Photo) => Promise<any>;
  onSetGroupCover?: (id: string, gid: string) => Promise<void>;
  onCancelAnalyze?: () => void;
  isAnalyzing?: boolean;
}

export const AdminGallery: React.FC<AdminGalleryProps> = React.memo((props) => {
  useScrollRestoration('admin_gallery_scroll');

  // Store
  const searchQuery = useGalleryStore(s => s.searchQuery);
  const setSearchQuery = useGalleryStore(s => s.setSearchQuery);
  const selectedCatCode = useGalleryStore(s => s.filterCatId);
  const setSelectedCatCode = useGalleryStore(s => s.setFilterCatId);
  const filterSubId = useGalleryStore(s => s.filterSubId);
  const setFilterSubId = useGalleryStore(s => s.setFilterSubId);
  const selectedTagIds = useGalleryStore(s => s.filterTagIds);
  const setSelectedTagIds = useGalleryStore(s => s.setFilterTagIds);
  const sortOrder = useGalleryStore(s => s.sortOrder);
  const setSortOrder = useGalleryStore(s => s.setSortOrder);
  const showGroupsCollapsed = useGalleryStore(s => s.showGroupsCollapsed);
  const setShowGroupsCollapsed = useGalleryStore(s => s.setShowGroupsCollapsed);
  const langStore = useGalleryStore(s => s.appLang);
  const columns = useGalleryStore(s => s.columns);
  const setColumns = useGalleryStore(s => s.setColumns);
  const lightboxIndex = useGalleryStore(s => s.lightboxIndex);
  const setLightboxIndex = useGalleryStore(s => s.setLightboxIndex);
  const activeGroupId = useGalleryStore(s => s.activeGroupId);
  const setActiveGroupId = useGalleryStore(s => s.setActiveGroupId);
  const activePhotoId = useGalleryStore(s => s.activePhotoId);
  const setActivePhotoId = useGalleryStore(s => s.setActivePhotoId);

  // Queries
  const { data: qManufacturers = [] } = useManufacturersQuery();
  const manufacturers = qManufacturers;
  const contextTags = props.tags || [];

  const lang = langStore || 'zh';
  const t = useMemo(() => translations[lang] || translations['zh'], [lang]);

  // Logic
  const { displayPhotos, gridPhotos } = usePhotoFilters(
    props.photos,
    props.categories,
    contextTags,
    {
      showGroupsCollapsed,
      isAdminModeOverride: true
    }
  );

  const tagMap = useMemo(() => {
    const map: Record<string, string> = {};
    contextTags.forEach(t => { map[String(t.id)] = t.name; });
    return map;
  }, [contextTags]);

  const sortedTags = useMemo(() => {
    const pinnedIds = new Set((props.settings?.pinned_tags || []).map(id => String(id)));
    const enrichedTags = contextTags.map(t => {
      const strId = String(t.id);
      return {
        ...t,
        is_pinned: t.is_pinned || pinnedIds.has(strId)
      };
    });
    return sortTagsByPopularity(enrichedTags);
  }, [contextTags, props.settings?.pinned_tags]);

  const virtuosoRef = useRef<any>(null);
  const scrollToTop = () => virtuosoRef.current?.scrollTo({ top: 0, behavior: 'instant' });

  const toggleSortOrder = useCallback(() => {
    setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest');
  }, [sortOrder, setSortOrder]);

  const handleLoadMore = useCallback(() => {
    if (props.onLoadMore && props.hasMore && !props.isRefreshing) props.onLoadMore();
  }, [props.onLoadMore, props.hasMore, props.isRefreshing]);

  const virtuosoComponents = useMemo(() => ({
    Footer: () => {
      if (props.isFetchingNextPage) {
        return (
          <div className="py-8 flex flex-col items-center justify-center gap-2 pb-32">
            <div className="w-5 h-5 border-[2px] border-slate-300 border-t-slate-800 rounded-full animate-spin" />
            <span className="text-[10px] text-slate-500 font-medium tracking-tight animate-pulse">
              {t.loading || '正在载入更多...'}
            </span>
          </div>
        );
      }
      return (
        <div className="py-12 mt-12 flex flex-col items-center justify-center opacity-30 select-none pb-32">
          {props.settings?.logo_url && <img src={props.settings.logo_url} className="w-6 h-6 object-cover rounded-xl mb-3 grayscale" alt="Logo" />}
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-navy">
            {props.settings?.app_name || 'PhotoX Gallery'}
          </span>
        </div>
      );
    }
  }), [props.settings?.logo_url, props.settings?.app_name, props.isFetchingNextPage, t.loading]);

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

  const handleEditPhotoProp = useCallback((id: string) => {
    props.onEditPhoto?.(id);
  }, [props.onEditPhoto]);

  // Stable empty handlers to prevent unnecessary re-renders of all PhotoCards
  const noop = useCallback(() => {}, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full bg-brand-bg w-full overflow-hidden text-text"
    >
      <GalleryFilters 
        settings={props.settings}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortOrder={sortOrder}
        toggleSortOrder={toggleSortOrder}
        columns={columns}
        setColumns={setColumns}
        showGroupsCollapsed={showGroupsCollapsed}
        setShowGroupsCollapsed={setShowGroupsCollapsed}
        categories={props.categories}
        selectedCatCode={selectedCatCode}
        setSelectedCatCode={setSelectedCatCode}
        filterSubId={filterSubId}
        setFilterSubId={setFilterSubId}
        selectedTagIds={selectedTagIds}
        setSelectedTagIds={setSelectedTagIds}
        sortedTags={sortedTags}
        lang={lang}
        t={t}
        onScrollToTop={scrollToTop}
      />

      <div className="flex-1 overflow-hidden bg-brand-bg relative">
        <AnimatePresence>
          {(() => {
            const isInitialLoad = (isSyncing || props.isRefreshing) && gridPhotos.length === 0;
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
                <ErrorBoundary>
                  <GalleryGrid 
                    virtuosoRef={virtuosoRef}
                    gridPhotos={gridPhotos}
                    displayPhotos={displayPhotos}
                    columns={columns}
                    virtuosoComponents={virtuosoComponents}
                    virtuosoContext={virtuosoContext}
                    handleLoadMore={handleLoadMore}
                    isAdminMode={true}
                    showGroupsCollapsed={showGroupsCollapsed}
                    lang={lang}
                    t={t}
                    categories={props.categories}
                    manufacturers={manufacturers}
                    tagMap={tagMap}
                    setActiveGroupId={setActiveGroupId}
                    setActivePhotoId={setActivePhotoId}
                    setLightboxIndex={handleSetLightboxIndex}
                    shareSinglePhoto={noop}
                    selectedCatCode={selectedCatCode}
                    filterSubId={filterSubId}
                    selectedTagIds={selectedTagIds}
                    searchQuery={searchQuery}
                    onToggleHidden={props.onToggleHidden}
                    onTogglePinned={props.onTogglePinned}
                    onEditPhoto={handleEditPhotoProp}
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
              categories={props.categories}
              manufacturers={manufacturers || []}
              onEditPhoto={(p) => {
                props.onEditPhoto?.(p.id);
              }}
              onToggleHidden={props.onToggleHidden as any}
              onTogglePinned={props.onTogglePinned}
              onAiAnalyze={props.onAiAnalyze as any}
              onSetGroupCover={props.onSetGroupCover as any}
              onCancelAnalyze={props.onCancelAnalyze}
              isAnalyzing={props.isAnalyzing}
            />
        )}
      </AnimatePresence>

      {!props.isStaffMode && (
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
          categories={props.categories}
          manufacturers={manufacturers}
          tagMap={tagMap}
          allTags={contextTags}
          shareGroup={noop}
          contactWhatsApp={noop}
        />
      )}
    </motion.div>
  );
});

