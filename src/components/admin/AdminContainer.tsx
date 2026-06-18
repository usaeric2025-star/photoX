import { logger } from '@/lib/logger';
import React from 'react';
import { AdminPhotoGrid } from '@/components/photo/AdminPhotoGrid';
import { useTranslation, useColumns, usePhotoGrid, useFilters } from '@/hooks';
import { AdminEmptyState } from '@/pages/AdminPage/AdminEmptyState';
import { PhotoErrorDisplay } from '@/components/photo/PhotoErrorDisplay';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { LazyYarlLightbox } from '@/features/lightbox/LazyYarlLightbox';
import { useAdminMaintenance } from '@/hooks/admin/useAdminMaintenance';

export function AdminContainer() {
  const filters = useFilters({ enableStatus: true });
  const photoGridData = usePhotoGrid({
    categoryId: filters.category,
    tagId: filters.tags?.[0],
    searchQuery: filters.search,
    sortOrder: filters.sort,
    onlyGroupsCover: filters.showGroupsCollapsed
  }, 'admin');
  
  const { uiTranslations: labels } = useTranslation();
  const { columns } = useColumns();
  const adminActions = useAdminMaintenance();
  
  const lightboxIndex = React.useMemo(() => {
    if (!filters.photoId) return -1;
    return photoGridData.photos.findIndex((p: any) => p.id === filters.photoId);
  }, [filters.photoId, photoGridData.photos]);

  const lightboxOpen = lightboxIndex !== -1;
  React.useEffect(() => {
    logger.debug('[AdminContainer] lightboxOpen:', lightboxOpen, 'photoId:', filters.photoId, 'index:', lightboxIndex);
  }, [lightboxOpen, filters.photoId, lightboxIndex]);


  const lightboxItems = React.useMemo(() => photoGridData.photos.map((p: any) => {
    return {
      id: p.id,
      src: p.imageUrl,
      thumbnail: p.thumbnailUrl || p.imageUrl,
      title: p.name || '',
      description: p.description || '',
      category: p.groupName || '',
      tags: p.tags || [],
      photo: p,
    };
  }), [photoGridData.photos]);
  
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
  
  const openEditDrawer = (id: string) => { filters.setPhotoId(id); filters.setModal('edit'); };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative" id="main-admin-screen">
       <div className="flex-1 min-h-0 relative flex flex-col">
          <AdminPhotoGrid 
            {...photoGridData}
            columns={columns}
            filters={filters}
          />
       </div>

       <LazyYarlLightbox
          open={lightboxOpen}
          items={lightboxItems}
          currentIndex={Math.max(0, lightboxIndex)}
          onClose={() => filters.setPhotoId(null)}
          onIndexChange={(idx: number) => {
             const photo = photoGridData.photos[idx];
             if (photo && photo.id !== filters.photoId) {
               filters.setPhotoId(photo.id);
             }
          }}
          onEdit={openEditDrawer}
          onDelete={(id) => adminActions.deletePhoto.mutate(id)}
          onSetCover={(id) => adminActions.updatePhoto.mutate({ id, updates: { is_group_cover: true } })}
       />
    </div>
  );
}
