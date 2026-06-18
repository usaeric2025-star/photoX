import React from 'react';
import { useFilters } from '@/hooks/useFilters';
import { useTranslation, usePhotoGrid } from '@/hooks';
import { PublicHeader } from '@/components/layouts/headers/PublicHeader';
import { FilterBar } from '@/features/filter/FilterBar';
import { PublicPhotoGrid } from '@/components/photo/PublicPhotoGrid';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useColumns } from '@/features/layout/hooks/useColumns';
import { YarlLightbox } from '@/features/lightbox/YarlLightbox';
import { useUIStore } from '@/store/useUIStore';
import { useSettings } from '@/hooks/settings/useSettings';
import { WhatsAppChoiceDialog } from '@/components/shared/WhatsAppChoiceDialog';
import { PublicFloatingActions } from '@/components/photo/PublicFloatingActions';
import { PhotoListItem } from '@/types/api';
import { PhotoErrorDisplay } from '@/components/photo/PhotoErrorDisplay';

export default function PublicPage() {
  const { columns } = useColumns();
  const filters = useFilters();
  const photoGridData = usePhotoGrid({
    categoryId: filters.category,
    tagId: filters.tags?.[0],
    searchQuery: filters.search,
    sortOrder: filters.sort,
    onlyGroupsCover: filters.showGroupsCollapsed
  }, 'public');

  const { 
    photos, 
    totalCount,
    isPending, 
    hasNextPage,
    fetchNextPage,
    refetch,
    isError,
    error,
    isFetching,
    ref
  } = photoGridData;

  const { photoId, setPhotoId } = useFilters();
  const showWhatsAppChoice = useUIStore((s) => s.showWhatsAppChoice);
  const updateUI = useUIStore((s) => s.update);
  const { lang, uiTranslations: t } = useTranslation();
  const { settings } = useSettings();

  const lightboxIndex = React.useMemo(() => {
    if (!photoId) return -1;
    return photos.findIndex((p: any) => p.id === photoId);
  }, [photoId, photos]);

  const lightboxOpen = lightboxIndex !== -1;

  const lightboxItems = React.useMemo(() => photos.map((p: any) => {
    return {
      id: p.id,
      src: p.imageUrl,
      thumbnail: p.thumbnailUrl || p.imageUrl,
      title: p.name || '',
      description: p.description || '',
      category: p.groupName || '',
      tags: p.tags || [],
      photo: p,
    };
  }), [photos]);

  const handleIndexChange = (index: number) => {
    const photo = photos[index];
    if (photo && photo.id !== photoId) {
      setPhotoId(photo.id);
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  const openWhatsApp = (num: string) => {
    const pendingPhoto = (window as any)._pendingPhoto as any;
    let message = '';
    
    if (pendingPhoto) {
      const prompt = t.sharePrompt || "您好，我对这个家具感兴趣：";
      const itemCode = pendingPhoto.itemCode || "";
      const name = pendingPhoto.name?.zh || pendingPhoto.name?.en || "";
      const url = pendingPhoto.imageUrl || "";
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

  if (isError) {
    return (
      <div className="flex flex-col h-full w-full bg-slate-50">
        <PublicHeader totalCount={0} onRefresh={handleRefresh} isRefreshing={false} />
        <div className="flex-1 flex items-center justify-center p-8">
           <ErrorBoundary fallback={null}>
             <PhotoErrorDisplay error={error} onRetry={() => refetch()} />
           </ErrorBoundary>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-slate-50" id="public-view">
      <PublicHeader 
        totalCount={totalCount}
        onRefresh={handleRefresh}
        isRefreshing={isFetching}
      />
      <FilterBar mode="public" />
      <div className="flex-1 overflow-hidden relative">
        <ErrorBoundary>
          <PublicPhotoGrid 
            {...photoGridData}
            columns={columns}
            filters={filters}
          />
        </ErrorBoundary>
        
        <PublicFloatingActions 
          onScrollToTop={() => {}} // Handled inside VirtualGrid now or need ref
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
