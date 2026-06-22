import React from 'react';
import { LightboxEngine, useLightboxStore } from '@/lib/lightbox';
import { useFilters } from '@/hooks/useFilters';
import { useRoute, routes } from '@/router';
import { useAdminMaintenance } from '@/hooks/admin/useAdminMaintenance';
import { usePublicSettings } from '@/hooks/settings/useSettings';
import { LightboxInfoCard } from './components/LightboxInfoCard';
import { LightboxSlide } from '@/lib/lightbox';

export function PhotoLightbox() {
  const state = useLightboxStore();
  const filters = useFilters();
  const route = useRoute();
  const adminActions = useAdminMaintenance();
  const { data: settings } = usePublicSettings();

  const handleClose = () => {
    if (route.name === 'photo') {
      routes.home().push();
    } else {
      filters.setPhotoId(null);
    }
  };

  const handleView = (index: number) => {
    const photo = state.slides[index];
    if (photo && photo.id) {
      if (route.name === 'photo') {
        routes.photo({ photoId: photo.id }).replace();
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
      console.error('Download failed:', error);
      window.open(slide.src, '_blank');
    }
  };

  const handleShare = (slide: LightboxSlide) => {
    const text = `您好，我想查詢這項產品：\n${slide.title}\n${slide.itemCode ? `編號：${slide.itemCode}\n` : ''}${window.location.origin}/photo/${slide.id}`;
    const whatsappUrl = `https://wa.me/${settings?.contact_whatsapp || ''}?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <LightboxEngine 
      onClose={handleClose}
      onView={handleView}
      renderFooter={(slide) => (
        <LightboxInfoCard 
          slide={slide} 
          onEdit={route.name === 'admin' || route.name === 'adminGroup' ? (id) => { 
            filters.setPhotoId(id); 
            filters.setModal('edit'); 
          } : undefined}
          onDelete={(id) => adminActions.deletePhoto.mutate(id)}
          onSetCover={(id) => adminActions.updatePhoto.mutate({ id, updates: { is_group_cover: true } })}
          onDownload={handleDownload}
          onShare={handleShare}
        />
      )}
    />
  );
}
