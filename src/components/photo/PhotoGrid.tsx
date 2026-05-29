import React, { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { VirtualGrid } from '@/components/virtualizer/VirtualGrid';
import { motion } from 'motion/react';
import { PHOTO_GRID_CONFIG } from '../../config/virtuoso.config';
import { Photo } from '../../types';
import { interactionBus } from '@/lib/interactionBus';
import { GalleryVariant } from '@/types/variant';
import { PhotoCard } from '../photo/PhotoCard';
import { useGalleryStore, useShallow } from '../../store';
import { translations } from '../../lib/translations';
import { PhotoGridSkeleton } from './PhotoGridSkeleton';
import { GalleryEmpty } from '../shared/GalleryEmpty';
import { PageSkeleton } from '../PageSkeleton';
import { useCategoriesQuery, useTagsQuery, useFilters, usePhotoFilters, useAdminMode, useInfinitePhotos } from '../../hooks';
import { PAGINATION } from '../../constants/config';
import { useOptionalAdmin } from '@/features/admin/useAdmin';

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

interface GridContext {
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  hasPhotos: boolean;
  textLoading: string;
  textEndOfList: string;
}

const ListFooterSkeleton = React.memo(({ columns }: { columns: number }) => {
  return (
    <div 
      className="grid gap-2 p-1 pb-32"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 animate-pulse border border-slate-50" />
      ))}
    </div>
  );
});

