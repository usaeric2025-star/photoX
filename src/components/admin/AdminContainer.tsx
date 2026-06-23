import { logger } from '@/lib/logger';
import React, { useEffect } from 'react';
import { AdminPhotoGrid } from '@/components/photo/AdminPhotoGrid';
import { useTranslation, useColumns, usePhotoGrid, useFilters } from '@/hooks';
import { AdminEmptyState } from '@/pages/AdminPage/AdminEmptyState';
import { PhotoErrorDisplay } from '@/components/photo/PhotoErrorDisplay';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useLightbox, photosToLightboxSlides } from '@/lib/lightbox';
import { useAdminMaintenance } from '@/hooks/admin/useAdminMaintenance';
import { useUIStore } from '@/store/uiStore';

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
  
  const openLightbox = useUIStore(s => s.openLightbox);
  
  const lightboxItems = React.useMemo(() => photosToLightboxSlides(photoGridData.photos), [photoGridData.photos]);

  const handlePhotoClick = (photoId: string, index: number) => {
      openLightbox(lightboxItems, index);
      filters.setPhotoId(photoId);
  };
  
  const lightboxIsOpen = useUIStore(s => s.lightbox.isOpen);
  const lightboxCurrentIndex = useUIStore(s => s.lightbox.currentIndex);
  
  // 同步燈箱數據：當照片列表更新且處於燈箱模式時
  useEffect(() => {
    if (filters.photoId && photoGridData.photos.length > 0) {
      const index = photoGridData.photos.findIndex(p => p.id === filters.photoId);
      if (index !== -1) {
         // 只有当灯箱没开，或者灯箱打开但显示的不是当前 photoId 时才打开
         if (!lightboxIsOpen || photoGridData.photos[lightboxCurrentIndex]?.id !== filters.photoId) {
            openLightbox(lightboxItems, index);
         }
      }
    }
  }, [photoGridData.photos, filters.photoId, openLightbox, lightboxItems, lightboxIsOpen, lightboxCurrentIndex]);
  
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
