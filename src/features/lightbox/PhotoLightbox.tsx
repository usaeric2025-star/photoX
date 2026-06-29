import React, { useMemo, memo } from 'react';
import { useUI, currentEditingPhoto, useSignal, lightboxSlides, lightboxCurrentIndex } from '@/lib/store';
import { useFilters } from '@/features/filters';
import { useAppRoute, useNavigation } from '@/lib/router';
import { useAdminMaintenance } from '@/hooks/admin/useAdminMaintenance';
import { usePermission, usePublicSettings } from '@/hooks';
import { LightboxInfoCard } from './components/LightboxInfoCard';
import { LightboxToolbar } from './components/LightboxToolbar';
import { LightboxStyles } from './components/LightboxStyles';
import { showToast } from '@/lib/ui/toast';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { Icon } from '@/components/ui/Icon';
import { Photo, AppSettings } from '@/types';
import { LightboxSlide } from '@/lib/lightbox/types';
import { logger } from '@/lib/logger';
import { getThumbnailUrl } from '@/services/mappers/utils';

// ✅ Directly import from low-level to reduce conflicts
import { LightboxStyled as LightboxStyledBase } from '@mshafiqyajid/react-lightbox/styled';
import '@mshafiqyajid/react-lightbox/styles.css';

interface LightboxImage {
  src: string;
  srcSet?: string;
  alt: string;
  title?: string | { zh: string; en?: string; ms?: string };
  description?: string | { zh: string; en?: string; ms?: string } | null;
  original: Photo | LightboxSlide;
}

interface LightboxProps {
  images: LightboxImage[];
  open: boolean;
  index: number;
  onIndexChange: (index: number) => void;
  onOpenChange: (open: boolean) => void;
  zoom?: boolean;
  loop?: boolean;
  showThumbnails?: boolean;
  showClose?: boolean;
  showCaption?: boolean;
  closeOnOverlayClick?: boolean;
}

const LightboxStyled = LightboxStyledBase as unknown as React.ComponentType<LightboxProps>; 

