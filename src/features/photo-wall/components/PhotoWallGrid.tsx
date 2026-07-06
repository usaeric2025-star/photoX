import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { DreamMasonry } from 'dream-masonry';
import { PhotoListItem } from '#src/types/api.js';
import { PhotoCard } from './PhotoCard.js';
import { useGrid } from '#src/context/GridContext.js';
import { PhotoSkeleton } from '#src/components/photo/PhotoSkeleton.js';

interface PhotoWallGridProps {
  photos: PhotoListItem[];
  hasMore: boolean;
  isLoading?: boolean;
  isLoadingMore: boolean;
  loadMore: () => void;
  hideGroupBadge?: boolean;
  isGroupDetail?: boolean;
  isAggregated?: boolean;
}

export function PhotoWallGrid({
  photos,
  hasMore,
  isLoading = false,
  isLoadingMore,
  loadMore,
  hideGroupBadge = false,
  isGroupDetail = false,
  isAggregated = false,
}: PhotoWallGridProps) {
  const { columns } = useGrid();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollParent, setScrollParent] = useState<HTMLElement | null>(() => {
    if (typeof document !== 'undefined') {
      return document.getElementById('photo-wall-scroll-container');
    }
    return null;
  });

  useEffect(() => {
    if (scrollParent) return; // Already resolved synchronously

    if (!containerRef.current) return;
    
    // Find closest parent that is scrollable
    let parent = containerRef.current.parentElement;
    while (parent) {
      const overflowY = window.getComputedStyle(parent).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') {
        setScrollParent(parent);
        break;
      }
      parent = parent.parentElement;
    }
  }, []);

  // Create a new ref-like object whenever scrollParent resolves/changes
  // to force dream-masonry's hooks (useGrid, useInfiniteScroll) to re-run and bind listeners correctly
  const scrollContainer = useMemo(() => {
    if (!scrollParent) return null;
    return { current: scrollParent };
  }, [scrollParent]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || isLoading) return;
    loadMore();
  }, [loadMore, isLoadingMore, isLoading]);

  const renderItem = useCallback((photo: PhotoListItem, index?: number) => (
    <div className="w-full h-full" data-photo-id={photo.id}>
      <PhotoCard 
        photo={photo} 
        hideGroupBadge={hideGroupBadge} 
        isGroupDetail={isGroupDetail} 
        priority={typeof index === 'number' && index < 12}
      />
    </div>
  ), [hideGroupBadge, isGroupDetail]);

  const renderLoader = useCallback(() => (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {Array.from({ length: columns * 3 }).map((_, i) => (
        <PhotoSkeleton 
          key={`loader-skeleton-${i}`} 
          isGroup={isAggregated && i % 4 === 0} 
        />
      ))}
    </div>
  ), [columns, isAggregated]);

  const renderEmpty = useCallback(() => (
    <div className="text-center py-20 text-gray-500 w-full">
      暂无照片
    </div>
  ), []);

  return (
    <div ref={containerRef} className="page-container pt-4 pb-32">
      <DreamMasonry
        key={scrollParent ? 'resolved' : 'pending'}
        items={photos as PhotoListItem[]}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        isLoading={isLoading && photos.length === 0}
        isFetchingMore={isLoadingMore}
        scrollContainer={scrollContainer as React.RefObject<HTMLElement> | undefined}
        maxColumnCount={columns}
        minColumnCount={columns}
        minColumnWidth={10}
        gutterSize={12}
        renderItem={renderItem}
        renderLoader={renderLoader}
        renderEmpty={renderEmpty}
        scrollThreshold={1000}
        overscan={600}
        hysteresis={10}
      />
      
      {isLoadingMore && photos.length > 0 && (
        <div className="py-12 flex justify-center w-full">
           <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"></div>
           </div>
        </div>
      )}
    </div>
  );
}

