import React from 'react';
import { useFilters } from '@/hooks/useFilters';
import { usePublicPhotos, usePhotoCount } from '@/hooks';
import { PublicHeader } from '@/components/layouts/headers/PublicHeader';
import { FiltersBar } from '@/components/filters/FiltersBar';
import { VirtualPhotoGrid } from '@/components/photo/VirtualPhotoGrid';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useColumns } from '@/store/useUIStore';
import { PhotoCard } from '@/components/photo/PhotoCard';
import { Photo } from '@/types';

export default function PublicPage() {
  const [columns] = useColumns();
  const { 
    gridPhotos: photos,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefreshing,
    categories,
    tags,
    filters
  } = usePublicPhotos();

  console.log('[PublicPage] Rendering:', {
    photosCount: photos.length,
    isLoading,
    hasNextPage,
    filters
  });

  const { data: totalCount, refetch: refetchCount } = usePhotoCount({
    category_id: filters.category || undefined,
    tag_id: filters.tags && filters.tags.length > 0 ? filters.tags[0] : undefined,
    searchQuery: filters.search || undefined,
    isAdminMode: false
  });

  const handleRefresh = () => {
    refetch();
    refetchCount();
  };

  const renderCard = (photo: Photo, index: number, sharedCategories: any[]) => (
    <PhotoCard 
      photo={photo} 
      index={index}
      showGroupsCollapsed={true}
      hasSearchQuery={!!filters.search}
      sharedCategories={sharedCategories}
      sharedTags={tags}
      canPin={false}
    />
  );

  return (
    <div className="flex flex-col h-full w-full bg-slate-50" id="public-view">
      <PublicHeader 
        totalCount={totalCount ?? 0}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing || isLoading}
      />
      <FiltersBar filters={filters} />
      <div className="flex-1 overflow-hidden relative">
        <ErrorBoundary>
          <VirtualPhotoGrid
            photos={photos}
            isFetching={isLoading}
            isFetchingNextPage={isFetchingNextPage}
            hasNextPage={hasNextPage}
            onLoadMore={fetchNextPage}
            renderCard={renderCard}
            columns={columns}
            categories={categories}
            filters={filters}
            restoreKey="public_view_vlist_restored"
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}
