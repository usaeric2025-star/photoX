import { logger } from '@/lib/logger';
import React, { useEffect } from 'react';
import { AdminPhotoGrid } from '@/components/photo/AdminPhotoGrid';
import { SelectionToolbar } from '@/features/selection';
import { useTranslation, useColumns, usePhotoGrid, useFilters } from '@/hooks';
import { AdminEmptyState } from '@/pages/AdminPage/AdminEmptyState';
import { PhotoErrorDisplay } from '@/components/photo/PhotoErrorDisplay';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useLightbox, photosToLightboxSlides } from '@/lib/lightbox';
import { useAdminMaintenance } from '@/hooks/admin/useAdminMaintenance';
import { useUI, uiStore } from '@/lib/store';

export function AdminContainer() {
  const filters = useFilters({ enableStatus: true });
  const isAggregated = filters.showGroupsCollapsed && !filters.search && !filters.category && !filters.tags?.length;
  
  const photoGridData = usePhotoGrid({
    categoryId: filters.category,
    tagId: filters.tags?.[0],
    searchQuery: filters.search,
    sortOrder: filters.sort,
    onlyGroupsCover: isAggregated
  }, 'admin');
  
  const { uiTranslations: labels } = useTranslation();
  const { columns } = useColumns();
  const adminActions = useAdminMaintenance();
  
  const openLightbox = useUI(s => s.openLightbox);
  
  const photos = React.useMemo(() => photoGridData.photos || [], [photoGridData.photos]);
  const lightboxItems = React.useMemo(() => photosToLightboxSlides(photos), [photos]);

  const handlePhotoClick = (_photoId: string, index: number) => {
      openLightbox(lightboxItems, index);
  };

  // Handle deep links for lightbox: if URL has photoId but lightbox is closed, open it.
  useEffect(() => {
    const photoId = filters.photoId;
    if (photoId && photos.length > 0) {
      const state = uiStore.getState();
      // Only auto-open if it's not already open or if slides are missing
      if (!state.lightboxIsOpen || state.lightboxSlides.length === 0) {
        const index = photos.findIndex(p => p.id === photoId);
        if (index !== -1) {
          logger.info('[AdminContainer] Auto-opening lightbox for deep link', { photoId, index });
          openLightbox(lightboxItems, index);
        }
      }
    }
  }, [filters.photoId, photos, lightboxItems, openLightbox]);
  
  if (photoGridData.isError) {
    return (
      <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative justify-center items-center p-8" id="main-admin-error-screen">
        <ErrorBoundary fallback={null}>
          <PhotoErrorDisplay error={photoGridData.error} onRetry={() => photoGridData.refetch()} />
        </ErrorBoundary>
      </div>
    );
  }

  if (photoGridData.photos.length === 0 && !photoGridData.isPending) {
    return (
      <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative" id="main-admin-screen">
        <AdminEmptyState labels={labels} />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative" id="main-admin-screen">
       <div className="flex-1 min-h-0 relative flex flex-col">
          <AdminPhotoGrid 
            {...photoGridData}
            columns={columns}
            filters={filters}
            onPhotoClick={handlePhotoClick}
          />
       </div>
       <SelectionToolbar />
    </div>
  );
}
