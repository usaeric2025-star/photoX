import { useAtomValue } from 'jotai';
import { showWhatsAppChoiceAtom } from '#src/store/index.js';
import { patch } from '#lib/store/index.js';
import React, { useEffect, useMemo, useCallback } from 'react';
import { useGroupData } from '#src/hooks/index.js';
import { PhotoListItem } from '#src/types/api.js';
import { useLightbox, photosToLightboxSlides } from '#lib/lightbox/index.js';
import { useFilters, useTranslation } from '#src/hooks/index.js';
import { PublicGroupHeader } from './components/PublicGroupHeader.js';
import { } from '#lib/store/index.js';
import { WhatsAppDialog } from '#src/components/shared/WhatsAppDialog.js';
import { photoWallStore } from '#src/features/photo-wall/signal.js';
import { GroupDetailLayout } from './components/GroupDetailLayout.js';

import { useNormalizedLocation } from '#src/hooks/core/index.js';

import { useRoute } from 'wouter';

export function PublicGroupDetailPage() {
  const [match, params] = useRoute<{ slug: string }>('/group/:slug');
  const { groupId: fGroupId, photoId } = useFilters();
  const [location, setLocation] = useNormalizedLocation();
  
  const groupId = params?.slug || fGroupId;
  
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

  const showWhatsAppChoice = useAtomValue(showWhatsAppChoiceAtom);
  const patchUI = patch;
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

  if (loading || !groupId) {
    return (
      <GroupDetailLayout
        loading={true}
        error={null}
        group={undefined}
        photos={[]}
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchNextPage={() => {}}
        onRetry={() => {}}
        header={<div className="p-4 text-center text-slate-500 font-semibold bg-white border-b">{t('loading')}...</div>}
      />
    );
  }

  if (!group) {
    return (
      <GroupDetailLayout
        loading={false}
        error={error}
        group={undefined}
        photos={[]}
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchNextPage={() => {}}
        emptyTitle={t('groupNotFound') || "分组不存在或已合并"}
        emptyMessage={t('groupNotFoundDesc') || "该分组可能已被删除、解散或合并至其他分组。正在跳转回首頁..."}
        onRetry={() => setLocation('/')}
        header={<div className="p-4 text-center text-slate-500 font-semibold bg-white border-b">分组不存在</div>}
      />
    );
  }

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
