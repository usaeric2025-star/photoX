import React, { useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { useUI, currentEditingPhoto, isPhotoEditOpen, useSignal, isLightboxOpen, lightboxSlides, lightboxCurrentIndex } from '@/lib/store';
import { useFilters } from '@/features/filters';
import { useAppRoute, useNavigation } from '@/lib/router';
import { useAdminMaintenance } from '@/hooks/admin/useAdminMaintenance';
import { usePermission, usePublicSettings } from '@/hooks';
import { LightboxInfoCard } from './components/LightboxInfoCard';
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

function LightboxToolbar({ 
  currentSlide, 
  canEdit, 
  settings, 
  onClose, 
  onEdit, 
  onAiAnalyze, 
  onDelete 
}: { 
  currentSlide: LightboxSlide; 
  canEdit: boolean; 
  settings?: AppSettings; 
  onClose: () => void; 
  onEdit: () => void; 
  onAiAnalyze: () => void; 
  onDelete: () => void;
}) {
  return (
    <div 
      className="fixed top-4 right-4 flex items-center gap-1.5 p-1 bg-black/80 backdrop-blur-md rounded-full border border-white/10 pointer-events-auto z-[10020] shadow-2xl transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-2"
      style={{ isolation: 'isolate' }}
    >
      {canEdit && (
        <div className="flex items-center gap-1 border-r border-white/10 pr-1.5 mr-1 bg-white/5 rounded-full py-0.5 pl-1">
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(); }} 
            className="w-9 h-9 flex items-center justify-center rounded-full text-blue-400 hover:bg-white/10 transition-colors"
            title="编辑照片"
          >
            <Icon name="pencil" size={17} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onAiAnalyze(); }}
            className="w-9 h-9 flex items-center justify-center rounded-full text-purple-400 hover:bg-white/10 transition-colors"
            title="AI 分析"
          >
            <Icon name="sparkles" size={17} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }} 
            className="w-9 h-9 flex items-center justify-center rounded-full text-red-400 hover:bg-white/10 transition-colors"
            title="删除"
          >
            <Icon name="trash-2" size={17} />
          </button>
        </div>
      )}

      <button 
        onClick={(e) => {
          e.stopPropagation();
          const text = `您好，我想查询这项 product：\n${currentSlide.title || ''}\n${window.location.origin}/photo/${currentSlide.id}`;
          window.open(`https://wa.me/${settings?.contact_whatsapp || ''}?text=${encodeURIComponent(text)}`, '_blank');
        }} 
        className="w-9 h-9 flex items-center justify-center rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all active:scale-95"
        title="WhatsApp 洽谈"
      >
        <Icon name="share-2" size={17} />
      </button>
      <button 
        onClick={(e) => { e.stopPropagation(); onClose(); }} 
        className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all active:scale-95"
        title="关闭"
      >
        <Icon name="x" size={17} />
      </button>
    </div>
  );
}

export function PhotoLightbox() {
  const isOpen = useSignal(isLightboxOpen);
  const slides = useSignal(lightboxSlides);
  const currentIndex = useSignal(lightboxCurrentIndex);
  
  logger.debug('[PhotoLightbox] Rendering', { isOpen, slidesCount: slides.length, currentIndex });
  
  const filters = useFilters();
  const route = useAppRoute();
  const navigate = useNavigation();
  const adminActions = useAdminMaintenance();
  const { data: settings } = usePublicSettings();
  const { canEdit: canEditPermission } = usePermission();
  
  const canEdit = canEditPermission;

  const handleClose = () => {
    isLightboxOpen.set(false);
    if (route.name === 'photo') {
      navigate.home();
    }
  };

  const handleView = (index: number) => {
    if (index === currentIndex) return;
    const photo = slides[index];
    if (photo?.id) {
      lightboxCurrentIndex.set(index);
      // URL update is handled by useURLSync observing lightboxCurrentIndex
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
      const originalPhoto = s.original as Photo | undefined;
      const hash = originalPhoto?.image_hash;
      
      // 💡 Sliding Window Optimization: Only load thumbnails that are close to the current index (window of ~50 items).
      // For off-screen thumbnails, return a lightweight transparent SVG base64 to prevent
      // launching 1000+ concurrent network requests. This completely eliminates lag and browser crash!
      const distance = Math.abs(i - centerIndex);
      const isInWindow = distance <= 25; // slightly larger window for seamless coarse-grained sliding window
      
      const previewUrl = getThumbnailUrl(s.src, 1200, 1200, hash);
      const thumbUrl = isInWindow 
        ? getThumbnailUrl(s.src, 120, 120, hash)
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
        <style dangerouslySetInnerHTML={{ __html: `
          :root { --rlbx-z: 10000; }
          .rlbx-wrapper { opacity: 0; animation: rlbx-fade-in 0.2s ease-out forwards; }
          @keyframes rlbx-fade-in { to { opacity: 1; } }
          .rlbx-overlay {
            background-color: rgba(0, 0, 0, 0.9) !important;
            backdrop-filter: blur(12px) !important;
            -webkit-backdrop-filter: blur(12px) !important;
          }
          .rlbx-image {
            border-radius: 4px !important;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4) !important;
            transition: none !important;
          }
          .rlbx-nav { z-index: 10015 !important; }
          .rlbx-image-area { margin-bottom: ${hasThumbnails ? '96px' : '0px'} !important; }
          .rlbx-thumbnails {
            display: flex !important;
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            z-index: 10010 !important;
            background: rgba(0, 0, 0, 0.9) !important;
            backdrop-filter: blur(8px) !important;
            -webkit-backdrop-filter: blur(8px) !important;
            border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
            height: 84px !important;
            padding: 0.5rem 0.875rem !important;
            box-sizing: border-box !important;
            align-items: center !important;
            gap: 0.375rem !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
          }
          .rlbx-thumb {
            flex-shrink: 0 !important;
            width: 3.5rem !important;
            height: 3.5rem !important;
            border-radius: 4px !important;
            overflow: hidden !important;
            border: 2px solid transparent !important;
            opacity: 0.5 !important;
            transition: all 0.15s ease-out !important;
            background: rgba(255, 255, 255, 0.06) !important;
            padding: 0 !important;
            cursor: pointer !important;
            transform: scale(0.92) !important;
          }
          .rlbx-thumb img {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            display: block !important;
            pointer-events: none !important;
          }
          .rlbx-thumb:hover {
            opacity: 0.85 !important;
            transform: scale(1.02) !important;
          }
          .rlbx-thumb--active {
            border-color: #fff !important;
            opacity: 1 !important;
            transform: scale(1.08) !important;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5) !important;
          }
          .rlbx-slide {
            transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out !important;
          }
          .rlbx-slider {
            transition: transform 0.3s ease-in-out !important;
          }
        `}} />

        <LightboxToolbar 
          currentSlide={currentSlide}
          canEdit={canEdit}
          settings={settings}
          onClose={handleClose}
          onEdit={() => {
            const original = currentSlide.original as Photo;
            if (original) {
              currentEditingPhoto.set(original);
              isPhotoEditOpen.set(true);
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
      {isOpen && createPortal(overlays, document.body)}
    </>
  );
}