const MemoizedFooter = React.memo(({ 
  isFetchingNextPage, hasNextPage, hasPhotos, textLoading, textEndOfList, columns 
}: GridContext & { columns: number }) => {
  if (isFetchingNextPage) {
    return <ListFooterSkeleton columns={columns} />;
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

const photoGridSelector = (s: any) => ({
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
  });

const infiniteModeSelector = (s: any) => ({ isInfiniteMode: s.isInfiniteMode });

const multiSelectSelector = (s: any) => ({
    setSelectedIds: s.setSelectedIds,
    setIsMultiSelectMode: s.setIsMultiSelectMode
  });

export const PhotoBoard: React.FC<{ virtuosoRef?: React.Ref<any>, variant?: GalleryVariant }> = React.memo(({ virtuosoRef, variant }) => {
  const { 
    columns, setActiveGroupId, setActivePhotoId, setLightboxIndex, appLang,
    isStaffMode, viewMode, activeGroupId, activePhotoId,
    filterCatId, filterTagIds, debouncedSearchQuery, sortOrder
  } = useGalleryStore(useShallow(photoGridSelector));

  
  const isHookAdminMode = useAdminMode();
  const isPageAdmin = typeof window !== 'undefined' && window.location.pathname.includes('/admin');
  const isAdminMode = isHookAdminMode || isPageAdmin || viewMode === 'admin' || isStaffMode;

  const effectiveVariant: GalleryVariant = variant || (isAdminMode ? 'full-management' : 'public-showcase');

  const adminData = useOptionalAdmin();
  const isFirstMount = useRef(true);

  useEffect(() => {
    isFirstMount.current = false;
  }, []);

  // [STATE-BRIDGE-CONFLICT FIX] If adminData is present, we are in a managed view.
  // We MUST NOT launch an independent useInfinitePhotos query here to avoid race conditions and recursion.
  // Use a strictly exclusive condition for enabled flag.
  const shouldEnableInternalQuery = !isAdminMode && !adminData;

  // Real-time photo query based on store filters
  const infinitePhotosQueryInternal = useInfinitePhotos({
    category_id: filterCatId,
    tag_id: Array.isArray(filterTagIds) && filterTagIds.length > 0 ? filterTagIds[0] : null,
    searchQuery: debouncedSearchQuery,
    sortOrder: sortOrder,
    isAdminMode: false // Public grid query is never adminMode
  }, PAGINATION.PUBLIC_PAGE_SIZE, shouldEnableInternalQuery);

  const infinitePhotosQuery = (isAdminMode && adminData) ? adminData.infinitePhotosQuery : infinitePhotosQueryInternal;

  const photos = React.useMemo(() => {
    if (isAdminMode && adminData) {
      return adminData.photos;
    }
    return infinitePhotosQueryInternal.data?.pages.flatMap(p => p.photos) || [];
  }, [isAdminMode, adminData, infinitePhotosQueryInternal.data]);

  const isFetching = infinitePhotosQuery.isLoading;
  const isFetchingNextPage = infinitePhotosQuery.isFetchingNextPage;
  const hasNextPage = !!infinitePhotosQuery.hasNextPage;
  const loadMorePhotos = infinitePhotosQuery.fetchNextPage;
  
  const { data: categories = [] } = useCategoriesQuery();
  const { data: contextTags = [] } = useTagsQuery();
  const { filters } = useFilters();
  const showGroupsCollapsed = filters.showGroupsCollapsed;

  const lang = appLang;
  const t = translations[lang as keyof typeof translations] || translations.en;

  const { displayPhotos, gridPhotos } = usePhotoFilters(
    photos,
    categories,
    contextTags,
    {
      showGroupsCollapsed,
      isAdminModeOverride: isAdminMode
    }
  );

  const isFilteringFetching = infinitePhotosQuery.isFetching && !infinitePhotosQuery.isFetchingNextPage && !isFirstMount.current;

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

  const { isInfiniteMode } = useGalleryStore(useShallow(infiniteModeSelector));

  // [INTERACTION-BRIDGE-SYNC]
  // Sync the high-performance Interaction Bus back to the Zustand Store
  // specifically for the Batch Toolbar and global selection awareness.
  const { setSelectedIds, setIsMultiSelectMode } = useGalleryStore(useShallow(multiSelectSelector));

  useEffect(() => {
    const unsubscribe = interactionBus.subscribe((state) => {
      // Use requestAnimationFrame to batch state updates and avoid render-loop interference
      requestAnimationFrame(() => {
        setIsMultiSelectMode(state.isMultiSelect);
        setSelectedIds(Array.from(state.selectedIds));
      });
    });
    return () => { unsubscribe(); };
  }, [setIsMultiSelectMode, setSelectedIds]);

  // [CROSS-KEY-TRANSITION] [CATEGORY-SUSPENSE-UNIFIED]
  // [INTERACTION-FEEDBACK-CSS-ONLY]
  const isPending = infinitePhotosQuery.isPending || (infinitePhotosQuery.isFetching && !infinitePhotosQuery.isFetchingNextPage);
  const hasPreviousData = photos && photos.length > 0;

  const [showSkeletonOnClear, setShowSkeletonOnClear] = useState(false);
  const prevSearchQuery = useRef<string | null>(null);

  useEffect(() => {
    if (debouncedSearchQuery === '' && prevSearchQuery.current) {
      setShowSkeletonOnClear(true);
      const timer = setTimeout(() => {
        setShowSkeletonOnClear(false);
      }, 300);
      return () => clearTimeout(timer);
    }
    prevSearchQuery.current = debouncedSearchQuery;
  }, [debouncedSearchQuery]);

  if ((isPending && !hasPreviousData) || showSkeletonOnClear) {
    return (
      <div className="absolute inset-0 z-10 bg-brand-bg overflow-y-auto" id="page-skeleton-container">
        <PageSkeleton />
      </div>
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

  const isStale = isPending && hasPreviousData;

  return (
    <div className="h-full w-full overscroll-y-contain relative">
      <div className={`h-full w-full transition-all duration-300 ${isStale ? 'opacity-60 animate-pulse' : 'opacity-100'}`}>
        <VirtualGrid
          ref={virtuosoRef}
          count={gridPhotos.length}
          lanes={columns}
          estimateSize={() => 340} // Default height for PhotoCard with info
          overscan={PHOTO_GRID_CONFIG.overscan(columns)}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              loadMorePhotos();
            }
          }}
          containerClassName="px-1.5 py-2 pb-36"
          renderItem={(index) => {
            const photo = gridPhotos[index];
            if (!photo) return null;
            return (
              <div className="p-1 h-full w-full">
                <MemoizedPhotoCard
                  index={index}
                  photo={photo}
                  variant={effectiveVariant}
                  showGroupsCollapsed={showGroupsCollapsed}
                  onGroupClick={handleGroupClick}
                  onLightboxOpen={handleLightboxOpen}
                />
              </div>
            );
          }}
          footer={
            <MemoizedFooter 
              isFetchingNextPage={isFetchingNextPage}
              hasNextPage={hasNextPage}
              hasPhotos={displayPhotos.length > 0}
              textLoading={(t as any).loading || '正在载入更多...'}
              textEndOfList={(t as any).endOfList || '已经到底啦'}
              columns={columns}
            />
          }
        />
      </div>
    </div>
  );
});

export default PhotoBoard;
