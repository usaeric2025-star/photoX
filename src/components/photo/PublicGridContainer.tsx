import React, { useMemo, useCallback, useEffect } from 'react';
import { GalleryVariant } from '@/types/variant';
import { VirtualPhotoGrid } from '@/components/photo/VirtualPhotoGrid';
import { PublicFilters } from '@/components/ui/PublicFilters';
import { useUIStore, useShallow } from '@/store/useUIStore';
import { usePhotos, useFilters, useSettings, useCategories, useTags, useUrlFilters } from '@/hooks';
import { processPhotos, cleanPhotos } from '@/lib/filters';
import { PAGINATION } from '@/constants/config';
import { PhotoLightbox } from '../PhotoLightbox';
import { GroupDetailPage } from '../GroupDetailPage';
import { PhotoCard } from './PhotoCard';
import { PublicFloatingActions } from './PublicFloatingActions';
import { WhatsAppChoiceDialog } from '../WhatsAppChoiceDialog';
import { translations } from '@/lib/translations';
import { Photo } from '@/types';
import { useNavigate } from '@tanstack/react-router';

interface PublicGridContainerProps {
  variant: GalleryVariant;
  onScrollToTop: () => void;
  virtualGridRef: any;
  onExit?: () => void;
  loginWithGoogle?: () => void;
}

const EMPTY_ARRAY: Photo[] = [];

export function PublicGridContainer({
  variant,
  onScrollToTop,
  virtualGridRef
}: PublicGridContainerProps) {
  const { filters } = useFilters();
  const { settings } = useSettings(); 
  
  const { setSearch } = useFilters();
  const navigate = useNavigate();
  const { filters: urlFilters, setGroupId, setPhotoId, setSortOrder, setShowGroupsCollapsed } = useUrlFilters();

  const { 
    update, columns, showWhatsAppChoice, appLang
  } = useUIStore(useShallow(s => ({ update: s.update, columns: s.columns, showWhatsAppChoice: s.showWhatsAppChoice, appLang: s.appLang })));

  const publicSettings = settings;
  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();
  
  const t = translations[appLang as keyof typeof translations] || translations.en;

  const infiniteQuery = usePhotos({
    category_id: filters.categoryId,
    tag_id: Array.isArray(filters.tagIds) && filters.tagIds.length > 0 ? filters.tagIds[0] : null,
    searchQuery: filters.searchQuery,
    sortOrder: urlFilters.sortOrder as 'newest' | 'oldest' | 'name',
    isAdminMode: false,
    onlyUngrouped: false
  }, PAGINATION.PUBLIC_PAGE_SIZE, true);

  const rawPhotos = useMemo(() => {
    const flat = infiniteQuery.data?.pages?.flatMap(p => p.photos) ?? EMPTY_ARRAY;
    return cleanPhotos(flat);
  }, [infiniteQuery.data?.pages]);

  const { displayPhotos, gridPhotos } = useMemo(() => processPhotos(
    rawPhotos,
    categories,
    tags,
    filters,
    urlFilters,
    {
      showGroupsCollapsed: urlFilters.showGroupsCollapsed,
      isAdminModeOverride: false
    }
  ), [rawPhotos, categories, tags, filters, urlFilters]);

  const handleGroupClick = (gid: string, photoId?: string) => {
    setPhotoId(null);
    setGroupId(gid);                
    // Only set activePhotoId (anchor) if search query is active
    if (filters.searchQuery && filters.searchQuery.trim()) {
        setPhotoId(photoId || null);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        update({ columns: 3 });
      } else {
        update({ columns: 5 }); // Default desktop to 5
      }
    };
    handleResize(); 

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [update]);


  const handleLightboxOpen = (photo: Photo) => {
    setPhotoId(photo.id);
  };

  const openWhatsApp = (phone: string) => {
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
  };

  const handleShare = (photo: Photo) => {
    (window as any)._pendingPhoto = photo;
    update({ showWhatsAppChoice: true });
  };

  const renderCard = (photo: Photo, index: number) => (
    <PhotoCard 
      photo={photo}
      index={index}
      variant={variant}
      categories={categories}
      tags={tags}
      showGroupsCollapsed={urlFilters.showGroupsCollapsed}
      onGroupClick={(gid, pid) => handleGroupClick(gid, pid || photo.id)}
      onLightboxOpen={handleLightboxOpen}
      onShare={handleShare}
    />
  );

  return (
    <div className="flex flex-col h-full bg-brand-bg w-full overflow-hidden text-text">
        <PublicFilters 
          onSearch={setSearch}
          searchQuery={filters.searchQuery || ''}
          onSortChange={() => setSortOrder(urlFilters.sortOrder === 'newest' ? 'oldest' : 'newest')}
          currentSort={urlFilters.sortOrder as 'newest' | 'oldest' | 'name'}
          onColumnsChange={(cols) => {
              update({ columns: cols as 2 | 3 | 5 });
              navigate({ 
                search: (prev) => ({ ...prev, view: cols === 2 ? 'list' : 'grid' }) 
              });
          }}
          currentColumns={columns}
          onToggleGroups={() => setShowGroupsCollapsed(!urlFilters.showGroupsCollapsed)}
          showGroupsCollapsed={urlFilters.showGroupsCollapsed}
        />
        <div className="flex-1 overflow-hidden bg-brand-bg relative">
            <VirtualPhotoGrid 
              key={`photo-grid-${urlFilters.showGroupsCollapsed ? 'collapsed' : 'expanded'}-${filters.searchQuery || ''}`}
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

        {!urlFilters.groupId && urlFilters.photoId && (
          <PhotoLightbox 
            photoId={urlFilters.photoId}
            displayPhotos={displayPhotos}
            onClose={() => setPhotoId(null)}
            onPhotoIdChange={setPhotoId}
            contactWhatsApp={(photo) => {
              (window as any)._pendingPhoto = photo;
              update({ showWhatsAppChoice: true });
            }}
            variant={variant}
          />
        )}

        <GroupDetailPage
          activeGroupId={urlFilters.groupId}
          initialPhotoId={urlFilters.photoId}
          variant={variant}
        />

        <PublicFloatingActions 
          onScrollToTop={onScrollToTop} 
          onWhatsAppClick={() => {
            (window as any)._pendingPhoto = null;
            update({ showWhatsAppChoice: true });
          }}
        />

        <WhatsAppChoiceDialog 
          isOpen={showWhatsAppChoice}
          onClose={() => update({ showWhatsAppChoice: false })}
          settings={publicSettings}
          t={t}
          onSelect={openWhatsApp}
        />
    </div>
  );
};
