import React, { useEffect, useRef } from 'react';
import { VirtualGrid, VirtualGridHandle } from '@/components/virtualizer/VirtualGrid';
import { Photo, TranslationType } from '../../types';
import { useUIStore, useShallow } from '@/store/useUIStore';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { translations } from '../../lib/translations';
import { PhotoGridSkeleton } from './PhotoGridSkeleton';

interface VirtualPhotoGridProps {
  photos: Photo[];
  isFetching?: boolean;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
  renderCard: (photo: Photo, index: number) => React.ReactNode;
  columns: number;
  ref?: React.Ref<VirtualGridHandle>;
}

const multiSelectSelector = (s: any) => ({
  update: s.update
});

export function VirtualPhotoGrid({
  photos,
  isFetching,
  isFetchingNextPage,
  hasNextPage,
  onLoadMore,
  renderCard,
  columns,
  ref
}: VirtualPhotoGridProps) {
  const { filters } = useUrlFilters();
  const { appLang } = useUIStore(useShallow(s => ({ 
    appLang: s.appLang
  })));
  const t = (translations[appLang as keyof typeof translations] || translations.en) as TranslationType;

  // Anchoring logic: when returning from a group detail view
  useEffect(() => {
    if (filters.groupId === null && photos.length > 0) {
      const targetId = filters.photoId;
      if (targetId) {
        const index = photos.findIndex(p => p.id === targetId || p.group_id === targetId);
        if (index !== -1) {
          setTimeout(() => {
            (ref as React.RefObject<VirtualGridHandle>)?.current?.scrollToIndex(index);
          }, 100);
        }
      }
    }
  }, [filters.groupId, photos, filters.photoId, ref]);

  const isLoading = isFetching && photos.length === 0;

  if (isLoading) {
    return (
      <div className="absolute inset-0 z-10 bg-brand-bg overflow-y-auto">
        <PhotoGridSkeleton columns={columns} />
      </div>
    );
  }

  return (
    <div className="h-full w-full overscroll-y-contain relative">
      <div className="h-full w-full">
        <VirtualGrid
          ref={ref}
          count={photos.length}
          lanes={columns}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage && onLoadMore) {
              onLoadMore();
            }
          }}
          containerClassName="px-2 pt-2 pb-4"
          renderItem={(index) => {
            const photo = photos[index];
            if (!photo) return null;
            return (
              <div className="p-1.5 sm:p-2 w-full">
                {renderCard(photo, index)}
              </div>
            );
          }}
          footer={
            <PhotoGridFooter 
              isFetchingNextPage={!!isFetchingNextPage}
              hasNextPage={!!hasNextPage}
              hasPhotos={photos.length > 0}
              textLoading={t.loading || '正在载入更多...'}
              textEndOfList={t.endOfList || '已经到底啦'}
              columns={columns}
            />
          }
        />
      </div>
    </div>
  );
}

const PhotoGridFooter = ({ 
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
        className="grid gap-2 p-1.5 sm:p-2 pb-8"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100 animate-pulse border border-slate-50" />
        ))}
      </div>
    );
  }
  if (!isFetchingNextPage && !hasNextPage && hasPhotos) {
    return (
      <div className="py-4 flex flex-col items-center justify-center gap-2 pb-8">
        <span className="text-[10px] text-slate-400 font-medium tracking-tight">
          {textEndOfList}
        </span>
      </div>
    );
  }
  return null;
}