export function PhotoLightbox() {
  const slides = useSignal(lightboxSlides);
  const filters = useFilters();
  const { photoId: urlPhotoId, modal, setPhotoId } = filters;
  
  const currentIndex = useMemo(() => {
    if (!urlPhotoId || slides.length === 0) return 0;
    const index = slides.findIndex(s => s.id === urlPhotoId);
    return index !== -1 ? index : 0;
  }, [urlPhotoId, slides]);
  
  const isOpen = !!(urlPhotoId && modal !== 'edit');
  
  logger.debug('[PhotoLightbox] Rendering', { isOpen, slidesCount: slides.length, currentIndex, urlPhotoId });
  const route = useAppRoute();
  const navigate = useNavigation();
  const adminActions = useAdminMaintenance();
  const { data: settings } = usePublicSettings();
  const { canEdit: canEditPermission } = usePermission();
  
  const isAdminRoute = route.name.startsWith('admin');
  const canEdit = canEditPermission && isAdminRoute;

  const handleClose = () => {
    setPhotoId(null);
    if (route.name === 'photo') {
      navigate.home();
    }
  };

  const handleView = (index: number) => {
    if (index === currentIndex) return;
    const photo = slides[index];
    if (photo?.id) {
      setPhotoId(photo.id);
    }
  };

  const coarseIndex = Math.floor(currentIndex / 10);

  const images = useMemo(() => {
    logger.debug('[PhotoLightbox] Calculating images sliding window', { slidesLength: slides.length, coarseIndex });
    // Use coarseIndex * 10 as the center to stabilize the images array reference
    // This prevents re-creating the 1000+ images array on every single index change,
    // making swipe transitions between slides buttery smooth!
    const centerIndex = coarseIndex * 10;
    
    return slides.map((s, i) => {
      const originalPhoto = s.original as any;
      const hash = originalPhoto?.image_hash || originalPhoto?.imageHash;
      
      // 💡 Sliding Window Optimization: Only load thumbnails that are close to the current index (window of ~50 items).
      // Since coarseIndex changes every 10 slides, the "window" is always roughly centered.
      const distance = Math.abs(i - centerIndex);
      const isInWindow = distance <= 60; // Slightly larger window to account for coarseIndex offset
      
      const thumbUrlSrc = originalPhoto?.thumbnailUrl || originalPhoto?.thumbnail_url || originalPhoto?.imageUrl || originalPhoto?.image_url || s.src;
      const previewUrlSrc = originalPhoto?.imageUrl || originalPhoto?.image_url || s.src;
      
      const previewUrl = getThumbnailUrl(previewUrlSrc, 800, undefined, hash);
      const thumbUrl = isInWindow 
        ? getThumbnailUrl(thumbUrlSrc, 120, undefined, hash)
        : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" viewBox="0 0 1 1"><rect width="1" height="1" fill="rgba(255,255,255,0.03)"/></svg>';
        
      return {
        src: previewUrl,
        srcSet: s.srcSet,
        thumb: thumbUrl,
        alt: s.alt ?? '',
        title: s.title,
        description: s.description,
        original: s, 
      };
    });
  }, [slides, coarseIndex]);

  const currentSlide = slides[currentIndex];
  const isEditModalOpen = filters.modal === 'edit';
  const hasThumbnails = slides.length > 1;

  const overlays = useMemo(() => {
    if (!currentSlide || isEditModalOpen) return null;
    
    return (
      <>
        <LightboxStyles hasThumbnails={hasThumbnails} />

        <LightboxToolbar 
          currentSlide={currentSlide}
          canEdit={canEdit}
          settings={settings}
          onClose={handleClose}
          onEdit={() => {
            const original = currentSlide.original as Photo;
            if (original) {
              currentEditingPhoto.set(original);
              filters.updateFilters({ modal: 'edit', photoId: original.id });
            }
          }}
          onAiAnalyze={() => {
            const original = currentSlide.original as Photo;
            if (original) {
              adminActions.handleBatchAiAnalyze([original]);
            }
          }}
          onDelete={async () => {
            showToast.info('正在删除照片...');
            try {
              await adminActions.deletePhoto.mutateAsync([currentSlide.id]);
              showToast.success('照片已删除');
              handleClose();
            } catch (e) {
              ErrorFactory.handleError(e, '删除照片');
            }
          }}
        />

        <div className={`fixed ${hasThumbnails ? 'bottom-[84px]' : 'bottom-8'} left-0 right-0 flex flex-col items-center pointer-events-none px-4 z-[10020] transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-2`}>
          <div className="pointer-events-auto w-full max-w-2xl translate-y-[1px]">
            <LightboxInfoCard 
              slide={currentSlide} 
              onDownload={async () => {
                try {
                  const response = await fetch(currentSlide.src);
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${currentSlide.title || 'photo'}.jpg`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                } catch (e) {
                  window.open(currentSlide.src, '_blank');
                }
              }}
              onShare={() => {
                const text = `产品：${currentSlide.title}\n${window.location.origin}/photo/${currentSlide.id}`;
                window.open(`https://wa.me/${settings?.contact_whatsapp || ''}?text=${encodeURIComponent(text)}`, '_blank');
              }}
            />
          </div>
        </div>
      </>
    );
  }, [currentSlide, isEditModalOpen, hasThumbnails, canEdit, settings, adminActions, filters]);

  return (
    <>
      <LightboxStyled
        images={images}
        open={isOpen}
        index={currentIndex}
        onIndexChange={handleView}
        onOpenChange={(open: boolean) => !open && handleClose()}
        zoom={true}
        loop={true}
        showThumbnails={hasThumbnails}
        showClose={false}
        showCaption={false}
        closeOnOverlayClick={true}
      />
      {isOpen && overlays}
    </>
  );
}
