import React, { useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { Photo, Category, Tag } from '@/types';
import { GalleryVariant } from '@/types/variant';
import PhotoBoard from '@/components/photo/PhotoGrid';
import { PhotoCard } from '@/components/photo/PhotoCard';
import { GalleryControls } from '@/components/photo/GalleryControls';
import { useScrollRestoration, useTasks, useMultiSelect, useFilters, usePhotoFilters, usePhotoInfiniteList, useAdminMode, usePermission, useCategoryList, useTagList, useEnrichedPhotos } from '@/hooks';
import { useGalleryStore, useShallow } from '@/store/galleryStore';
import { FloatingActions } from '@/components/shared/FloatingActions';
import { useAdminActions } from '@/features/admin/useAdminActions';
import { PhotoLightbox } from '../PhotoLightbox';
import { GroupDetailView } from '../GroupDetailView';
import { PAGINATION } from '@/constants/config';
import { normalizeAdminPhotos } from '@/lib/selectors/photos';

interface AdminGalleryProps {
  variant: GalleryVariant;
  handleBatchAiIdentifyTrigger?: () => void;
  batchProgress?: any;
}

const EMPTY_ARRAY: Photo[] = [];

export const AdminGallery: React.FC<AdminGalleryProps> = ({

  variant,
  handleBatchAiIdentifyTrigger,
  batchProgress
}) => {
  const isManagement = variant === 'full-management' || variant === 'staff-workspace';
  useScrollRestoration('admin_gallery_scroll');
  
  const { can } = usePermission();
  const isAdminMode = useAdminMode() || isManagement;
  const { tasks } = useTasks();
  const { isMultiSelect, selectedIds, disable } = useMultiSelect();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { filters } = useFilters();
  const store = useGalleryStore(useShallow(s => ({
    setBatchEditingIds: s.setBatchEditingIds,
    sortOrder: s.sortOrder,
    lightboxIndex: s.lightboxIndex,
    setLightboxIndex: s.setLightboxIndex,
    activeGroupId: s.activeGroupId,
    setActiveGroupId: s.setActiveGroupId,
    activePhotoId: s.activePhotoId,
    setActivePhotoId: s.setActivePhotoId,
    columns: s.columns
  })));

  const infiniteQuery = usePhotoInfiniteList({
    category_id: filters.categoryId,
    tag_id: Array.isArray(filters.tagIds) && filters.tagIds.length > 0 ? filters.tagIds[0] : null,
    searchQuery: filters.searchQuery,
    sortOrder: store.sortOrder,
    isAdminMode: isAdminMode
  }, PAGINATION.ADMIN_BATCH_SIZE, true);

  const rawPhotos = useMemo(() => {
    return infiniteQuery.data?.pages?.flatMap(p => p.photos) ?? EMPTY_ARRAY;
  }, [infiniteQuery.data]);

  const enrichedPhotos = useEnrichedPhotos(rawPhotos);
  const photos = useMemo(() => normalizeAdminPhotos(enrichedPhotos), [enrichedPhotos]);

  const { displayPhotos, gridPhotos } = usePhotoFilters(
    photos,
    [],
    [],
    {
      showGroupsCollapsed: filters.showGroupsCollapsed,
      isAdminModeOverride: isAdminMode
    }
  );

  const isAnalyzing = useMemo(() => {
    return tasks.some(t => t.status === 'running' && (t.name.includes('识别') || t.name.includes('分析')));
  }, [tasks]);

  const virtualGridRef = useRef<any>(null);
  const scrollToTop = () => virtualGridRef.current?.scrollTo(0);
  const adminActions = useAdminActions();

  // activePhoto can be removed if not needed, but keep activePhotoId
  const handleGroupClick = useCallback((gid: string, photoId?: string) => {
     store.setActiveGroupId(gid);
     store.setActivePhotoId(null);
  }, [store.setActiveGroupId, store.setActivePhotoId]);

  const handleLightboxOpen = useCallback((photo: Photo) => {
    store.setActivePhotoId(photo.id);
  }, [store.setActivePhotoId]);

  const renderCard = useCallback((photo: Photo, index: number) => (
    <PhotoCard 
      photo={photo}
      index={index}
      variant={variant}
      showGroupsCollapsed={filters.showGroupsCollapsed}
      onGroupClick={(gid) => handleGroupClick(gid, photo.id)}
      onLightboxOpen={handleLightboxOpen}
    />
  ), [variant, filters.showGroupsCollapsed, handleGroupClick, handleLightboxOpen]);

  return (
    <LayoutGroup id="admin-gallery">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full bg-brand-bg w-full overflow-hidden text-text">
        <GalleryControls 
          onScrollToTop={scrollToTop}
          variant={variant}
          handleBatchAiIdentifyTrigger={handleBatchAiIdentifyTrigger}
          isAnalyzing={isAnalyzing}
          batchProgress={batchProgress}
        />

        <div className="flex-1 overflow-hidden bg-brand-bg relative">
           <PhotoBoard 
             photos={gridPhotos}
             isFetching={infiniteQuery.isLoading}
             isFetchingNextPage={infiniteQuery.isFetchingNextPage}
             hasNextPage={!!infiniteQuery.hasNextPage}
             onLoadMore={infiniteQuery.fetchNextPage}
             renderCard={renderCard}
             ref={virtualGridRef} 
             columns={store.columns}
           />
        </div>

        <FloatingActions 
          variant={variant}
          scrollToTop={scrollToTop}
          onAdd={() => fileInputRef.current?.click()}
          onBatchAiIdentify={() => {}}
          onBatchEdit={() => store.setBatchEditingIds(selectedIds)}
          onGroup={() => {}}
          onDelete={() => adminActions.deletePhoto(selectedIds)}
          onToggleVisibility={() => adminActions.batchUpdate.mutateAsync({ ids: selectedIds, updates: { is_hidden: true } })}
          onClearSelection={disable}
        />

        {!store.activeGroupId && store.activePhotoId && (
          <PhotoLightbox 
            photoId={store.activePhotoId}
            displayPhotos={displayPhotos}
            onClose={() => store.setActivePhotoId(null)}
          />
        )}

        <GroupDetailView
          activeGroupId={store.activeGroupId}
          setActiveGroupId={store.setActiveGroupId}
          initialPhotoId={store.activePhotoId}
          setLightboxIndex={store.setLightboxIndex}
          variant={variant}
        />
      </motion.div>
    </LayoutGroup>
  );
};
