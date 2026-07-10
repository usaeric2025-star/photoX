import React, { useEffect, useMemo, useCallback } from 'react';
import { useAppRouter } from '#lib/router/index.js';
import { useGroupData } from '#src/hooks/index.js';
import { PhotoListItem } from '#src/types/api.js';
import { useLightbox, photosToLightboxSlides } from '#lib/lightbox/index.js';
import { useFilters, useTranslation } from '#src/hooks/index.js';
import { PublicGroupHeader } from './components/PublicGroupHeader.js';
import { useUI } from '#lib/store/index.js';
import { WhatsAppDialog } from '#src/components/shared/WhatsAppDialog.js';
import { photoWallStore } from '#src/features/photo-wall/signal.js';
import { GroupDetailLayout } from './components/GroupDetailLayout.js';

export function PublicGroupDetailPage() {
  const { params } = useAppRouter();
  const { groupId: fGroupId, photoId } = useFilters();
  
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const pathSlug = pathname.startsWith('/group/') ? pathname.split('/group/')[1]?.replace(/\/$/, '') : undefined;
  const groupId = pathSlug || ((params as { slug?: string }).slug) || fGroupId;
  
  const [anchor, setAnchor] = React.useState(true);
  const { t } = useTranslation();
  
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

  const photos = useMemo(() => rawPhotos || [], [rawPhotos]);

  const showWhatsAppChoice = useUI(s => s.showWhatsAppChoice);
  const patchUI = useUI(s => s.patch);
  const { open: openLightbox } = useLightbox();

  const lightboxItems = useMemo(() => photosToLightboxSlides(photos), [photos]);

  const handlePhotoClick = useCallback((photo: PhotoListItem) => {
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
  useEffect(() => {
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

  return (
    <GroupDetailLayout
      loading={loading}
      error={error}
      group={group}
      photos={photos}
      hasNextPage={!!hasNextPage}
      isFetchingNextPage={!!isFetchingNextPage}
      fetchNextPage={fetchNextPage || (() => {})}
      emptyTitle={t('groupNotFound')}
      header={
        <PublicGroupHeader 
          group={group!} 
          photoCount={totalCount} 
        />
      }
      floatingActions={
        <WhatsAppDialog 
          open={showWhatsAppChoice} 
          onOpenChange={(val) => patchUI({ showWhatsAppChoice: val })} 
        />
      }
    />
  );
}
