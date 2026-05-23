import React, { useCallback, useMemo } from 'react';
import { VirtuosoGrid, VirtuosoGridHandle, VirtuosoGridProps as BaseVirtuosoGridProps } from 'react-virtuoso';
import { motion, AnimatePresence } from 'motion/react';
import { VIRTUOSO_CONFIG } from '../../config/virtuoso.config';
import { Photo } from '../../types';
import { PhotoCard } from '../photo/PhotoCard';
import { useGalleryStore, useShallow } from '../../store';
import { translations } from '../../lib/translations';
import { GallerySkeleton } from '../PublicGallery/GallerySkeleton';
import { GalleryEmpty } from '../PublicGallery/GalleryEmpty';
import { useCategoriesQuery, useTagsQuery, usePhotoFilters, useAdminMode } from '../../hooks';

interface MemoizedPhotoCardProps {
  index: number;
  photo: Photo;
  isAdminMode: boolean;
  showGroupsCollapsed: boolean;
  onGroupClick: (groupId: string, photoId?: string) => void;
  onLightboxOpen: (photo: Photo) => void;
}

const MemoizedPhotoCard = React.memo(({ 
  index, photo, isAdminMode, showGroupsCollapsed, onGroupClick, 
  onLightboxOpen
}: MemoizedPhotoCardProps) => {

  const handleGroupClickInternal = useCallback((gid: string) => {
    onGroupClick(gid, photo.id);
  }, [onGroupClick, photo.id]);

  return (
    <PhotoCard 
      variant={isAdminMode ? 'admin' : 'public'}
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

export const PhotoBoard: React.FC<{ virtuosoRef?: React.Ref<any> }> = React.memo(({ virtuosoRef }) => {
  const { 
    columns, setActiveGroupId, setActivePhotoId, setLightboxIndex, appLang,
    photos, totalCount, isFetching, isFetchingNextPage, hasNextPage, loadMorePhotos,
    isStaffMode, viewMode
  } = useGalleryStore(useShallow(s => ({
    columns: s.columns,
    setActiveGroupId: s.setActiveGroupId,
    setActivePhotoId: s.setActivePhotoId,
    setLightboxIndex: s.setLightboxIndex,
    appLang: s.appLang,
    photos: s.photos,
    totalCount: s.totalCount,
    isFetching: s.isFetching,
    isFetchingNextPage: s.isFetchingNextPage,
    hasNextPage: s.hasNextPage,
    loadMorePhotos: s.loadMorePhotos,
    isStaffMode: s.isStaffMode,
    viewMode: s.viewMode
  })));
  
  const { data: categories = [] } = useCategoriesQuery();
  const { data: contextTags = [] } = useTagsQuery();
  const showGroupsCollapsed = useGalleryStore(s => s.showGroupsCollapsed);

  const isHookAdminMode = useAdminMode();
  const isPageAdmin = typeof window !== 'undefined' && window.location.pathname.includes('/admin');
  const isAdminMode = isHookAdminMode || isPageAdmin || viewMode === 'admin' || isStaffMode;

  const lang = appLang;
  const t = translations[lang] || translations['zh'];

  const { displayPhotos, gridPhotos } = usePhotoFilters(
    photos,
    categories,
    contextTags,
    {
      showGroupsCollapsed,
      isAdminModeOverride: true // PhotoBoard is used in both, but filter behavior should respect internal switches
    }
  );

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

  const isInitialLoad = (isFetching) && gridPhotos.length === 0;

  if (isInitialLoad) {
    const skeletonCount = getSkeletonCount(totalCount, columns);
    return (
      <motion.div 
        key="skeleton"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 z-10 bg-brand-bg overflow-y-auto"
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
        className="h-full relative"
      >
        <GalleryEmpty t={t} />
      </motion.div>
    );
  }

  return (
    <VirtuosoGrid
      ref={virtuosoRef}
      style={{ height: '100%', width: '100%' }}
      data={gridPhotos}
      computeItemKey={(index, item) => {
        const p = item as Photo;
        return p ? (p.type === 'group' ? `group-${p.group_id}` : `photo-${p.id}`) : `loading-${index}`;
      }}
      endReached={loadMorePhotos}
      overscan={VIRTUOSO_CONFIG.overscan(columns)}
      increaseViewportBy={VIRTUOSO_CONFIG.increaseViewportBy}
      useWindowScroll={false}
      itemClassName="virtuoso-grid-item"
      listClassName={`grid gap-2 px-1.5 py-2 ${columns === 2 ? 'grid-cols-2' : columns === 3 ? 'grid-cols-3' : 'grid-cols-5'}`}
      itemContent={(index, photo) => {
        return (
          <MemoizedPhotoCard
            index={index}
            photo={photo}
            isAdminMode={isAdminMode}
            showGroupsCollapsed={showGroupsCollapsed}
            onGroupClick={handleGroupClick}
            onLightboxOpen={handleLightboxOpen}
          />
        );
      }}
      components={{
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
          if (!isFetchingNextPage && !hasNextPage && displayPhotos.length > 0) {
             return (
               <div className="py-8 flex flex-col items-center justify-center gap-2 pb-32">
                 <span className="text-[10px] text-slate-400 font-medium tracking-tight">
                   {t.endOfList || '已经到底啦'}
                 </span>
               </div>
             );
           }
          return null;
        }
      }}
    />
  );
});

export default PhotoBoard;
