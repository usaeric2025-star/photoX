import React from 'react';
import { useFilters } from '@/hooks/useFilters';
import { usePublicPhotos, usePhotoCount, useTranslation } from '@/hooks';
import { getTranslatedCategoryName } from '@/services/category/utils';
import { Photo } from '@/types';
import { PublicHeader } from '@/components/layouts/headers/PublicHeader';
import { FiltersBar } from '@/components/filters/FiltersBar';
import { VirtualPhotoGrid } from '@/components/photo/VirtualPhotoGrid';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useColumns } from '@/features/layout/hooks/useColumns';
import { logger } from '@/lib/logger';
import { PublicPhotoCard } from '@/components/photo/PublicPhotoCard';
import { YarlLightbox } from '@/components/lightbox/YarlLightbox';

export default function PublicPage() {
  const { columns } = useColumns();
  const { 
    gridPhotos: photos,
    isPending,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefreshing,
    categories,
    tags,
    filters
  } = usePublicPhotos();

  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState(0);
  const { photoId, setPhotoId } = useFilters();

  // Sync URL photoId to lightbox state
  React.useEffect(() => {
    if (photoId && photos.length > 0 && !lightboxOpen) {
      const index = photos.findIndex(p => p.id === photoId);
      if (index !== -1) {
        setLightboxIndex(index);
        setLightboxOpen(true);
      }
    }
  }, [photoId, photos]);

  const { lang, uiTranslations: t } = useTranslation();

  const lightboxItems = React.useMemo(() => photos.map((p: any) => {
    const catName = p.category_id ? getTranslatedCategoryName(String(p.category_id), categories, lang, t) : '';
    return {
      id: p.id,
      src: p.image_url,
      thumbnail: p.thumbnail_sm_url || p.image_url,
      title: p.name?.[lang as 'zh'] || p.item_code || '',
      description: p.description?.[lang as 'zh'] || '',
      category: catName,
      tags: p.tags?.map((t: any) => t.name) || [],
      photo: p,
    };
  }), [photos, categories, lang, t]);

  const handlePhotoClick = (id: string) => {
    const index = photos.findIndex((p: any) => p.id === id);
    if (index !== -1) {
      setLightboxIndex(index);
      setLightboxOpen(true);
      setPhotoId(id);
    }
  };

  const handleIndexChange = (index: number) => {
    setLightboxIndex(index);
    const photo = photos[index];
    if (photo && photo.id !== photoId) {
      setPhotoId(photo.id);
    }
  };

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
    <PublicPhotoCard 
      photo={photo} 
      showGroupsCollapsed={filters.showGroupsCollapsed}
      hasSearchQuery={!!filters.search}
      sharedCategories={sharedCategories}
      sharedTags={tags}
      onClick={() => handlePhotoClick(photo.id)}
    />
  );

  return (
    <div className="flex flex-col h-full w-full bg-slate-50" id="public-view">
      <PublicHeader 
        totalCount={totalCount ?? 0}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing || isPending}
      />
      <FiltersBar filters={filters} />
      <div className="flex-1 overflow-hidden relative">
        <ErrorBoundary>
          <VirtualPhotoGrid
            photos={photos}
            isFetching={isPending}
            isFetchingNextPage={isFetchingNextPage}
            hasNextPage={hasNextPage}
            onLoadMore={fetchNextPage}
            renderCard={renderCard}
            columns={columns}
            categories={categories}
            filters={filters}
          />
        </ErrorBoundary>
      </div>
      
      <YarlLightbox
        open={lightboxOpen}
        items={lightboxItems}
        currentIndex={lightboxIndex}
        onClose={() => {
          setLightboxOpen(false);
          setPhotoId(null);
        }}
        onIndexChange={handleIndexChange}
      />
    </div>
  );
}
