import React from 'react';
import { PhotoListItem } from '@/types/api';
import VirtualGrid from '@/components/virtualizer/VirtualGrid';
import { AdminPhotoCard } from './AdminPhotoCard';
import { PublicPhotoCard } from './PublicPhotoCard';
import { LoadMoreIndicator } from './LoadMoreIndicator';
import { EmptyState } from '../ui/EmptyState';
import { Icon } from '@/components/ui/Icon';

import { PhotoCardSkeleton } from '../ui/Skeleton';

interface PhotoGridContentProps {
  photos: PhotoListItem[];
  dataVersion: string;
  isPending: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  columns: number;
  mode: 'admin' | 'public';
  filters?: any;
  onPhotoClick?: (id: string, e?: React.MouseEvent) => void;
  gridRef?: React.Ref<any>;
  onScroll?: (offset: number) => void;
}

export function PhotoGridContent({ 
  photos, 
  dataVersion, 
  isPending, 
  columns, 
  mode,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  filters,
  onPhotoClick,
  gridRef,
  onScroll
}: PhotoGridContentProps) {
  const showGroupsCollapsed = filters?.showGroupsCollapsed !== false;
  const hasSearchQuery = !!filters?.search;

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const width = entries[0].contentRect.width;
      if (width > 0) {
        setContainerWidth(width);
      }
    });

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  const estimatedHeight = React.useMemo(() => {
    const width = containerWidth || 1200;
    // Each column is containerWidth / columns. Padding of p-0.5 or sm:p-1 doesn't add to row height because
    // the card has style aspect-square (1:1), so outerHeight === outerWidth === containerWidth / columns.
    const itemHeight = Math.round(width / columns);
    return Math.max(120, itemHeight);
  }, [containerWidth, columns]);

  if (isPending) {
    const skeletonCount = Math.max(columns * 3, 12);
    return (
      <div className="p-2 w-full h-full">
        <div 
           className="grid gap-1 sm:gap-2" 
           style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
           {Array.from({ length: skeletonCount }).map((_, i) => (
             <PhotoCardSkeleton key={i} />
           ))}
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    const hasSearch = !!filters?.search;
    return (
      <div className="h-full w-full flex items-center justify-center p-8 bg-brand-bg">
        <EmptyState 
          title={hasSearch ? 'No results found' : 'No photos'} 
          description={hasSearch ? 'Try searching with different keywords.' : undefined}
          icon={<Icon name="package-open" className="w-16 h-16 text-slate-300" />}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full min-h-0 relative">
      <VirtualGrid
        ref={gridRef}
        onScroll={onScroll}
        count={photos.length}
        dataVersion={dataVersion}
        lanes={columns}
        itemSize={estimatedHeight} 
        shift={true}
        containerClassName="px-2 pt-2"
        onEndReached={fetchNextPage}
        renderItem={(index) => {
          const photo = photos[index];
          if (!photo) return null;
          return (
            <div key={photo.id} className="p-0.5 sm:p-1 w-full">
              {mode === 'admin' 
                ? <AdminPhotoCard 
                    photo={photo} 
                    onClick={(e) => onPhotoClick?.(photo.id, e)} 
                    showGroupsCollapsed={showGroupsCollapsed}
                    hasSearchQuery={hasSearchQuery}
                  />
                : <PublicPhotoCard 
                    photo={photo} 
                    onClick={(e) => onPhotoClick?.(photo.id, e)} 
                    showGroupsCollapsed={showGroupsCollapsed}
                    hasSearchQuery={hasSearchQuery}
                  />
              }
            </div>
          );
        }}
        footer={
          <div className="pt-4 pb-8">
             <LoadMoreIndicator 
                isFetchingNextPage={isFetchingNextPage}
                hasNextPage={hasNextPage}
                onLoadMore={fetchNextPage}
             />
          </div>
        }
      />
    </div>
  );
}
