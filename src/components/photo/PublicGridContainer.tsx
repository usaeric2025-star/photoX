import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import React, { useEffect } from 'react';
import { VirtualPhotoGrid } from '@/components/photo/VirtualPhotoGrid';
import { PublicFilters } from '@/components/ui/PublicFilters';
import { useUIStore, useShallow, useAppLang, useColumns } from '@/store/useUIStore';
import { useSettings, useUrlFilters, usePublicPhotos } from '@/hooks';
import { GroupDetailPage } from '@/components/groups/GroupDetailPage';
import { PhotoCard } from './PhotoCard';
import { PublicFloatingActions } from './PublicFloatingActions';
import { WhatsAppChoiceDialog } from '@/components/shared/WhatsAppChoiceDialog';
import { translations } from '@/locales';
import { Photo } from '@/types';

interface PublicGridContainerProps {
  onScrollToTop: () => void;
  virtualGridRef: any;
  onExit?: () => void;
  loginWithGoogle?: () => void;
}

export function PublicGridContainer({
  onScrollToTop,
  virtualGridRef
}: PublicGridContainerProps) {
  const { settings } = useSettings(); 
  
  const navigate = useRouterSafe().navigate;
  const { filters: urlFilters, setGroupId, setPhotoId, setSortOrder, setShowGroupsCollapsed, setSearchQuery } = useUrlFilters();

  const { 
    update, showWhatsAppChoice
  } = useUIStore(useShallow(s => ({ update: s.update, showWhatsAppChoice: s.showWhatsAppChoice })));
  
  const [appLang] = useAppLang();
  const activeLabels = (translations as any)[appLang] || translations.en;
  const [columns, setColumns] = useColumns();

  const publicSettings = settings;

  const {
    gridPhotos,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    categories,
    tags
  } = usePublicPhotos();

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        setColumns(3);
      } else {
        setColumns(5); // Default desktop to 5
      }
    };
    handleResize(); 

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setColumns]);


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

  const showGroupsCollapsed = urlFilters.showGroupsCollapsed !== false;
  const hasSearchQuery = !!urlFilters.searchQuery;

  const filterKeyHash = `${urlFilters.categoryId || 'all'}-${urlFilters.tagId || 'all'}-${encodeURIComponent(urlFilters.searchQuery || '')}-${urlFilters.sortOrder || 'newest'}`;

  const renderCard = (photo: Photo, index: number, sharedCategories: any[]) => (
    <PhotoCard 
      photo={photo} 
      index={index}
      showGroupsCollapsed={showGroupsCollapsed}
      hasSearchQuery={hasSearchQuery}
      sharedCategories={sharedCategories}
      sharedTags={tags}
      canPin={false}
    />
  );

  return (
    <div className="flex flex-col h-full bg-brand-bg w-full overflow-hidden text-text">
        <PublicFilters 
          onSearch={setSearchQuery}
          searchQuery={urlFilters.searchQuery || ''}
          onSortChange={() => setSortOrder(urlFilters.sortOrder === 'newest' ? 'oldest' : 'newest')}
          currentSort={urlFilters.sortOrder as 'newest' | 'oldest' | 'name'}
          onColumnsChange={(cols) => {
              setColumns(cols as 2 | 3 | 5);
              navigate({ 
                to: '.', search: (prev: any) => ({ ...prev, view: cols === 2 ? 'list' : 'grid' } as any) 
              });
          }}
          currentColumns={columns}
          onToggleGroups={() => setShowGroupsCollapsed(!urlFilters.showGroupsCollapsed)}
          showGroupsCollapsed={urlFilters.showGroupsCollapsed}
        />
        <div className="flex-1 overflow-hidden bg-brand-bg relative">
            <VirtualPhotoGrid 
              key={`public-photo-grid-${filterKeyHash}-${columns}`}
              restoreKey={`public_view_scroll_vlist-${filterKeyHash}`}
              photos={gridPhotos}
              isFetching={isLoading}
              isFetchingNextPage={isFetchingNextPage}
              hasNextPage={hasNextPage}
              onLoadMore={fetchNextPage}
              renderCard={renderCard}
              ref={virtualGridRef} 
              columns={columns}
              categories={categories}
            />
        </div>

        {/* GroupDetailPage moved to PublicPage for better layering */}

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
          labels={activeLabels}
          onSelect={openWhatsApp}
        />
    </div>
  );
};
