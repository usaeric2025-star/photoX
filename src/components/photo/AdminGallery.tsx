import React, { useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { Photo, Category, Tag } from '@/types';
import { GalleryVariant } from '@/types/variant';
import PhotoBoard from '@/components/photo/PhotoGrid';
import { PhotoCard } from '@/components/photo/PhotoCard';
import { AdminFilters } from '@/components/ui/AdminFilters';
import { useScrollRestoration, useTasks, useMultiSelect, useFilters, usePhotoFilters, usePhotoInfiniteList, useAdminMode, usePermission, useCategoryList, useTagList } from '@/hooks';
import { useGalleryStore, useShallow } from '@/store/galleryStore';
import { FloatingActions } from '@/components/shared/FloatingActions';
import { MultiSelectToolbar } from '../shared/MultiSelectToolbar';
import { useAdminActions } from '@/features/admin/useAdminActions';
import { PhotoLightbox } from '../PhotoLightbox';
import { GroupDetailView } from '../GroupDetailView';
import { PAGINATION } from '@/constants/config';
import { normalizeAdminPhotos } from '@/lib/selectors/photos';
const updateURL = (params: any) => console.log('updateURL stub', params);
import { interactionBus } from '@/lib/interactionBus';
import { useNavigate } from '@tanstack/react-router';

interface AdminGalleryProps {
  variant: GalleryVariant;
  handleBatchAiIdentifyTrigger?: () => void;
  batchProgress?: any;
}

const EMPTY_ARRAY: Photo[] = [];

export function AdminGallery({
  variant,
  handleBatchAiIdentifyTrigger,
  batchProgress
}: AdminGalleryProps) {
  const isManagement = variant === 'full-management' || variant === 'staff-workspace';
  useScrollRestoration('admin_gallery_scroll');
  
  const { can } = usePermission();
  const isAdminMode = useAdminMode() || isManagement;
  const { tasks } = useTasks();
  const { isMultiSelect, selectedIds, disable } = useMultiSelect();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();
  const { filters, setFilters, setSearch, setShowGroupsCollapsed } = useFilters();
  const store = useGalleryStore(useShallow(s => ({
    setBatchEditingIds: s.setBatchEditingIds,
    sortOrder: s.sortOrder,
    setSortOrder: s.setSortOrder,
    lightboxIndex: s.lightboxIndex,
    setLightboxIndex: s.setLightboxIndex,
    activeGroupId: s.activeGroupId,
    setActiveGroupId: s.setActiveGroupId,
    activePhotoId: s.activePhotoId,
    setActivePhotoId: s.setActivePhotoId,
    columns: s.columns,
    setColumns: s.setColumns,
    setActiveScreen: s.setActiveScreen
  })));

  const { data: categories = [] } = useCategoryList();
  const { data: tags = [] } = useTagList();

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

  const photos = useMemo(() => normalizeAdminPhotos(rawPhotos), [rawPhotos]);

  const { displayPhotos, gridPhotos } = usePhotoFilters(
    photos,
    categories,
    tags,
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
     store.setActivePhotoId(null);
     store.setActiveGroupId(gid);
     // Only set activePhotoId if searching or wanted to anchor
     if (filters.searchQuery && filters.searchQuery.trim()) {
         store.setActivePhotoId(photoId || null);
     }
  }, [store.setActiveGroupId, store.setActivePhotoId, filters.searchQuery]);

  const handleLightboxOpen = useCallback((photo: Photo) => {
    store.setActivePhotoId(photo.id);
  }, [store.setActivePhotoId]);

  const renderCard = useCallback((photo: Photo, index: number) => (
    <PhotoCard 
      photo={photo}
      index={index}
      variant={variant}
      showGroupsCollapsed={filters.showGroupsCollapsed}
      onGroupClick={(gid, pid) => handleGroupClick(gid, pid || photo.id)}
      onLightboxOpen={handleLightboxOpen}
    />
  ), [variant, filters.showGroupsCollapsed, handleGroupClick, handleLightboxOpen]);

  return (
    <LayoutGroup id="admin-gallery">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full bg-brand-bg w-full overflow-hidden text-text">
        <AdminFilters 
          onSearch={setSearch}
          searchQuery={filters.searchQuery || ''}
          onSortChange={() => store.setSortOrder(store.sortOrder === 'newest' ? 'oldest' : 'newest')}
          currentSort={store.sortOrder}
          onColumnsChange={(cols) => {
              store.setColumns(cols as 2 | 3 | 5);
              updateURL({ view: cols === 2 ? 'list' : 'grid' });
          }}
          currentColumns={store.columns}
          onToggleGroups={() => setShowGroupsCollapsed(!filters.showGroupsCollapsed)}
          showGroupsCollapsed={filters.showGroupsCollapsed}
        />

        <div className="flex-1 overflow-hidden bg-brand-bg relative">
           <PhotoBoard 
             key={`photo-grid-${filters.showGroupsCollapsed ? 'collapsed' : 'expanded'}-${filters.searchQuery || ''}`}
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

        <MultiSelectToolbar variant="admin" />

        {!store.activeGroupId && store.activePhotoId && (
          <PhotoLightbox 
            photoId={store.activePhotoId}
            displayPhotos={displayPhotos}
            onClose={() => store.setActivePhotoId(null)}
            variant={variant}
          />
        )}

        <GroupDetailView
          activeGroupId={store.activeGroupId}
          setActiveGroupId={store.setActiveGroupId}
          setActivePhotoId={store.setActivePhotoId}
          initialPhotoId={store.activePhotoId}
          setLightboxIndex={store.setLightboxIndex}
          variant={variant}
        />
      </motion.div>
    </LayoutGroup>
  );
};
