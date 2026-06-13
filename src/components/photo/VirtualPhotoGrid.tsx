import React, { useEffect, useRef, useCallback } from 'react';
import { VirtualGrid, VirtualGridHandle } from '@/components/virtualizer/VirtualGrid';
import { Photo, TranslationType, Category, Tag } from '../../types';
import { useUIStore, useShallow } from '@/store/useUIStore';
import { useUrlFilters } from '@/hooks';
import { translations } from '@/locales';
import { PhotoGridSkeleton } from './PhotoGridSkeleton';
import { LoadMoreIndicator } from './LoadMoreIndicator';
import { EmptyState } from '../ui/EmptyState';
import { PackageOpen } from 'lucide-react';
import { useScrollRestoration } from '@/hooks/core/useScrollRestoration';
import { useContainerWidth } from '@/hooks/core/useContainerWidth';
import { useSkeletonCount } from '@/hooks/useSkeletonCount';

interface VirtualPhotoGridProps {
  photos: Photo[];
  isFetching?: boolean;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
  renderCard: (photo: Photo, index: number, categories: Category[]) => React.ReactNode;
  columns: number;
  ref?: React.Ref<VirtualGridHandle>;
  restoreKey?: string;
  categories?: Category[];
}

export const VirtualPhotoGrid = ({
  photos,
  isFetching,
  isFetchingNextPage,
  hasNextPage,
  onLoadMore,
  renderCard,
  columns,
  ref,
  restoreKey,
  categories = []
}: VirtualPhotoGridProps) => {
  const { filters } = useUrlFilters();
  const skeletonCount = useSkeletonCount(columns);
  const appLang = useUIStore((s) => s.appLang);
  const t = (translations[appLang as keyof typeof translations] || translations.en) as TranslationType;

  const internalGridRef = useRef<VirtualGridHandle | null>(null);
  
  const isFetchingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleLoadMore = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage || isFetchingRef.current) return

    isFetchingRef.current = true;
    timeoutRef.current = setTimeout(() => {
      isFetchingRef.current = false;
      console.warn('[VirtualGrid] 加載超時，已解鎖');
    }, 10000);

    onLoadMore?.();
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  useEffect(() => {
    if (!isFetchingNextPage) isFetchingRef.current = false;
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      isFetchingRef.current = false;
    };
  }, [isFetchingNextPage]);

  // Merge refs
  const gridRef = (node: VirtualGridHandle | null) => {
    internalGridRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as React.MutableRefObject<VirtualGridHandle | null>).current = node;
  };


  const { recordScroll } = useScrollRestoration(
    restoreKey,
    photos.length,
    (offset) => internalGridRef.current?.scrollTo(offset)
  );

  const { containerRef, width: containerWidth } = useContainerWidth<HTMLDivElement>();

  const estimatedRowHeight = (() => {
    const padding = 16;
    const cardWidth = (containerWidth - padding) / Math.max(1, columns);
    return Math.max(80, cardWidth); 
  })();

  const internalRenderItem = (index: number) => {
    const photo = photos[index];
    if (!photo) return null;
    return (
      <div key={photo.id} className="p-1.5 sm:p-2 w-full">
        {renderCard(photo, index, categories)}
      </div>
    );
  };

  if (isFetching && photos.length === 0) {
    return (
      <div className="h-full w-full bg-brand-bg overflow-y-auto">
        <PhotoGridSkeleton columns={columns} count={skeletonCount} />
      </div>
    );
  }

  if (photos.length === 0) {
    const tAny = t as any;
    return (
      <div className="h-full w-full flex items-center justify-center p-8 bg-brand-bg">
        <EmptyState 
          title={filters?.searchQuery ? tAny.noResultsFound || 'No results found' : tAny.noPhotos || 'No photos'} 
          description={filters?.searchQuery ? tAny.tryDifferentKeywords || 'Try searching with different keywords.' : undefined}
          icon={<PackageOpen className="w-16 h-16 text-slate-300" />}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full overscroll-y-contain relative">
      <div className="h-full w-full">
        <VirtualGrid
          ref={gridRef}
          count={photos.length}
          lanes={columns}
          itemSize={estimatedRowHeight}
          shift={true}
          onScroll={recordScroll}
          onEndReached={handleLoadMore}
          containerClassName="px-2 pt-2 pb-4"
          renderItem={internalRenderItem}
          footer={
            <div className="pt-4 pb-8">
               <LoadMoreIndicator 
                  isFetchingNextPage={!!isFetchingNextPage}
                  hasNextPage={!!hasNextPage}
                  onLoadMore={() => onLoadMore && onLoadMore()}
               />
            </div>
          }
        />
      </div>
    </div>
  );
};


