import React, { useMemo, memo } from 'react';
import { motion } from 'lite-sleek';
import { useUI, currentEditingPhoto, useSignal, lightboxSlides, lightboxCurrentIndex } from '@/lib/store';
import { useFilters } from '@/features/filters';
import { useAppRoute, useNavigation } from '@/lib/router';
import { useAdminMaintenance } from '@/hooks/admin/useAdminMaintenance';
import { usePermission, usePublicSettings } from '@/hooks';
import { LightboxInfoCard } from './components/LightboxInfoCard';
import { AdminLightboxToolbar } from './components/AdminLightboxToolbar';
import { PublicLightboxToolbar } from './components/PublicLightboxToolbar';
import { LightboxStyles } from './components/LightboxStyles';
import { showToast } from '@/lib/ui/toast';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { Icon } from '@/components/ui/Icon';
import { Photo, AppSettings } from '@/types';
import { LightboxSlide } from '@/lib/lightbox/types';
import { logger } from '@/lib/logger';
import { getThumbnailUrl } from '@/services/mappers/utils';
import { usePhoto } from '@/hooks/photo/usePhoto';

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

import { useTranslation } from '@/hooks/core/useTranslation';

export const PhotoLightbox = memo(function PhotoLightbox() {
  const { uiTranslations: t } = useTranslation();
  const rawSlides = useSignal(lightboxSlides);
  const filters = useFilters();
  const { photoId: urlPhotoId, modal, setPhotoId } = filters;
  
  // ✅ Keep only the last valid index to remember where we were
  const [lastIndex, setLastIndex] = React.useState(0);

  // Sync lastIndex whenever we have valid data
  React.useEffect(() => {
    if (urlPhotoId && rawSlides.length > 0) {
      const idx = rawSlides.findIndex(s => s.id === urlPhotoId);
      if (idx !== -1) {
        setLastIndex(idx);
      }
    }
  }, [urlPhotoId, rawSlides]);

  const isOpen = !!(urlPhotoId && modal !== 'edit');
  const currentIndex = (urlPhotoId && rawSlides.length > 0) 
    ? Math.max(0, rawSlides.findIndex(s => s.id === urlPhotoId))
    : lastIndex;
  
  // Use rawSlides directly to keep memory low. The backdrop exit animation 
  // remains smooth, and we avoid keeping stale large slide arrays.
  const slides = rawSlides;
  
  // Use a local ref for logging to avoid excessive console noise
  const lastLoggedRef = React.useRef(0);
  if (isOpen && Date.now() - lastLoggedRef.current > 1000) {
    logger.debug('[PhotoLightbox] Active', { slidesCount: slides.length, currentIndex, urlPhotoId });
    lastLoggedRef.current = Date.now();
  }

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
    if (index === currentIndex || !isOpen) return;
    const photo = slides[index];
    if (photo?.id) {
      setPhotoId(photo.id);
    }
  };

  const coarseIndex = Math.floor(currentIndex / 10);

  const images = useMemo(() => {
    if (!isOpen && slides.length === 0) return [];
    
    const centerIndex = coarseIndex * 10;
    
    return slides.map((s, i) => {
      const originalPhoto = s.original as any;
      const hash = originalPhoto?.imageHash || originalPhoto?.image_hash;
      
      const distance = Math.abs(i - centerIndex);
      const isInWindow = distance <= 60; 
      
      const thumbUrlSrc = originalPhoto?.thumbnailUrl || originalPhoto?.imageUrl || s.src;
      const previewUrlSrc = originalPhoto?.imageUrl || s.src;
      
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
    // ✅ Include slides.length to re-calc if list changes, but stable center prevents flickering
  }, [slides, coarseIndex, isOpen]);

  const currentSlide = slides[currentIndex];
  const isEditModalOpen = filters.modal === 'edit';
  const hasThumbnails = slides.length > 1;

  // Dynamically load the detailed photo when the slide is active
  const { data: activePhoto } = usePhoto(isOpen && currentSlide?.id ? currentSlide.id : null);

  const enrichedSlide = useMemo(() => {
    if (!currentSlide) return null;
    return {
      ...currentSlide,
      title: activePhoto?.name?.zh || activePhoto?.name?.en || activePhoto?.name?.ms || activePhoto?.manualCode || currentSlide.title,
      description: activePhoto?.description?.zh || activePhoto?.description?.en || activePhoto?.description?.ms || currentSlide.description,
      price: activePhoto?.price || currentSlide.price,
      itemCode: activePhoto?.itemCode || currentSlide.itemCode,
      groupName: activePhoto?.group?.name || currentSlide.groupName,
      original: activePhoto || currentSlide.original,
    };
  }, [currentSlide, activePhoto]);

  const overlays = useMemo(() => {
    const slideToUse = enrichedSlide || currentSlide;
    if (!slideToUse || isEditModalOpen) return null;
    
    return (
      <>
        <LightboxStyles hasThumbnails={hasThumbnails} />

        {canEdit ? (
          <AdminLightboxToolbar 
            currentSlide={slideToUse}
            settings={settings}
            onClose={handleClose}
            onEdit={() => {
              const original = slideToUse.original as Photo;
              if (original) {
                currentEditingPhoto.set(original);
                filters.updateFilters({ modal: 'edit', photoId: original.id });
              }
            }}
            onAiAnalyze={() => {
              const original = slideToUse.original as Photo;
              if (original) {
                adminActions.handleBatchAiAnalyze([original]);
              }
            }}
            onDelete={async () => {
              showToast.info(t.deletingPhoto);
              try {
                await adminActions.deletePhoto.mutateAsync([slideToUse.id]);
                showToast.success(t.photoDeleted);
                handleClose();
              } catch (e) {
                ErrorFactory.handleError(e, t.deletePhotoAction);
              }
            }}
          />
        ) : (
          <PublicLightboxToolbar 
            currentSlide={slideToUse}
            settings={settings}
            onClose={handleClose}
          />
        )}

        <motion.div 
          variant="slideUp"
          transition="easeOut"
          className={`fixed ${hasThumbnails ? 'bottom-[84px]' : 'bottom-8'} left-0 right-0 flex flex-col items-center pointer-events-none px-4 z-[10020]`}
        >
          <div className="pointer-events-auto w-full max-w-2xl translate-y-[1px]">
            <LightboxInfoCard 
              slide={slideToUse} 
              onDownload={async () => {
                try {
                  const response = await fetch(slideToUse.src);
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${slideToUse.title || 'photo'}.jpg`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                } catch (e) {
                  window.open(slideToUse.src, '_blank');
                }
              }}
              onShare={() => {
                const text = t.whatsappProductQueryShort(slideToUse.title || '', `${window.location.origin}/photo/${slideToUse.id}`);
                window.open(`https://wa.me/${settings?.contact_whatsapp || ''}?text=${encodeURIComponent(text)}`, '_blank');
              }}
            />
          </div>
        </motion.div>
      </>
    );
  }, [enrichedSlide, currentSlide, isEditModalOpen, hasThumbnails, canEdit, settings, adminActions, filters]);

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
});
