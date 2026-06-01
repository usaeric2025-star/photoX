import React, { useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { Photo, Category, Tag } from '@/types';
import { GalleryVariant } from '@/types/variant';
import { VirtualPhotoGrid } from '@/components/photo/VirtualPhotoGrid';
import { PhotoCard } from '@/components/photo/PhotoCard';
import { AdminFilters } from '@/components/ui/AdminFilters';
import { useScrollRestoration, useTasks, useMultiSelect, useFilters, usePhotoFilters, usePhotoInfiniteList, useAdminMode, usePermission, useCategories, useTags } from '@/hooks';
import { useUIStore, useShallow } from '@/store/useUIStore';
import { UploadButton } from '@/components/shared/UploadButton';
import { SelectionToolbar } from '@/components/shared/SelectionToolbar';
import { useAdminActions } from '@/features/admin/useAdminActions';
import { savePhotosToCloudBatch } from "@/services/photo/photoUploadService";
import { useAuth, useFeedback } from '@/hooks';
import { PhotoLightbox } from '../PhotoLightbox';
import { GroupDetailPage } from '../GroupDetailPage';
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
  const store = useUIStore(useShallow(s => ({
      update: s.update,
      sortOrder: s.sortOrder,
      lightboxIndex: s.lightboxIndex,
      activeGroupId: s.activeGroupId,
      activePhotoId: s.activePhotoId,
      columns: s.columns
    })));

  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();

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
  const { user } = useAuth();
  const { showSuccess, showError } = useFeedback();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    try {
      const photoData: Photo[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uri = URL.createObjectURL(file);
        const id = `temp-${crypto.randomUUID()}`;
        
        photoData.push({
          id,
          name: file.name.split('.')[0],
          uri,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as Photo);
      }

      await savePhotosToCloudBatch(user.id, photoData);
      showSuccess(`成功上传 ${files.length} 张照片`);
      infiniteQuery.refetch();
    } catch (err) {
      showError(err, '上传照片失败');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // activePhoto can be removed if not needed, but keep activePhotoId
  const handleGroupClick = useCallback((gid: string, photoId?: string) => {
     store.update({ activePhotoId: null });
     store.update({ activeGroupId: gid });
     // Only set activePhotoId if searching or wanted to anchor
     if (filters.searchQuery && filters.searchQuery.trim()) {
         store.update({ activePhotoId: photoId || null });
     }
  }, [store.update, store.update, filters.searchQuery]);

  const handleLightboxOpen = useCallback((photo: Photo) => {
    store.update({ activePhotoId: photo.id });
  }, [store.update]);

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
          onSortChange={() => store.update({ sortOrder: store.sortOrder === 'newest' ? 'oldest' : 'newest' })}
          currentSort={store.sortOrder}
          onColumnsChange={(cols) => {
              store.update({ columns: cols as 2 | 3 | 5 });
              updateURL({ view: cols === 2 ? 'list' : 'grid' });
          }}
          currentColumns={store.columns}
          onToggleGroups={() => setShowGroupsCollapsed(!filters.showGroupsCollapsed)}
          showGroupsCollapsed={filters.showGroupsCollapsed}
        />

        <div className="flex-1 overflow-hidden bg-brand-bg relative">
           <VirtualPhotoGrid 
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
           <input
             id="admin-quick-add-input"
             type="file"
             ref={fileInputRef}
             className="hidden"
             multiple
             accept="image/*"
             onChange={handleFileUpload}
           />
        </div>

        <UploadButton 
          variant={variant}
          scrollToTop={scrollToTop}
          onAdd={() => fileInputRef.current?.click()}
          onBatchAiIdentify={() => {}}
          onBatchEdit={() => store.update({ batchEditingIds: selectedIds })}
          onGroup={() => {}}
          onDelete={() => adminActions.deletePhoto(Array.from(selectedIds))}
          onToggleVisibility={() => adminActions.batchUpdate.mutateAsync({ ids: Array.from(selectedIds), updates: { is_hidden: true } })}
          onClearSelection={disable}
        />

        <SelectionToolbar
          onDelete={(ids) => adminActions.deletePhoto(ids)}
          onBatchEdit={(ids) => store.update({ batchEditingIds: ids })}
          onHide={(ids) => adminActions.batchUpdate.mutateAsync({ ids, updates: { is_hidden: true } })}
        />

        {!store.activeGroupId && store.activePhotoId && (
          <PhotoLightbox onClose={() => store.update({ activePhotoId: null })}  
            photoId={store.activePhotoId}
            displayPhotos={displayPhotos}
            
            variant={variant}
          />
        )}

        <GroupDetailPage activeGroupId={store.activeGroupId} initialPhotoId={store.activePhotoId} variant={variant}  />
      </motion.div>
    </LayoutGroup>
  );
};
