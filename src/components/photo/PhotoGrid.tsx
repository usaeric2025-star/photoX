import React, { useCallback, useEffect, useRef } from 'react';
import { VirtualGrid } from '@/components/virtualizer/VirtualGrid';
import { motion } from 'motion/react';
import { PHOTO_GRID_CONFIG } from '../../config/virtuoso.config';
import { Photo } from '../../types';
import { interactionBus } from '@/lib/interactionBus';
import { PhotoCard } from '../photo/PhotoCard';
import { useGalleryStore, useShallow } from '@/store/galleryStore';
import { translations } from '../../lib/translations';
import { PageSkeleton } from '../PageSkeleton';
import { useFilters } from '../../hooks';

interface PhotoBoardProps {
  photos: Photo[];
  isFetching?: boolean;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
  renderCard: (photo: Photo, index: number) => React.ReactNode;
  virtualGridRef?: React.RefObject<any>;
  columns: number;
}

const photoGridLayoutSelector = (s: any) => ({
  columns: s.columns,
  appLang: s.appLang,
  activeGroupId: s.activeGroupId,
  activePhotoId: s.activePhotoId,
  setActiveGroupId: s.setActiveGroupId,
  setActivePhotoId: s.setActivePhotoId
});

const multiSelectSelector = (s: any) => ({
  setSelectedIds: s.setSelectedIds,
  setIsMultiSelectMode: s.setIsMultiSelectMode
});

export const PhotoBoard: React.FC<PhotoBoardProps> = React.memo(({ 
  photos, 
  isFetching,
  isFetchingNextPage,
  hasNextPage,
  onLoadMore,
  renderCard,
  virtualGridRef, 
  columns
}) => {
  const { 
    appLang, activeGroupId, activePhotoId
  } = useGalleryStore(useShallow(photoGridLayoutSelector));

  const t = translations[appLang as keyof typeof translations] || translations.en;

  // Anchoring logic: when returning from a group detail view
  useEffect(() => {
    if (activeGroupId === null && photos.length > 0) {
      const targetId = activePhotoId;
      if (targetId) {
        const index = photos.findIndex(p => p.id === targetId || p.group_id === targetId);
        if (index !== -1) {
          setTimeout(() => {
            (virtualGridRef as any)?.current?.scrollToIndex(index);
          }, 100);
        }
      }
    }
  }, [activeGroupId, photos, activePhotoId, virtualGridRef]);

  // [INTERACTION-BRIDGE-SYNC]
  const { setSelectedIds, setIsMultiSelectMode } = useGalleryStore(useShallow(multiSelectSelector));

  useEffect(() => {
    const unsubscribe = interactionBus.subscribe((state) => {
      requestAnimationFrame(() => {
        setIsMultiSelectMode(state.isMultiSelect);
        setSelectedIds(Array.from(state.selectedIds));
      });
    });
    return () => { unsubscribe(); };
  }, [setIsMultiSelectMode, setSelectedIds]);

  const isLoading = isFetching && photos.length === 0;

  if (isLoading) {
    return (
      <div className="absolute inset-0 z-10 bg-brand-bg overflow-y-auto">
        <PageSkeleton />
      </div>
    );
  }

  return (
    <div className="h-full w-full overscroll-y-contain relative">
      <div className="h-full w-full">
        <VirtualGrid
          ref={virtualGridRef}
          count={photos.length}
          lanes={columns}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage && onLoadMore) {
              onLoadMore();
            }
          }}
          containerClassName="px-1.5 py-2"
          renderItem={(index) => {
            const photo = photos[index];
            if (!photo) return null;
            return (
              <div className="p-1 w-full">
                {renderCard(photo, index)}
              </div>
            );
          }}
          footer={
            <MemoizedFooter 
              isFetchingNextPage={!!isFetchingNextPage}
              hasNextPage={!!hasNextPage}
              hasPhotos={photos.length > 0}
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

const MemoizedFooter = React.memo(({ 
  isFetchingNextPage, hasNextPage, hasPhotos, textLoading, textEndOfList, columns 
}: {
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  hasPhotos: boolean;
  textLoading: string;
  textEndOfList: string;
  columns: number;
}) => {
  if (isFetchingNextPage) {
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
  }
  if (!isFetchingNextPage && !hasNextPage && hasPhotos) {
    return (
      <div className="py-8 flex flex-col items-center justify-center gap-2 pb-16">
        <span className="text-[10px] text-slate-400 font-medium tracking-tight">
          {textEndOfList}
        </span>
      </div>
    );
  }
  return null;
});
MemoizedFooter.displayName = 'MemoizedFooter';

export default PhotoBoard;
