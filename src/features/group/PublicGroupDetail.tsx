import React, { useRef } from 'react';
import { motion } from 'lite-sleek';
import { logger } from '@/lib/logger';
import { useAppRouter } from '@/lib/router';
import { useGroupData } from './hooks/useGroupData';
import { PhotoListItem } from '@/types/api';
import { Photo, Group, Category } from '@/types';
import { PhotoGridContent } from '@/components/photo/PhotoGridContent';
import { PublicPhotoCard } from '@/components/photo/PublicPhotoCard';
import { useLightbox, photosToLightboxSlides } from '@/lib/lightbox';
import { useFilters, useTranslation, useCategories } from '@/hooks';
import { PublicGroupHeader } from './components/PublicGroupHeader';
import { Button } from '@/components/shared/Button';
import { useUI, uiStore, useSignal, gridColumns as gridColumnsSignal } from '@/lib/store';
import { usePublicSettings } from '@/hooks/settings/useSettings';
import { WhatsAppDialog } from '@/components/shared/WhatsAppDialog';
import { useColumns } from '@/hooks';
import { FilterBar } from '@/features/filters';

function PublicPhotoGrid({ photos, categories, onPhotoClick, gridRef }: { photos: PhotoListItem[]; categories?: Category[]; onPhotoClick: (id: string, index: number, e?: React.MouseEvent) => void; gridRef?: React.Ref<any> }) {
  const columns = useSignal(gridColumnsSignal) as number;
  
  const renderItem = React.useCallback((photo: PhotoListItem, index: number) => {
    return (
      <motion.div
        initial={{ opacity: 0, transform: 'translateY(10px)' }}
        animate={{ opacity: 1, transform: 'translateY(0)' }}
        transition="all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
        className="w-full h-full p-[1px]"
      >
        <PublicPhotoCard 
          photo={photo} 
          onClick={(e: any) => onPhotoClick(photo.id, index, e)} 
          showGroupsCollapsed={false}
          hasSearchQuery={false}
        />
      </motion.div>
    );
  }, [onPhotoClick]);

  return (
    <PhotoGridContent 
      photos={photos}
      dataVersion="1"
      isPending={false}
      isFetching={false}
      isFetchingNextPage={false}
      hasNextPage={false}
      fetchNextPage={() => {}}
      columns={columns}
      renderItem={renderItem}
      gridRef={gridRef}
    />
  );
}

export function PublicGroupDetailPage() {
  const { params } = useAppRouter();
  const { groupId: fGroupId, photoId, setPhotoId } = useFilters();
  const groupId = ((params as { slug?: string }).slug) || fGroupId;
  
  const [anchor, setAnchor] = React.useState(true);
  const { categories } = useCategories();
  const { lang, uiTranslations: t } = useTranslation();
  
  const { group, photos: rawPhotos, totalCount, loading, error } = useGroupData({ groupId, isAdmin: false });

  const photos = React.useMemo(() => rawPhotos || [], [rawPhotos]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const showWhatsAppChoice = useUI(s => s.showWhatsAppChoice);
  const patchUI = useUI(s => s.patch);
  const { open: openLightbox } = useLightbox();
  const { data: settings } = usePublicSettings();
  const lightboxItems = React.useMemo(() => photosToLightboxSlides(photos), [photos]);

  // Anchoring effect
  React.useEffect(() => {
    if (anchor && photoId && !loading && photos.length > 0) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        const element = document.querySelector(`[data-photo-id="${photoId}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add a temporary highlight effect 
          element.classList.add('ring-4', 'ring-primary', 'scale-95');
          setTimeout(() => {
             element.classList.remove('ring-4', 'ring-primary', 'scale-95');
             // Clear anchor from URL so it doesn't trigger again on reload
             setAnchor(false);
          }, 2000);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [anchor, photoId, loading, photos.length]);

  const handlePhotoClick = (id: string, index: number) => {
      openLightbox(lightboxItems, index);
  };

  const handleScrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="p-1 sm:p-2 lg:p-4 w-full h-full">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1 sm:gap-2">
           {Array.from({ length: 18 }).map((_, i) => (
             <div key={i} className="aspect-square w-full bg-surface-soft rounded-xl border border-border-soft animate-shimmer" />
           ))}
        </div>
      </div>
    );
  }
  if (error) return <div className="p-4 text-red-500">{t.errorPrefix}{error}</div>;
  if (!group) return <div className="p-4 flex flex-col justify-center items-center h-full"><div className="text-xl text-slate-500 mb-4">{t.groupNotFound}</div><Button onClick={() => window.history.back()}>{t.goBack}</Button></div>;
  
  return (
    <div className="min-h-screen bg-slate-50 group-detail-public flex flex-col relative w-full h-[100dvh] overflow-hidden overscroll-none">
      <div className="flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm relative">
        <PublicGroupHeader 
          group={group} 
          photoCount={totalCount} 
        />
      </div>
      {/* FilterBar removed */}
      <div className="flex-1 relative bg-slate-50">
        <div className="absolute inset-0">
          <PublicPhotoGrid photos={photos} categories={categories} onPhotoClick={handlePhotoClick} gridRef={scrollContainerRef} />
        </div>
      </div>

      <WhatsAppDialog 
        open={showWhatsAppChoice} 
        onOpenChange={(val) => patchUI({ showWhatsAppChoice: val })} 
      />
    </div>
  );
}
