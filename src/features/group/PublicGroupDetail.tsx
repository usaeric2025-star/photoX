import React, { useRef, useEffect } from 'react';
import { useAppRouter } from '#lib/router/index.js';
import { useGroupData } from '#src/hooks/index.js';
import { PhotoListItem } from '#src/types/api.js';
import { useLightbox, photosToLightboxSlides } from '#lib/lightbox/index.js';
import { useFilters, useTranslation } from '#src/hooks/index.js';
import { PublicGroupHeader } from './components/PublicGroupHeader.js';
import { Button } from '#src/components/shared/Button.js';
import { useUI } from '#lib/store/index.js';
import { usePublicSettings } from '#src/hooks/settings/useSettings.js';
import { WhatsAppDialog } from '#src/components/shared/WhatsAppDialog.js';
import { ErrorBoundary } from '#src/components/shared/ErrorBoundary.js';
import { PhotoWallGrid } from '#src/features/photo-wall/components/PhotoWallGrid.js';
import { photoWallStore } from '#src/features/photo-wall/signal.js';
import { DataFallback } from '#src/components/ui/DataFallback.js';
import { PhotoGridSkeleton } from '#src/components/photo/PhotoSkeleton.js';

export function PublicGroupDetailPage() {
  const { params } = useAppRouter();
  const { groupId: fGroupId, photoId } = useFilters();
  
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const pathSlug = pathname.startsWith('/group/') ? pathname.split('/group/')[1]?.replace(/\/$/, '') : undefined;
  const groupId = pathSlug || ((params as { slug?: string }).slug) || fGroupId;
  
  const [anchor, setAnchor] = React.useState(true);
  const { uiTranslations: t } = useTranslation();
  
  const { 
    group, 
    photos: rawPhotos, 
    totalCount, 
    loading, 
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage 
  } = useGroupData({ groupId, isAdmin: false });

  const photos = React.useMemo(() => rawPhotos || [], [rawPhotos]);
  const showWhatsAppChoice = useUI(s => s.showWhatsAppChoice);
  const patchUI = useUI(s => s.patch);
  const { open: openLightbox } = useLightbox();
  const { data: settings } = usePublicSettings();
  const lightboxItems = React.useMemo(() => photosToLightboxSlides(photos), [photos]);

  const handlePhotoClick = React.useCallback((photo: PhotoListItem) => {
    const index = photos.findIndex(p => p.id === photo.id);
    openLightbox(lightboxItems, index >= 0 ? index : 0);
  }, [photos, lightboxItems, openLightbox]);

  // Sync mode and click handler to photoWallStore
  useEffect(() => {
    photoWallStore.setState({
      mode: 'public',
      onPhotoClick: handlePhotoClick,
    });
  }, [handlePhotoClick]);

  // Anchoring effect
  React.useEffect(() => {
    if (anchor && photoId && !loading && photos.length > 0) {
      const timer = setTimeout(() => {
        const element = document.querySelector(`[data-photo-id="${photoId}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-4', 'ring-primary', 'scale-95');
          setTimeout(() => {
             element.classList.remove('ring-4', 'ring-primary', 'scale-95');
             setAnchor(false);
          }, 2000);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [anchor, photoId, loading, photos.length]);

  const loadingSkeleton = (
    <div className="p-1 sm:p-2 lg:p-4 w-full h-full">
      <PhotoGridSkeleton count={24} />
    </div>
  );

  return (
    <DataFallback
      loading={loading}
      error={error}
      isEmpty={!loading && !error && !group}
      emptyTitle={t.groupNotFound}
      loadingSkeleton={loadingSkeleton}
    >
      {group && (
        <div className="min-h-screen bg-slate-50 group-detail-public flex flex-col relative w-full h-[100dvh] overflow-hidden overscroll-none">
      <div className="flex-shrink-0 bg-white border-b border-slate-100 shadow-sm relative">
        <PublicGroupHeader 
          group={group} 
          photoCount={totalCount} 
        />
      </div>
      <div className="flex-1 bg-slate-50 overflow-y-auto p-1 sm:p-2 relative">
        <ErrorBoundary><PhotoWallGrid 
          photos={photos} 
          hasMore={!!hasNextPage} 
          isLoading={loading}
          isLoadingMore={!!isFetchingNextPage} 
          loadMore={fetchNextPage || (() => {})} 
          hideGroupBadge={true}
          isGroupDetail={true}
        />
        </ErrorBoundary>
      </div>

      <WhatsAppDialog 
        open={showWhatsAppChoice} 
        onOpenChange={(val) => patchUI({ showWhatsAppChoice: val })} 
      />
    </div>
      )}
    </DataFallback>
  );
}
