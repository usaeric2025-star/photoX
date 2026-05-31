import React, { useMemo, useCallback, useEffect } from 'react';
import { GalleryVariant } from '@/types/variant';
import PhotoBoard from '@/components/photo/PhotoGrid';
import { PublicFilters } from '@/components/ui/PublicFilters';
import { useGalleryStore, useShallow } from '@/store/galleryStore';
import { usePhotoInfiniteList, useFilters, usePhotoFilters, useSettings, useCategoryList, useTagList } from '@/hooks';
const updateURL = (params: any) => console.log('updateURL stub', params);
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

export function PublicGallery({
  variant,
  onScrollToTop,
  virtualGridRef
}: PublicGalleryProps) {
  const { filters } = useFilters();
  const { settings } = useSettings(); 
  
  const { setSearch, setShowGroupsCollapsed } = useFilters();
  const { 
    setLightboxIndex,
    sortOrder, setSortOrder,
    activeGroupId, setActiveGroupId, activePhotoId, setActivePhotoId,
    columns, setColumns, showWhatsAppChoice, setShowWhatsAppChoice, appLang
  } = useGalleryStore(useShallow(s => ({
    setLightboxIndex: s.setLightboxIndex,
    sortOrder: s.sortOrder,
    setSortOrder: s.setSortOrder,
    activeGroupId: s.activeGroupId,
    setActiveGroupId: s.setActiveGroupId,
    activePhotoId: s.activePhotoId,
    setActivePhotoId: s.setActivePhotoId,
    columns: s.columns,
    setColumns: s.setColumns,
    showWhatsAppChoice: s.showWhatsAppChoice,
    setShowWhatsAppChoice: s.setShowWhatsAppChoice,
    appLang: s.appLang
  })));

  const publicSettings = settings;
  const { data: categories = [] } = useCategoryList();
  const { data: tags = [] } = useTagList();
  
  const t = useMemo(() => translations[appLang as keyof typeof translations] || translations.en, [appLang]);

  const infiniteQuery = usePhotoInfiniteList({
    category_id: filters.categoryId,
    tag_id: Array.isArray(filters.tagIds) && filters.tagIds.length > 0 ? filters.tagIds[0] : null,
    searchQuery: filters.searchQuery,
    sortOrder: sortOrder,
    isAdminMode: false,
    onlyUngrouped: false
  }, PAGINATION.PUBLIC_PAGE_SIZE, true);

  const rawPhotos = useMemo(() => {
    return infiniteQuery.data?.pages?.flatMap(p => p.photos) ?? EMPTY_ARRAY;
  }, [infiniteQuery.data]);

  const { displayPhotos, gridPhotos } = usePhotoFilters(
    rawPhotos,
    categories,
    tags,
    {
      showGroupsCollapsed: filters.showGroupsCollapsed,
      isAdminModeOverride: false
    }
  );

  const handleGroupClick = useCallback((gid: string, photoId?: string) => {
    setActiveGroupId(gid);                
    setActivePhotoId(photoId || null);
  }, [setActiveGroupId, setActivePhotoId]);

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        setColumns(3);
      } else {
        setColumns(4); // Default desktop to 4
      }
    };
    handleResize(); 

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setColumns]);


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
        <PublicFilters 
          onSearch={setSearch}
          searchQuery={filters.searchQuery || ''}
          onSortChange={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
          currentSort={sortOrder}
          onColumnsChange={(cols) => {
              setColumns(cols as 2 | 3 | 4 | 5);
              updateURL({ view: cols === 2 ? 'list' : 'grid' });
          }}
          currentColumns={columns}
          onToggleGroups={() => setShowGroupsCollapsed(!filters.showGroupsCollapsed)}
          showGroupsCollapsed={filters.showGroupsCollapsed}
        />
        <div className="flex-1 overflow-hidden bg-brand-bg relative">
            <PhotoBoard 
              photos={gridPhotos}
              isFetching={infiniteQuery.isLoading}
              isFetchingNextPage={infiniteQuery.isFetchingNextPage}
              hasNextPage={!!infiniteQuery.hasNextPage}
              onLoadMore={infiniteQuery.fetchNextPage}
              renderCard={renderCard}
              ref={virtualGridRef} 
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
            variant={variant}
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
