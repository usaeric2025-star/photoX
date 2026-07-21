import React from 'react';
import { DataFallback } from '#src/components/ui/DataFallback.js';
import { PhotoGridSkeleton } from '#src/components/photo/PhotoSkeleton.js';
import { PhotoWallGrid } from '#src/features/photo-wall/components/PhotoWallGrid.js';
import { ErrorBoundary } from '#src/components/shared/ErrorBoundary.js';
import { Group } from '#src/types/index.js';
import { PhotoListItem } from '#src/types/api.js';

interface GroupDetailLayoutProps {
  loading: boolean;
  error: Error | string | null;
  group?: Group;
  photos: PhotoListItem[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  header: React.ReactNode;
  floatingActions?: React.ReactNode;
  emptyTitle?: string;
  emptyMessage?: string;
  onRetry?: () => void;
  bottomPadding?: boolean;
}

export function GroupDetailLayout({
  loading,
  error,
  group,
  photos,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  header,
  floatingActions,
  emptyTitle = '分组未找到',
  emptyMessage,
  onRetry,
  bottomPadding = false,
}: GroupDetailLayoutProps) {
  const loadingSkeleton = (
    <div className="p-1 sm:p-2 lg:p-4 w-full h-full bg-slate-50">
      <PhotoGridSkeleton count={24} />
    </div>
  );

  return (
    <DataFallback
      loading={loading}
      error={error}
      isEmpty={!loading && !error && !group}
      emptyTitle={emptyTitle}
      emptyMessage={emptyMessage}
      onRetry={onRetry}
      loadingSkeleton={loadingSkeleton}
    >
      {group && (
        <div className="bg-slate-50 flex flex-col relative w-full h-[100dvh] overflow-hidden overscroll-none text-base">
          <div className="flex-shrink-0 bg-white border-b border-slate-100 shadow-sm relative z-10">
            {header}
          </div>
          
          <div id="photo-wall-scroll-container" className={`flex-1 bg-slate-50 transition-all duration-300 ${bottomPadding ? 'pb-16' : ''} overflow-y-auto p-1 sm:p-2 relative`}>
            <ErrorBoundary>
              <PhotoWallGrid
                photos={photos}
                hasMore={hasNextPage}
                isLoading={loading}
                isLoadingMore={isFetchingNextPage}
                loadMore={fetchNextPage}
                hideGroupBadge={true}
                isGroupDetail={true}
              />
            </ErrorBoundary>
          </div>
          
          {floatingActions}
        </div>
      )}
    </DataFallback>
  );
}
