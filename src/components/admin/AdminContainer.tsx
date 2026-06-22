import { logger } from '@/lib/logger';
import React, { useEffect } from 'react';
import { AdminPhotoGrid } from '@/components/photo/AdminPhotoGrid';
import { useTranslation, useColumns, usePhotoGrid, useFilters } from '@/hooks';
import { AdminEmptyState } from '@/pages/AdminPage/AdminEmptyState';
import { PhotoErrorDisplay } from '@/components/photo/PhotoErrorDisplay';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useLightbox, photosToLightboxSlides } from '@/lib/lightbox';
import { useAdminMaintenance } from '@/hooks/admin/useAdminMaintenance';

export function AdminContainer() {
  const filters = useFilters({ enableStatus: true });
  const isAggregated = filters.showGroupsCollapsed && !filters.search && !filters.category && !filters.tags.length;
  
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
  
  const { open } = useLightbox();
  
  const lightboxItems = React.useMemo(() => photosToLightboxSlides(photoGridData.photos), [photoGridData.photos]);

  const handlePhotoClick = (photoId: string, index: number) => {
      open(lightboxItems, index);
      filters.setPhotoId(photoId);
  };
  
  // 同步燈箱數據：當照片列表更新且處於燈箱模式時
  useEffect(() => {
    if (filters.photoId && photoGridData.photos.length > 0) {
      const index = photoGridData.photos.findIndex(p => p.id === filters.photoId);
      open(lightboxItems, index !== -1 ? index : 0);
    }
  }, [photoGridData.photos, filters.photoId, open, lightboxItems]);
  
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
    </div>
  );
}
