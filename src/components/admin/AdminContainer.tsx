import { logger } from '#lib/logger';
import React, { useEffect } from 'react';
import { AdminPhotoGrid } from '#src/components/photo/AdminPhotoGrid';
import { SelectionToolbar } from '#src/features/selection';
import { useTranslation, useColumns, usePhotoGrid, useFilters } from '#src/hooks';
import { AdminEmptyState } from '#src/pages/AdminPage/AdminEmptyState';
import { PhotoErrorDisplay } from '#src/components/photo/PhotoErrorDisplay';
import { ErrorBoundary } from '#src/components/shared/ErrorBoundary';
import { useLightbox, photosToLightboxSlides } from '#lib/lightbox';
import { useAdminMaintenance } from '#src/hooks/admin/useAdminMaintenance';
import { useUI, uiStore } from '#lib/store';

export function AdminContainer() {
  const filters = useFilters({ enableStatus: true });
  const hasFilters = !!filters.search || (filters.category && filters.category !== 'all' && filters.category !== '') || (filters.tags && filters.tags.length > 0);
  const isAggregated = filters.showGroupsCollapsed;
  
  const photoGridData = usePhotoGrid({
    categoryId: (filters.category && filters.category !== 'all' && filters.category !== '') ? filters.category : undefined,
    tagId: filters.tags?.[0],
    searchQuery: filters.search,
    sortOrder: filters.sort,
    onlyGroupsCover: isAggregated
  }, 'admin');
  
  const { uiTranslations: labels } = useTranslation();
  const { columns } = useColumns();
  const adminActions = useAdminMaintenance();
  
  const { open: openLightbox } = useLightbox();
  
  const photos = React.useMemo(() => photoGridData.photos || [], [photoGridData.photos]);
  const lightboxItems = React.useMemo(() => photosToLightboxSlides(photos), [photos]);

  const handlePhotoClick = (photoId: string, index: number) => {
      openLightbox(lightboxItems, index);
  };
  
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
       <div className="flex-1 min-h-0 relative">
          <div className="absolute inset-0">
            <AdminPhotoGrid 
              {...photoGridData}
              columns={columns}
              filters={filters}
              onPhotoClick={handlePhotoClick}
              error={photoGridData.error}
              onRetry={() => photoGridData.refetch()}
            />
          </div>
       </div>
       <SelectionToolbar />
    </div>
  );
}
