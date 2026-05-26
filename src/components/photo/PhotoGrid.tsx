import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import { motion } from 'motion/react';
import { PHOTO_GRID_CONFIG } from '../../config/virtuoso.config';
import { Photo } from '../../types';
import { GalleryVariant } from '@/types/variant';
import { PhotoCard } from '../photo/PhotoCard';
import { useGalleryStore, useShallow } from '../../store';
import { translations } from '../../lib/translations';
import { PhotoGridSkeleton } from './PhotoGridSkeleton';
import { GalleryEmpty } from '../shared/GalleryEmpty';
import { useCategoriesQuery, useTagsQuery, usePhotoFilters, useAdminMode, useInfinitePhotos } from '../../hooks';
import { PAGINATION } from '../../constants/config';

interface MemoizedPhotoCardProps {
  index: number;
  photo: Photo;
  variant: GalleryVariant;
  showGroupsCollapsed: boolean;
  onGroupClick: (groupId: string, photoId?: string) => void;
  onLightboxOpen: (photo: Photo) => void;
}

const MemoizedPhotoCard = React.memo(({ 
  index, photo, variant, showGroupsCollapsed, onGroupClick, 
  onLightboxOpen
}: MemoizedPhotoCardProps) => {

  const handleGroupClickInternal = useCallback((gid: string) => {
    onGroupClick(gid, photo.id);
  }, [onGroupClick, photo.id]);

  return (
    <PhotoCard 
      variant={variant}
      photo={photo}
      index={index}
      showGroupsCollapsed={showGroupsCollapsed}
      onGroupClick={handleGroupClickInternal}
      onLightboxOpen={onLightboxOpen}
    />
  );
});
MemoizedPhotoCard.displayName = 'MemoizedPhotoCard';

function getSkeletonCount(total: number = 0, columns: number): number {
  if (total > 0) return Math.min(total, columns * 3);
  return columns * 3;
}

interface VirtuosoGridContext {
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  hasPhotos: boolean;
  textLoading: string;
  textEndOfList: string;
}

const MemoizedFooter = React.memo(({ context }: { context?: VirtuosoGridContext }) => {
  if (!context) return null;
  const { isFetchingNextPage, hasNextPage, hasPhotos, textLoading, textEndOfList } = context;
  if (isFetchingNextPage) {
    return (
      <div className="py-8 flex flex-col items-center justify-center gap-2 pb-32">
        <div className="w-5 h-5 border-[2px] border-slate-300 border-t-slate-800 rounded-full animate-spin" />
        <span className="text-[10px] text-slate-500 font-medium tracking-tight animate-pulse">
          {textLoading}
        </span>
      </div>
    );
  }
  if (!isFetchingNextPage && !hasNextPage && hasPhotos) {
    return (
      <div className="py-8 flex flex-col items-center justify-center gap-2 pb-32">
        <span className="text-[10px] text-slate-400 font-medium tracking-tight">
          {textEndOfList}
        </span>
      </div>
    );
  }
  return null;
});
MemoizedFooter.displayName = 'MemoizedFooter';

const VIRTUOSO_COMPONENTS = {
  Footer: MemoizedFooter
};

