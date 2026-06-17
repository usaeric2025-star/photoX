import React from 'react';
import { useFilters } from '@/hooks/useFilters';
import { usePublicPhotos, usePhotoCount, useTranslation } from '@/hooks';
import { getTranslatedCategoryName } from '@/services/category/utils';
import { Photo, Category } from '@/types';
import { PublicHeader } from '@/components/layouts/headers/PublicHeader';
import { FilterBar } from '@/features/filter/components/FilterBar';
import { VirtualPhotoGrid } from '@/components/photo/VirtualPhotoGrid';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useColumns } from '@/features/layout/hooks/useColumns';
import { logger } from '@/lib/logger';
import { PublicPhotoCard } from '@/components/photo/PublicPhotoCard';
import { YarlLightbox } from '@/components/lightbox/YarlLightbox';
import { useUIStore } from '@/store/useUIStore';
import { useSettings } from '@/hooks/settings/useSettings';
import { WhatsAppChoiceDialog } from '@/components/shared/WhatsAppChoiceDialog';
import { PublicFloatingActions } from '@/components/photo/PublicFloatingActions';

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

  const { photoId, setPhotoId } = useFilters();
  const showWhatsAppChoice = useUIStore((s) => s.showWhatsAppChoice);
  const updateUI = useUIStore((s) => s.update);
  const { settings } = useSettings();
  const gridRef = React.useRef<any>(null);

  const lightboxIndex = React.useMemo(() => {
    if (!photoId) return -1;
    return photos.findIndex(p => p.id === photoId);
  }, [photoId, photos]);

  const lightboxOpen = lightboxIndex !== -1;

  const { lang, uiTranslations: t } = useTranslation();

  const lightboxItems = React.useMemo(() => photos.map((p: Photo) => {
    const catName = p.category_id ? getTranslatedCategoryName(String(p.category_id), categories, lang, t) : '';
    return {
      id: p.id,
      src: p.image_url,
      thumbnail: p.thumbnail_sm_url || p.image_url,
      title: p.name?.[lang as 'zh'] || p.item_code || '',
      description: p.description?.[lang as 'zh'] || '',
      category: catName,
      tags: p.tags?.map((t) => t.name) || [],
      photo: p,
    };
  }), [photos, categories, lang, t]);

  const handlePhotoClick = (id: string) => {
    setPhotoId(id);
  };

  const handleIndexChange = (index: number) => {
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

  const handleScrollToTop = () => {
    gridRef.current?.scrollTo(0);
  };

  const openWhatsApp = (num: string) => {
    const pendingPhoto = (window as any)._pendingPhoto as Photo | undefined;
    let message = '';
    
    if (pendingPhoto) {
      const prompt = t.sharePrompt || "您好，我对这个家具感兴趣：";
      const itemCode = pendingPhoto.item_code || "";
      const name = pendingPhoto.name?.[lang as 'zh'] || pendingPhoto.name?.en || "";
      const url = pendingPhoto.image_url || "";
      message = `${prompt}\n*${name}* (${itemCode})\n${url}`;
      (window as any)._pendingPhoto = undefined;
    } else {
      message = "您好，我正在浏览您的家具相册，想了解更多信息！";
    }
    
    const encodedText = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${num}?text=${encodedText}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    updateUI({ showWhatsAppChoice: false });
  };

  const renderCard = (photo: Photo, index: number, sharedCategories: Category[]) => (
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
      <FilterBar mode="public" />
      <div className="flex-1 overflow-hidden relative">
        <ErrorBoundary>
          <VirtualPhotoGrid
            ref={gridRef}
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
        
        <PublicFloatingActions 
          onScrollToTop={handleScrollToTop}
          onWhatsAppClick={() => updateUI({ showWhatsAppChoice: true })}
        />
      </div>
      
      <YarlLightbox
        open={lightboxOpen}
        items={lightboxItems}
        currentIndex={Math.max(0, lightboxIndex)}
        onClose={() => setPhotoId(null)}
        onIndexChange={handleIndexChange}
      />

      <WhatsAppChoiceDialog 
        isOpen={showWhatsAppChoice}
        onClose={() => updateUI({ showWhatsAppChoice: false })}
        settings={settings}
        onSelect={openWhatsApp}
        labels={t}
      />
    </div>
  );
}
