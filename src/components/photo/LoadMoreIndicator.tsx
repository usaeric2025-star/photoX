import React, { useEffect, useRef } from 'react';
import { LoadingSpinner } from '../ui/feedback/LoadingSpinner';

interface LoadMoreIndicatorProps {
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  onLoadMore: () => void;
}

/**
 * LoadMoreIndicator component with automatic intersection observer.
 * Designed for high reliability in both virtualized and standard lists.
 */
export const LoadMoreIndicator = ({
  isFetchingNextPage,
  hasNextPage,
  onLoadMore,
}: LoadMoreIndicatorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Automatic trigger using IntersectionObserver
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: '400px' } // Pre-load 400px before reaching bottom
    );

    const currentRef = containerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  // Case 1: No more data - Show end-of-list message
  if (!hasNextPage) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 animate-in fade-in duration-500">
        <div className="h-px w-12 bg-slate-200 dark:bg-slate-800 mb-4" />
        <p className="text-slate-400 dark:text-slate-500 text-xs font-medium tracking-widest uppercase">
          已显示全部内容
        </p>
      </div>
    );
  }

  // Case 3: In viewport or Loading state
  return (
    <div 
      ref={containerRef} 
      className="flex flex-col items-center justify-center py-10 w-full min-h-[100px]"
    >
      {isFetchingNextPage ? (
        <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
          <LoadingSpinner size="md" className="text-brand-navy/40" />
          <span className="text-[11px] text-slate-400 font-medium tracking-tight">正在加载...</span>
        </div>
      ) : (
        // Observer target when not loading yet
        <div className="h-1 w-full" data-testid="load-more-trigger" />
      )}
    </div>
  );
};