export const PhotoBoard: React.FC<{ virtuosoRef?: React.Ref<any>, variant?: GalleryVariant }> = React.memo(({ virtuosoRef, variant }) => {
  const { 
    columns, setActiveGroupId, setActivePhotoId, setLightboxIndex, appLang,
    isStaffMode, viewMode, activeGroupId, activePhotoId,
    filterCatId, filterTagIds, debouncedSearchQuery, sortOrder
  } = useGalleryStore(useShallow(s => ({
    columns: s.columns,
    setActiveGroupId: s.setActiveGroupId,
    setActivePhotoId: s.setActivePhotoId,
    setLightboxIndex: s.setLightboxIndex,
    appLang: s.appLang,
    isStaffMode: s.isStaffMode,
    viewMode: s.viewMode,
    activeGroupId: s.activeGroupId,
    activePhotoId: s.activePhotoId,
    filterCatId: s.filterCatId,
    filterTagIds: s.filterTagIds,
    debouncedSearchQuery: s.debouncedSearchQuery,
    sortOrder: s.sortOrder
  })));
  
  const isHookAdminMode = useAdminMode();
  const isPageAdmin = typeof window !== 'undefined' && window.location.pathname.includes('/admin');
  const isAdminMode = isHookAdminMode || isPageAdmin || viewMode === 'admin' || isStaffMode;

  const effectiveVariant: GalleryVariant = variant || (isAdminMode ? 'full-management' : 'public-showcase');

  // Real-time photo query based on store filters
  const infinitePhotosQuery = useInfinitePhotos({
    category_id: filterCatId,
    tag_id: Array.isArray(filterTagIds) && filterTagIds.length > 0 ? filterTagIds[0] : null,
    searchQuery: debouncedSearchQuery,
    sortOrder: sortOrder,
    isAdminMode
  }, isAdminMode ? PAGINATION.ADMIN_BATCH_SIZE : PAGINATION.PUBLIC_PAGE_SIZE);

  const photos = React.useMemo(() => infinitePhotosQuery.data?.pages.flatMap(p => p.photos) || [], [infinitePhotosQuery.data]);
  const isFetching = infinitePhotosQuery.isLoading;
  const isFetchingNextPage = infinitePhotosQuery.isFetchingNextPage;
  const hasNextPage = !!infinitePhotosQuery.hasNextPage;
  const loadMorePhotos = infinitePhotosQuery.fetchNextPage;
  
  const { data: categories = [] } = useCategoriesQuery();
  const { data: contextTags = [] } = useTagsQuery();
  const showGroupsCollapsed = useGalleryStore(s => s.showGroupsCollapsed);

  const lang = appLang;
  const t = translations[lang] || translations['zh'];

  const { displayPhotos, gridPhotos } = usePhotoFilters(
    photos,
    categories,
    contextTags,
    {
      showGroupsCollapsed,
      isAdminModeOverride: isAdminMode
    }
  );

  const isFilteringFetching = infinitePhotosQuery.isFetching && !infinitePhotosQuery.isFetchingNextPage;

  const virtuosoContext = React.useMemo(() => ({
    isFetchingNextPage,
    hasNextPage,
    hasPhotos: displayPhotos.length > 0,
    textLoading: (t as any).loading || '正在载入更多...',
    textEndOfList: (t as any).endOfList || '已经到底啦'
  }), [isFetchingNextPage, hasNextPage, displayPhotos.length, t]);

  const handleGroupClick = useCallback((gid: string, photoId?: string) => {
     setActiveGroupId(gid);
     if (photoId) {
       setActivePhotoId(photoId);
     }
  }, [setActiveGroupId, setActivePhotoId]);

  const handleLightboxOpen = useCallback((photo: Photo) => {
    const realIndex = displayPhotos.findIndex(p => p?.id === photo.id);
    if (realIndex !== -1) {
      setLightboxIndex(realIndex);
    }
  }, [displayPhotos, setLightboxIndex]);

  // Anchoring logic: when returning from a group detail view
  const prevActiveGroupId = useRef<string | null>(null);
  useEffect(() => {
    if (activeGroupId === null && prevActiveGroupId.current !== null) {
      const targetId = activePhotoId || prevActiveGroupId.current;
      if (targetId) {
        const index = gridPhotos.findIndex(p => p.id === targetId || p.group_id === targetId);
        if (index !== -1) {
          setTimeout(() => {
            (virtuosoRef as any).current?.scrollToIndex({ index, align: 'center', behavior: 'auto' });
          }, 100);
        }
      }
    }
    prevActiveGroupId.current = activeGroupId;
  }, [activeGroupId, gridPhotos, activePhotoId, virtuosoRef]);

  const isInitialLoad = infinitePhotosQuery.isLoading && photos.length === 0;

  if (isInitialLoad) {
    const skeletonCount = getSkeletonCount(0, columns); // Will default appropriately
    return (
      <motion.div 
        key="skeleton"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 z-10 bg-brand-bg overflow-y-auto"
      >
        <PhotoGridSkeleton columns={columns} count={skeletonCount} />
      </motion.div>
    );
  }

  if (gridPhotos.length === 0 && !isFetching) {
    return (
      <motion.div
         key="empty"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="h-full relative"
      >
        <GalleryEmpty t={t} />
      </motion.div>
    );
  }

  return (
    <div className="h-full w-full overscroll-y-contain relative">
      <div className={`h-full w-full transition-opacity duration-300 ${isFilteringFetching ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        <VirtuosoGrid
          ref={virtuosoRef}
          style={{ height: '100%', width: '100%' }}
          data={gridPhotos}
        computeItemKey={(index, item) => {
          const p = item as Photo;
          if (!p) return `loading-${index}`;
          const idValue = p.type === 'group' ? p.group_id : p.id;
          return idValue ? (p.type === 'group' ? `group-${p.group_id}` : `photo-${p.id}`) : `admin-fallback-${index}`;
        }}
        endReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            loadMorePhotos();
          }
        }}
        overscan={PHOTO_GRID_CONFIG.overscan(columns)}
        increaseViewportBy={PHOTO_GRID_CONFIG.increaseViewportBy}
        useWindowScroll={false}
        itemClassName="virtuoso-grid-item"
        listClassName={`grid gap-2 px-1.5 py-2 pb-36 ${columns === 2 ? 'grid-cols-2' : columns === 3 ? 'grid-cols-3' : 'grid-cols-5'}`}
        itemContent={(index, photo) => {
          return (
            <MemoizedPhotoCard
              index={index}
              photo={photo}
              variant={effectiveVariant}
              showGroupsCollapsed={showGroupsCollapsed}
              onGroupClick={handleGroupClick}
              onLightboxOpen={handleLightboxOpen}
            />
          );
        }}
        context={virtuosoContext}
        components={VIRTUOSO_COMPONENTS}
      />
      </div>
      {isFilteringFetching && (
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full shadow-lg border border-slate-110 flex items-center gap-1.5 z-50 animate-pulse">
          <div className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-ping" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Updating...</span>
        </div>
      )}
    </div>
  );
});

export default PhotoBoard;
