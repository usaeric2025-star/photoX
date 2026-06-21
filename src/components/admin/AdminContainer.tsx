import { logger } from '@/lib/logger';
import React, { useEffect } from 'react';
import { AdminPhotoGrid } from '@/components/photo/AdminPhotoGrid';
import { useTranslation, useColumns, usePhotoGrid, useFilters } from '@/hooks';
import { AdminEmptyState } from '@/pages/AdminPage/AdminEmptyState';
import { PhotoErrorDisplay } from '@/components/photo/PhotoErrorDisplay';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useLightboxStore } from '@/store/useLightboxStore';
import { LazyPhotoLightbox } from '@/features/lightbox/LazyPhotoLightbox';
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
  
  const openLightbox = useLightboxStore((s) => s.open);
  const isOpenLightbox = useLightboxStore((s) => s.isOpen);
  const lightboxImages = useLightboxStore((s) => s.images);
  const lightboxCurrentIndex = useLightboxStore((s) => s.currentIndex);
  
  const lightboxItems = React.useMemo(() => photoGridData.photos.map((p: any) => {
    return {
      id: p.id,
      src: p.imageUrl,
      alt: p.name || '',
      title: p.name || '',
      category: p.groupName || '',
      categoryPath: p.categoryPath || [p.groupName].filter(Boolean),
      metadata: {
        date: p.date,
        tags: p.tags || [],
        description: p.description || '',
        resolution: p.resolution,
        size: p.size,
      },
    };
  }), [photoGridData.photos]);

  const handlePhotoClick = (photoId: string) => {
      const index = photoGridData.photos.findIndex((p: any) => p.id === photoId);
      if (index !== -1) {
          openLightbox(lightboxItems, index);
      }
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
       <div className="flex-1 min-h-0 relative flex flex-col">
          <AdminPhotoGrid 
            {...photoGridData}
            columns={columns}
            filters={filters}
            onPhotoClick={handlePhotoClick}
          />
       </div>

       <LazyPhotoLightbox
          open={isOpenLightbox}
          images={lightboxImages}
          currentIndex={lightboxCurrentIndex}
          onOpenChange={(open) => !open && useLightboxStore.getState().close()}
          onIndexChange={(idx: number) => useLightboxStore.getState().goTo(idx)}
          onEdit={(id) => { filters.setPhotoId(id); filters.setModal('edit'); }}
          onDelete={(id) => adminActions.deletePhoto.mutate(id)}
          onSetCover={(id) => adminActions.updatePhoto.mutate({ id, updates: { is_group_cover: true } })}
       />
    </div>
  );
}
