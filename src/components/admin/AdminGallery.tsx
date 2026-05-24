import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { Photo, Category, Tag, Manufacturer, AppSettings, User } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { PhotoLightbox } from '../PhotoLightbox';
import { usePhotoActions } from '@/contexts/PhotoActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { GalleryFilters } from '../ui/GalleryFilters';
import PhotoBoard from '@/components/photo/PhotoGrid';
import { GallerySkeleton } from '../PublicGallery/GallerySkeleton';
import { GalleryEmpty } from '../PublicGallery/GalleryEmpty';
import { GroupDetailView } from '../GroupDetailView';
import { getSkeletonCount } from '../../utils/skeletonHelpers';
import { useScrollRestoration, usePhotoFilters, useManufacturersQuery, useTagsQuery, useCategoriesQuery, useSettings, useInfinitePhotos, useAdminMode, useTasks } from '../../hooks';
import { useGalleryStore, useShallow } from '../../store';
import { PAGINATION } from '../../constants/config';
import { translations } from '../../lib/translations';

interface AdminGalleryProps {
  isRefreshing?: boolean;
  onRefresh?: () => void;
  isStaffMode?: boolean;
  isAnalyzing?: boolean;
  handleBatchAiIdentifyTrigger?: () => void;
  batchProgress?: any;
}

export const AdminGallery: React.FC<AdminGalleryProps> = React.memo((props) => {
  useScrollRestoration('admin_gallery_scroll');

  // Queries
  const { data: categories = [] } = useCategoriesQuery();
  const { data: contextTags = [] } = useTagsQuery();
  const { data: qManufacturers = [] } = useManufacturersQuery();
  const { settings } = useSettings();
  const manufacturers = qManufacturers;

  const { 
    showGroupsCollapsed, 
    appLang: langStore, 
    columns,
    lightboxIndex, setLightboxIndex,
    activeGroupId, setActiveGroupId,
    activePhotoId, setActivePhotoId,
    sortOrder, setSortOrder,
    filterCatId,
    filterTagIds,
    searchQuery,
    viewMode
  } = useGalleryStore(useShallow(s => ({
    showGroupsCollapsed: s.showGroupsCollapsed,
    appLang: s.appLang,
    columns: s.columns,
    lightboxIndex: s.lightboxIndex,
    setLightboxIndex: s.setLightboxIndex,
    activeGroupId: s.activeGroupId,
    setActiveGroupId: s.setActiveGroupId,
    activePhotoId: s.activePhotoId,
    setActivePhotoId: s.setActivePhotoId,
    sortOrder: s.sortOrder,
    setSortOrder: s.setSortOrder,
    filterCatId: s.filterCatId,
    filterTagIds: s.filterTagIds,
    searchQuery: s.searchQuery,
    viewMode: s.viewMode
  })));

  const { tasks } = useTasks();
  const isAnalyzing = useMemo(() => props.isAnalyzing || tasks.some(t => t.status === 'running' && (t.name.includes('识别') || t.name.includes('分析'))), [props.isAnalyzing, tasks]);

  const isAdminMode = useAdminMode() || viewMode === 'admin';

  // Direct data fetch (shared with PhotoBoard)
  const infiniteQuery = useInfinitePhotos({
    category_id: filterCatId,
    tag_id: Array.isArray(filterTagIds) && filterTagIds.length > 0 ? filterTagIds[0] : null,
    searchQuery: searchQuery,
    sortOrder: sortOrder,
    isAdminMode: true
  }, PAGINATION.ADMIN_BATCH_SIZE);

  const photos = useMemo(() => infiniteQuery.data?.pages.flatMap(p => p.photos) || [], [infiniteQuery.data]);
  const isFetchingNextPage = infiniteQuery.isFetchingNextPage;

  const { onEditPhoto, onToggleHidden, onTogglePinned, onAiAnalyze, onSetGroupCover, onCancelAnalyze } = usePhotoActions();

  const lang = langStore || 'zh';
  const t = useMemo(() => translations[lang] || translations['zh'], [lang]);

  // Logic
  const { displayPhotos, gridPhotos } = usePhotoFilters(
    photos,
    categories,
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

  const virtuosoRef = useRef<any>(null);
  const scrollToTop = () => virtuosoRef.current?.scrollTo({ top: 0, behavior: 'instant' });

  const toggleSortOrder = useCallback(() => {
    setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest');
  }, [sortOrder, setSortOrder]);

  const handleLoadMore = useCallback(() => {
    if (infiniteQuery.hasNextPage && !infiniteQuery.isFetching) infiniteQuery.fetchNextPage();
  }, [infiniteQuery]);

  const virtuosoComponents = useMemo(() => ({
    Footer: () => {
      if (isFetchingNextPage) {
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
          {settings?.logo_url && <img src={settings.logo_url} className="w-6 h-6 object-cover rounded-xl mb-3 grayscale" alt="Logo" />}
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-navy">
            {settings?.app_name || 'PhotoX Gallery'}
          </span>
        </div>
      );
    }
  }), [settings?.logo_url, settings?.app_name, infiniteQuery.isFetchingNextPage, t.loading]);

  const isSyncing = !!props.isRefreshing;

  const handleSetLightboxIndex = useCallback((index: number) => {
    setLightboxIndex(index);
  }, [setLightboxIndex]);

  // Stable empty handlers
  const noop = useCallback(() => {}, []);

  const handleEditPhotoProp = useCallback((id: string) => {
    if (typeof onEditPhoto === 'function') {
      const photo = photos.find(p => p.id === id);
      if (photo) onEditPhoto(photo);
    }
  }, [onEditPhoto, photos]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full bg-brand-bg w-full overflow-hidden text-text"
    >
      <GalleryFilters 
        onScrollToTop={scrollToTop}
        variant="admin"
        onBatchAiIdentify={props.handleBatchAiIdentifyTrigger}
        isAnalyzing={props.isAnalyzing}
        batchProgress={props.batchProgress}
      />

      <div className="flex-1 overflow-hidden bg-brand-bg relative">
        <AnimatePresence>
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <ErrorBoundary>
              <PhotoBoard virtuosoRef={virtuosoRef} />
            </ErrorBoundary>
          </motion.div>
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
              contactWhatsApp={() => {}}
              onEditPhoto={onEditPhoto}
              onToggleHidden={onToggleHidden}
              onTogglePinned={onTogglePinned}
              onAiAnalyze={onAiAnalyze as any}
              onSetGroupCover={onSetGroupCover as any}
              onCancelAnalyze={onCancelAnalyze}
              isAnalyzing={isAnalyzing}
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
          displayPhotos={displayPhotos}
          setLightboxIndex={setLightboxIndex}
          isStaffMode={!!props.isStaffMode}
          shareGroup={noop}
          contactWhatsApp={noop}
        />
      )}
    </motion.div>
  );
});

