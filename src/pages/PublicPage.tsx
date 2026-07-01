import React, { useMemo, useState, useRef } from 'react';
import { useFilters } from '@/features/filters';
import { useTranslation, usePublicSettings, usePhotoGrid } from '@/hooks';
import { PublicHeader } from '@/components/layouts/headers/PublicHeader';
import { FilterBar } from '@/features/filters';
import { PublicPhotoGrid } from '@/components/photo/PublicPhotoGrid';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useColumns } from '@/hooks';
import { useLightbox, photosToLightboxSlides } from '@/lib/lightbox';
import { useUI, type UIStoreState } from '@/lib/store';
import { WhatsAppDialog } from '@/components/shared/WhatsAppDialog';
import { PhotoErrorDisplay } from '@/components/photo/PhotoErrorDisplay';
import { Icon } from '@/components/ui/Icon';
import { ErrorFactory } from '@/lib/error/ErrorFactory';

export default function PublicPage() {
  const { 
    category, 
    tags, 
    search, 
    sort, 
    showGroupsCollapsed,
  } = useFilters();
  
  const { columns } = useColumns();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const gridRef = useRef<any | null>(null);
  
  const isAggregated = showGroupsCollapsed;
  
  const photoGridData = usePhotoGrid({
    categoryId: (category && category !== 'all' && category !== '') ? category : undefined,
    tagId: (tags && tags.length > 0) ? tags[0] : undefined,
    searchQuery: search || undefined,
    sortOrder: sort || undefined,
    onlyGroupsCover: isAggregated
  }, 'public');

  const { 
    photos: rawPhotos, 
    totalCount,
    refetch,
    isError,
    error,
    isFetching,
  } = photoGridData;

  const photos = useMemo(() => rawPhotos || [], [rawPhotos]);
  const lightboxItems = useMemo(() => photosToLightboxSlides(photos), [photos]);

  const { open: openLightbox } = useLightbox();
  
  const showWhatsAppChoice = useUI((s: UIStoreState) => s.showWhatsAppChoice);
  const patch = useUI(s => s.patch);
  const { uiTranslations: t } = useTranslation();

  const handleRefresh = () => {
    refetch();
  };

  const handlePhotoClick = (_id: string, index: number) => {
    openLightbox(lightboxItems, index);
  };

  if (isError) {
    return (
      <div className="flex flex-col h-full w-full bg-surface-soft">
        <PublicHeader totalCount={totalCount} onRefresh={handleRefresh} isRefreshing={false} />
        <div className="flex-1 flex items-center justify-center p-8">
           <ErrorBoundary fallback={null}>
             <PhotoErrorDisplay error={error} onRetry={() => refetch()} />
           </ErrorBoundary>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col h-full w-full bg-surface-base relative overflow-hidden" 
      id="public-view"
    >
      <div className="absolute inset-0 pointer-events-none opacity-0 select-none">PUBLIC_PAGE_RENDERED</div>
      
      <PublicHeader 
        totalCount={totalCount}
        onRefresh={handleRefresh}
        isRefreshing={isFetching}
      />

      <FilterBar mode="public" className="border-b shadow-sm" />

      <div className="flex-1 min-h-0 relative bg-surface-soft overflow-hidden">
        <ErrorBoundary>
          <div className="absolute inset-0">
            <PublicPhotoGrid 
              {...photoGridData}
              columns={columns}
              gridRef={gridRef}
              onScroll={(offset) => setShowScrollTop(offset > 300)}
              filters={{ category, tags, search, sort, showGroupsCollapsed }}
              onPhotoClick={handlePhotoClick}
              error={error}
              onRetry={() => refetch()}
            />
          </div>
        </ErrorBoundary>
      </div>

      <div className="fixed bottom-6 right-6 flex flex-col gap-3">
        {showScrollTop && (
          <button
            onClick={() => gridRef.current?.scrollToIndex(0)}
            type="button"
            className="w-12 h-12 flex items-center justify-center rounded-full bg-surface-overlay backdrop-blur-xl text-text-main shadow-lg hover:bg-white transition-all active:scale-90 group focus:outline-none"
            title={t.backToTop}
          >
            <Icon name="arrow-up" size={22} className="group-hover:-translate-y-0.5 transition-transform" />
          </button>
        )}
        <button
          onClick={() => {
            patch({ showWhatsAppChoice: true, pendingPhoto: null });
          }}
          type="button"
          className="w-12 h-12 flex items-center justify-center rounded-full bg-success text-text-on-primary shadow-lg hover:opacity-90 transition-all active:scale-90 focus:outline-none"
          title={t.whatsAppInquiry}
        >
          <Icon name="message-circle" size={26} solid />
        </button>
      </div>

      <WhatsAppDialog 
        open={showWhatsAppChoice} 
        onOpenChange={(val) => patch({ showWhatsAppChoice: val })} 
      />
    </div>
  );
}
