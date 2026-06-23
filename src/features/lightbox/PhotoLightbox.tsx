import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { useUIStore } from '@/store/uiStore';
import { useFilters } from '@/hooks/useFilters';
import { Router, useAppRoute } from '@/router';
import { useAdminMaintenance } from '@/hooks/admin/useAdminMaintenance';
import { usePermission, usePublicSettings, useIsManagement } from '@/hooks';
import { LightboxInfoCard } from './components/LightboxInfoCard';
import { useAuth } from '@/lib/store';
import { Icon } from '@/components/ui/Icon';

// ✅ Directly import from low-level to reduce conflicts
import { LightboxStyled as LightboxStyledBase } from '@mshafiqyajid/react-lightbox/styled';
const LightboxStyled = LightboxStyledBase as unknown as React.ComponentType<any>; 
import '@mshafiqyajid/react-lightbox/styles.css';

/**
 * PhotoLightbox
 * Responsible for integrating lightbox view, edit session, and management actions.
 */
export function PhotoLightbox() {
  const isOpen = useUIStore(s => s.lightbox.isOpen);
  const slides = useUIStore(s => s.lightbox.slides);
  const currentIndex = useUIStore(s => s.lightbox.currentIndex);
  const closeLightbox = useUIStore(s => s.closeLightbox);
  const setLightboxIndex = useUIStore(s => s.setLightboxIndex);
  
  const filters = useFilters();
  const route = useAppRoute();
  const adminActions = useAdminMaintenance();
  const { data: settings } = usePublicSettings();
  const isManagement = useIsManagement();
  const { user } = useAuth();
  const { canEdit: canEditPermission } = usePermission();
  
  const canEdit = isManagement && (canEditPermission || !!user);

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

  if (!isOpen) return null;

  const overlays = (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --rlbx-z: 10000;
        }
        .rlbx-nav {
          z-index: 10015 !important;
        }
        .rlbx-image-area {
          margin-bottom: 96px !important;
        }
        .rlbx-thumbnails {
          background: rgba(0, 0, 0, 0.85) !important;
          backdrop-filter: blur(16px) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
          height: 84px !important;
          padding: 0.5rem 0.875rem !important;
          box-sizing: border-box !important;
        }
        .rlbx-thumb {
          width: 3.5rem !important;
          height: 3.5rem !important;
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-up {
          animation: fade-up 0.3s ease-out forwards;
        }
      `}} />

      {/* Top Toolbar Overlay */}
      {currentSlide && (
        <div 
          className="fixed top-4 right-4 flex items-center gap-1.5 p-1 bg-black/70 backdrop-blur-md rounded-full border border-white/10 pointer-events-auto z-[10020] shadow-2xl animate-fade-in"
          style={{ isolation: 'isolate' }}
        >
          {canEdit && (
            <div className="flex items-center gap-1 border-r border-white/10 pr-1.5 mr-1 bg-white/5 rounded-full py-0.5 pl-1">
              <button 
                onClick={(e) => { 
                  e.stopPropagation();
                  filters.updateFilters({ photoId: currentSlide.id, modal: 'edit' });
                }} 
                className="w-9 h-9 flex items-center justify-center rounded-full text-blue-400 hover:bg-white/10 transition-colors"
                title="编辑照片"
              >
                <Icon name="pencil" size={17} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  adminActions.handleBatchAiAnalyze([currentSlide]);
                  toast.info("已加入 AI 分析队列");
                }}
                className="w-9 h-9 flex items-center justify-center rounded-full text-purple-400 hover:bg-white/10 transition-colors"
                title="AI 分析"
              >
                <Icon name="sparkles" size={17} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm("确定要永久删除这张照片吗？")) {
                    adminActions.deletePhoto.mutate(currentSlide.id);
                  }
                }} 
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
              const text = `您好，我想查询这项产品：\n${currentSlide.title || ''}\n${window.location.origin}/photo/${currentSlide.id}`;
              window.open(`https://wa.me/${settings?.contact_whatsapp || ''}?text=${encodeURIComponent(text)}`, '_blank');
            }} 
            className="w-9 h-9 flex items-center justify-center rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all active:scale-95"
            title="WhatsApp 洽谈"
          >
            <Icon name="share-2" size={17} />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }} 
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all active:scale-95"
            title="关闭"
          >
            <Icon name="x" size={17} />
          </button>
        </div>
      )}

      {/* Info Card Overlay - Perfectly flushed with rail */}
      {currentSlide && (
        <div className="fixed bottom-[84px] left-0 right-0 flex flex-col items-center pointer-events-none px-4 z-[10020] animate-fade-up">
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
