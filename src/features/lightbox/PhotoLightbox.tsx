import React, { useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { useUIStore } from '@/store/uiStore';
import { useFilters } from '@/hooks/useFilters';
import { Router, useAppRoute } from '@/router';
import { useAdminMaintenance } from '@/hooks/admin/useAdminMaintenance';
import { usePermission, usePublicSettings } from '@/hooks';
import { LightboxInfoCard } from './components/LightboxInfoCard';
import { Icon } from '@/components/ui/Icon';
import { Photo } from '@/types';
import { LightboxSlide } from '@/lib/lightbox/types';

// ✅ Directly import from low-level to reduce conflicts
import { LightboxStyled as LightboxStyledBase } from '@mshafiqyajid/react-lightbox/styled';
import '@mshafiqyajid/react-lightbox/styles.css';

interface LightboxImage {
  src: string;
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
  settings: any; 
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
  const { isOpen, slides, currentIndex, closeLightbox, setLightboxIndex } = useUIStore(s => ({
    isOpen: s.lightboxIsOpen,
    slides: s.lightboxSlides,
    currentIndex: s.lightboxCurrentIndex,
    closeLightbox: s.closeLightbox,
    setLightboxIndex: s.setLightboxIndex
  }));
  
  console.log('[PhotoLightbox] Rendering', { isOpen, slidesCount: slides.length, currentIndex });
  
  const filters = useFilters();
  const route = useAppRoute();
  const adminActions = useAdminMaintenance();
  const { data: settings } = usePublicSettings();
  const { canEdit: canEditPermission } = usePermission();
  
  const canEdit = canEditPermission;

  const handleClose = () => {
    closeLightbox();
    if (route?.name === 'photo') {
      Router.push("home");
    } else {
      filters.setPhotoId(null);
    }
  };

  const handleView = (index: number) => {
    if (index === currentIndex) return;
    const photo = slides[index];
    if (photo?.id) {
      setLightboxIndex(index);
      if (route?.name === 'photo') {
        Router.replace("photo", { photoId: photo.id });
      } else {
        filters.setPhotoId(photo.id);
      }
    }
  };

  const images = useMemo(() => slides.map((s) => ({
    src: s.src,
    alt: s.alt ?? '',
    title: s.title,
    description: s.description,
    original: s, 
  })), [slides]);

  const currentSlide = slides[currentIndex];
  const isEditModalOpen = filters.modal === 'edit';

  if (!isOpen) return null;

  const overlays = (
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
        .rlbx-image-area { margin-bottom: 96px !important; }
        .rlbx-thumbnails {
          background: rgba(0, 0, 0, 0.9) !important;
          backdrop-filter: blur(8px) !important;
          -webkit-backdrop-filter: blur(8px) !important;
          border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
          height: 84px !important;
          padding: 0.5rem 0.875rem !important;
          box-sizing: border-box !important;
        }
        .rlbx-thumb {
          width: 3.5rem !important;
          height: 3.5rem !important;
          border-radius: 4px !important;
          overflow: hidden !important;
          transition: transform 0.15s ease-out !important;
        }
        .rlbx-slide {
          transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out !important;
        }
        .rlbx-slider {
          transition: transform 0.3s ease-in-out !important;
        }
      `}} />

      {(currentSlide && !isEditModalOpen) && (
        <LightboxToolbar 
          currentSlide={currentSlide}
          canEdit={canEdit}
          settings={settings}
          onClose={handleClose}
          onEdit={() => filters.updateFilters({ photoId: currentSlide.id, modal: 'edit' })}
          onAiAnalyze={() => {
            const original = currentSlide.original as Photo;
            if (original) {
              adminActions.handleBatchAiAnalyze([original]);
            }
          }}
          onDelete={async () => {
            await adminActions.deletePhoto.mutateAsync([currentSlide.id]);
          }}
        />
      )}

      {(currentSlide && !isEditModalOpen) && (
        <div className="fixed bottom-[84px] left-0 right-0 flex flex-col items-center pointer-events-none px-4 z-[10020] transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-2">
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
      )}
    </>
  );

  const portalRoot = document.getElementById('portal-root');

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
        showThumbnails={true}
        showClose={false}
        showCaption={false}
        closeOnOverlayClick={true}
      />
      {portalRoot ? createPortal(overlays, portalRoot) : createPortal(overlays, document.body)}
    </>
  );
}
