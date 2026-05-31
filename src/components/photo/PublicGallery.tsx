import React, { useMemo, useCallback } from 'react';
import { GalleryVariant } from '@/types/variant';
import PhotoBoard from '@/components/photo/PhotoGrid';
import { GalleryFilters } from '@/components/ui/GalleryFilters';
import { useGalleryStore, useShallow } from '@/store/galleryStore';
import { usePhotoInfiniteList, useFilters, usePhotoFilters, useStaticData } from '@/hooks';
import { PAGINATION } from '@/constants/config';
import { PhotoLightbox } from '../PhotoLightbox';
import { GroupDetailView } from '../GroupDetailView';
import { PhotoCard } from './PhotoCard';
import { PublicFloatingActions } from './PublicFloatingActions';
import { WhatsAppChoiceDialog } from '../WhatsAppChoiceDialog';
import { translations } from '@/lib/translations';
import { Photo } from '@/types';

interface PublicGalleryProps {
  variant: GalleryVariant;
  onScrollToTop: () => void;
  virtualGridRef: any;
  onExit?: () => void;
  loginWithGoogle?: () => void;
}

const EMPTY_ARRAY: Photo[] = [];

export const PublicGallery: React.FC<PublicGalleryProps> = ({
  variant,
  onScrollToTop,
  virtualGridRef
}) => {
  const { filters } = useFilters();
  const publicSettings = useMemo(() => ({
    app_name: 'PhotoX',
    logo_url: '',
    whatsapp_1: '',
    whatsapp_1_name: '',
    whatsapp_2: '',
    whatsapp_2_name: '',
  }), []);
  const { 
    lightboxIndex, setLightboxIndex, sortOrder,
    activeGroupId, setActiveGroupId, activePhotoId, setActivePhotoId,
    columns, showWhatsAppChoice, setShowWhatsAppChoice, appLang
  } = useGalleryStore(useShallow(s => ({
    lightboxIndex: s.lightboxIndex,
    setLightboxIndex: s.setLightboxIndex,
    sortOrder: s.sortOrder,
    activeGroupId: s.activeGroupId,
    setActiveGroupId: s.setActiveGroupId,
    activePhotoId: s.activePhotoId,
    setActivePhotoId: s.setActivePhotoId,
    columns: s.columns,
    showWhatsAppChoice: s.showWhatsAppChoice,
    setShowWhatsAppChoice: s.setShowWhatsAppChoice,
    appLang: s.appLang
  })));

  const { categoryMap, tagMap, manufacturerMap } = useStaticData();

  const t = useMemo(() => translations[appLang as keyof typeof translations] || translations.en, [appLang]);

  const infiniteQuery = usePhotoInfiniteList({
    category_id: filters.categoryId,
    tag_id: Array.isArray(filters.tagIds) && filters.tagIds.length > 0 ? filters.tagIds[0] : null,
    searchQuery: filters.searchQuery,
    sortOrder: sortOrder,
    isAdminMode: false
  }, PAGINATION.PUBLIC_PAGE_SIZE, true);

  const rawPhotos = useMemo(() => {
    return infiniteQuery.data?.pages?.flatMap(p => p.photos) ?? EMPTY_ARRAY;
  }, [infiniteQuery.data]);

  const photos = useMemo(() => {
    return rawPhotos.map(photo => ({
      ...photo,
      categoryName: categoryMap.get(photo.category_id || '')?.name ?? '',
      tagNames: photo.tag_ids?.map(id => tagMap.get(id)?.name ?? '').filter(Boolean) ?? [],
      manufacturerName: manufacturerMap.get(photo.manufacturer_id || '')?.name ?? '',
    }));
  }, [rawPhotos, categoryMap, tagMap, manufacturerMap]);

  const { displayPhotos, gridPhotos } = usePhotoFilters(
    photos,
    [],
    [],
    {
      showGroupsCollapsed: filters.showGroupsCollapsed,
      isAdminModeOverride: false
    }
  );

  console.log('🧪 [PublicGallery] Filters result:', {
    incomingPhotosCount: photos.length,
    displayPhotosCount: displayPhotos.length,
    gridPhotosCount: gridPhotos.length,
    columns,
    activeGroupId,
    activePhotoId
  });

  const handleGroupClick = useCallback((gid: string, photoId?: string) => {
    setActiveGroupId(gid);
    setActivePhotoId(null);
  }, [setActiveGroupId, setActivePhotoId]);

  const handleLightboxOpen = useCallback((photo: Photo) => {
    setActivePhotoId(photo.id);
  }, [setActivePhotoId]);

  const openWhatsApp = useCallback((phone: string) => {
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const pendingPhoto = (window as any)._pendingPhoto;
    let text = 'Hello, I\'m interested in your products.';
    if (pendingPhoto) {
      const url = window.location.origin + `/h/${pendingPhoto.id}`;
      text = `Hello, I'm interested in this product: ${pendingPhoto.name || ''} (Model: ${pendingPhoto.model_number || ''}, ID: ${pendingPhoto.manual_code || ''}). Image link: ${url}`;
      (window as any)._pendingPhoto = null;
    }
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  }, []);

  const renderCard = useCallback((photo: Photo, index: number) => (
    <PhotoCard 
      photo={photo}
      index={index}
      variant={variant}
      showGroupsCollapsed={filters.showGroupsCollapsed}
      onGroupClick={(gid) => handleGroupClick(gid, photo.id)}
      onLightboxOpen={handleLightboxOpen}
    />
  ), [variant, filters.showGroupsCollapsed, handleGroupClick, handleLightboxOpen]);

  return (
    <div className="flex flex-col h-full bg-brand-bg w-full overflow-hidden text-text">
        <GalleryFilters 
          onScrollToTop={onScrollToTop}
          variant={variant}
        />
        <div className="flex-1 overflow-hidden bg-brand-bg relative">
            <PhotoBoard 
              photos={gridPhotos}
              isFetching={infiniteQuery.isLoading}
              isFetchingNextPage={infiniteQuery.isFetchingNextPage}
              hasNextPage={!!infiniteQuery.hasNextPage}
              onLoadMore={infiniteQuery.fetchNextPage}
              renderCard={renderCard}
              virtualGridRef={virtualGridRef} 
              columns={columns}
            />
        </div>

        {!activeGroupId && activePhotoId && (
          <PhotoLightbox 
            photoId={activePhotoId}
            displayPhotos={displayPhotos}
            onClose={() => setActivePhotoId(null)}
            contactWhatsApp={(photo) => {
              (window as any)._pendingPhoto = photo;
              setShowWhatsAppChoice(true);
            }}
          />
        )}

        <GroupDetailView
          activeGroupId={activeGroupId}
          setActiveGroupId={setActiveGroupId}
          initialPhotoId={activePhotoId}
          setLightboxIndex={setLightboxIndex}
          variant={variant}
        />

        <PublicFloatingActions 
          onScrollToTop={onScrollToTop} 
          onWhatsAppClick={() => {
            (window as any)._pendingPhoto = null;
            setShowWhatsAppChoice(true);
          }}
        />

        <WhatsAppChoiceDialog 
          isOpen={showWhatsAppChoice}
          onClose={() => setShowWhatsAppChoice(false)}
          settings={publicSettings}
          t={t}
          onSelect={openWhatsApp}
        />
    </div>
  );
};
