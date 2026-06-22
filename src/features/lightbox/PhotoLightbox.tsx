import React from 'react';
import { LightboxEngine, useLightboxStore } from '@/lib/lightbox';
import { useFilters } from '@/hooks/useFilters';
import { useRoute, routes } from '@/router.ts';
import { useAdminMaintenance } from '@/hooks/admin/useAdminMaintenance';
import { LightboxInfoCard } from './components/LightboxInfoCard';

export function PhotoLightbox() {
  const state = useLightboxStore();
  const filters = useFilters();
  const route = useRoute();
  const adminActions = useAdminMaintenance();

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
        />
      )}
    />
  );
}
