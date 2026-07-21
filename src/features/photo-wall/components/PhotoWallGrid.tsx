import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { DreamMasonry } from 'dream-masonry';
import { PhotoListItem } from '#src/types/api.js';
import { PhotoCard } from './PhotoCard.js';
import { useGrid } from '#src/context/GridContext.js';
import { useTranslation } from '#src/hooks/index.js';
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

/**
 * PhotoWallGrid
 * 
 * 瀑布流網格組件，使用 dream-masonry 實現高性能無限捲動。
 */
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
  const { appLang } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [scrollParent, setScrollParent] = useState<HTMLElement | null>(() => {
    if (typeof document !== 'undefined') {
      return document.getElementById('photo-wall-scroll-container');
    }
    return null;
  });

  useEffect(() => {
    if (scrollParent) return; 
    if (!containerRef.current) return;
    
    // 優先尋找指定的滾動容器 ID，否則向上查找
    const target = document.getElementById('photo-wall-scroll-container');
    if (target) {
      setScrollParent(target);
      return;
    }

    let parent = containerRef.current.parentElement;
    while (parent) {
      const overflowY = window.getComputedStyle(parent).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') {
        setScrollParent(parent);
        break;
      }
      parent = parent.parentElement;
    }
  }, [scrollParent]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || isLoading || !hasMore) return;
    loadMore();
  }, [loadMore, isLoadingMore, isLoading, hasMore]);

  // Scroll listener backup
  useEffect(() => {
    const parent = scrollParent || document.getElementById('photo-wall-scroll-container');
    if (!parent) return;

    const handleScroll = () => {
      if (!hasMore || isLoadingMore || isLoading) return;
      const { scrollHeight, scrollTop, clientHeight } = parent;
      // 提高觸發靈敏度，剩餘 800px 時即觸發
      if (scrollHeight - scrollTop - clientHeight < 800) {
        handleLoadMore();
      }
    };

    parent.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      parent.removeEventListener('scroll', handleScroll);
    };
  }, [scrollParent, hasMore, isLoadingMore, isLoading, handleLoadMore]);

  const scrollContainer = useMemo(() => {
    if (!scrollParent) return null;
    return { current: scrollParent };
  }, [scrollParent]);

  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver 雙重保障：當捲動到接近底部觸發器時，自動加載下一頁
  useEffect(() => {
    if (!hasMore || isLoading || isLoadingMore) return;

    const trigger = loadMoreTriggerRef.current;
    if (!trigger) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          handleLoadMore();
        }
      },
      {
        root: scrollParent || null,
        rootMargin: '400px', // 提前 400px 觸發加載，確保流暢度
      }
    );

    observer.observe(trigger);

    return () => {
      observer.disconnect();
    };
  }, [scrollParent, hasMore, isLoading, isLoadingMore, handleLoadMore]);

  const renderItem = useCallback((photo: PhotoListItem, index?: number) => (
    <div className="w-full h-full" data-photo-id={photo.id}>
      <PhotoCard 
        photo={photo} 
        hideGroupBadge={hideGroupBadge} 
        isGroupDetail={isGroupDetail} 
        priority={typeof index === 'number' && index < 12}
        lang={appLang}
      />
    </div>
  ), [hideGroupBadge, isGroupDetail, appLang]);

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
      暂无照片 / No Photos
    </div>
  ), []);

  return (
    <div ref={containerRef} className="page-container pt-4 pb-32">
      <DreamMasonry
        key={scrollParent ? 'resolved' : 'pending'}
        items={photos}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        isLoading={isLoading && photos.length === 0}
        isFetchingMore={isLoadingMore}
        scrollContainer={scrollContainer as React.RefObject<HTMLElement> | undefined}
        maxColumnCount={columns}
        minColumnCount={columns}
        gutterSize={12}
        renderItem={renderItem}
        renderLoader={renderLoader}
        renderEmpty={renderEmpty}
        scrollThreshold={1200}
        overscan={800}
      />
      
      {/* 獨立、高可靠性之無限捲動觸發錨點 */}
      {hasMore && !isLoading && !isLoadingMore && (
        <div ref={loadMoreTriggerRef} className="h-4 w-full" id="infinite-scroll-trigger" />
      )}
      
      {isLoadingMore && photos.length > 0 && (
        <div className="py-12 flex justify-center w-full">
           <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-navy/40 animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-brand-navy/60 animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-brand-navy animate-bounce"></div>
           </div>
        </div>
      )}
    </div>
  );
}
