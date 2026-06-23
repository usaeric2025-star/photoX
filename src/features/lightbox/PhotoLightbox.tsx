import React from 'react';
import { LightboxEngine, useLightboxStore } from '@/lib/lightbox';
import { useFilters } from '@/hooks/useFilters';
import { Router, useAppRoute } from '@/router';
import { useAdminMaintenance } from '@/hooks/admin/useAdminMaintenance';
import { usePublicSettings, useIsManagement } from '@/hooks';
import { LightboxInfoCard } from './components/LightboxInfoCard';
import { LightboxSlide } from '@/lib/lightbox';
import { useAuth } from '@/lib/store';
import { logger } from '@/lib/logger';

import { Icon } from '@/components/ui/Icon';

export function PhotoLightbox() {
  const state = useLightboxStore();
  const filters = useFilters();
  const route = useAppRoute();
  const adminActions = useAdminMaintenance();
  const { data: settings } = usePublicSettings();

  const handleClose = () => {
    if (route?.name === 'photo') {
      Router.push("home");
    } else {
      filters.setPhotoId(null);
    }
  };

  const handleView = (index: number) => {
    const photo = state.slides[index];
    if (photo && photo.id) {
      if (route?.name === 'photo') {
        Router.replace("photo", { photoId: photo.id });
      } else {
        filters.setPhotoId(photo.id);
      }
    }
  };

  const handleDownload = async (slide: LightboxSlide) => {
    try {
      const response = await fetch(slide.src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slide.title || 'photo'}-${slide.itemCode || slide.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      logger.error('Download failed:', typeof error === 'object' && error ? error : String(error));
      window.open(slide.src, '_blank');
    }
  };

  const handleShare = (slide: LightboxSlide) => {
    const text = `您好，我想查詢這項產品：\n${slide.title}\n${slide.itemCode ? `編號：${slide.itemCode}\n` : ''}${window.location.origin}/photo/${slide.id}`;
    const whatsappUrl = `https://wa.me/${settings?.contact_whatsapp || ''}?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  const isManagement = useIsManagement();

  return (
    <LightboxEngine 
      onClose={handleClose}
      onView={handleView}
      renderHeader={(slide) => (
        isManagement ? (
          <div className="flex items-center gap-1.5 p-1 bg-black/20 backdrop-blur-md rounded-full border border-white/10">
            <button 
              onClick={(e) => { 
                e.stopPropagation();
                filters.updateFilters({ photoId: slide.id, modal: 'edit' });
              }} 
              className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600/20 text-blue-400 hover:bg-blue-600/40"
              title="編輯"
            >
              <Icon name="pencil" size={18} />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('確定要刪除這張照片嗎？')) {
                  adminActions.deletePhoto.mutate(slide.id);
                }
              }} 
              className="w-10 h-10 flex items-center justify-center rounded-full bg-red-600/20 text-red-400 hover:bg-red-600/40"
              title="刪除"
            >
              <Icon name="trash-2" size={18} />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }} 
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              title="關閉"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
        ) : (
          <div className="flex items-center p-1 bg-black/20 backdrop-blur-md rounded-full border border-white/10">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }} 
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              title="關閉"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
        )
      )}
      renderFooter={(slide) => (
        <LightboxInfoCard 
          slide={slide} 
          onDownload={handleDownload}
          onShare={handleShare}
        />
      )}
    />
  );
}
