import React, { useMemo, useRef, useCallback } from 'react';
import { queryClient } from '@/lib/queryClient';
import { photoKeys } from '@/lib/queryKeys';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { Photo, Category, Tag } from '@/types';
import { GalleryVariant } from '@/types/variant';
import { VirtualPhotoGrid } from '@/components/photo/VirtualPhotoGrid';
import { PhotoCard } from '@/components/photo/PhotoCard';
import { AdminFilters } from '@/components/ui/AdminFilters';
import { useScrollRestoration, useTasks, useMultiSelect, useFilters, usePhotoInfiniteList, useAdminMode, usePermission, useCategories, useTags, useUrlFilters } from '@/hooks';
import { processPhotos } from '@/lib/filters';
import { useUIStore, useShallow } from '@/store/useUIStore';
import { UploadButton } from '@/components/shared/UploadButton';
import { SelectionToolbar } from '@/components/shared/SelectionToolbar';
import { useAdminActions } from '@/features/admin/useAdminActions';
import { savePhotosToCloudBatch } from "@/services/photo/photoUploadService";
import { useAuth, useErrorHandler } from '@/hooks';
import { toast } from '@/lib/ui/toast';
import { PhotoLightbox } from '../PhotoLightbox';
import { GroupDetailPage } from '../GroupDetailPage';
import { PAGINATION } from '@/constants/config';
import { normalizeAdminPhotos } from '@/lib/selectors/photos';
const updateURL = (params: any) => console.log('updateURL stub', params);
import { useNavigate } from '@tanstack/react-router';

interface AdminGridContainerProps {
  variant: GalleryVariant;
  handleBatchAiIdentifyTrigger?: () => void;
  batchProgress?: any;
  onBatchAiAnalyze?: (targetPhotos: any[]) => void;
}

const EMPTY_ARRAY: Photo[] = [];

export function AdminGridContainer({
  variant,
  handleBatchAiIdentifyTrigger,
  batchProgress,
  onBatchAiAnalyze
}: AdminGridContainerProps) {
  const isManagement = variant === 'full-management' || variant === 'staff-workspace';
  useScrollRestoration('admin_gallery_scroll');
  
  const { can } = usePermission();
  const isAdminMode = useAdminMode() || isManagement;
  const { tasks } = useTasks();
  const { isMultiSelect, selectedIds, disable } = useMultiSelect();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();
  const { filters, setSearch, setShowGroupsCollapsed } = useFilters();
  const { filters: urlFilters, setGroupId, setPhotoId, setSortOrder } = useUrlFilters();
  const store = useUIStore(useShallow(s => ({
      update: s.update,
      columns: s.columns
    })));

  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();

  const infiniteQuery = usePhotoInfiniteList({
    category_id: filters.categoryId,
    tag_id: Array.isArray(filters.tagIds) && filters.tagIds.length > 0 ? filters.tagIds[0] : null,
    searchQuery: filters.searchQuery,
    sortOrder: urlFilters.sortOrder as 'newest' | 'oldest' | 'name',
    isAdminMode: isAdminMode
  }, PAGINATION.ADMIN_BATCH_SIZE, true);

  const rawPhotos = infiniteQuery.data?.pages?.flatMap(p => p.photos) ?? EMPTY_ARRAY;

  const photos = normalizeAdminPhotos(rawPhotos);

  const { displayPhotos, gridPhotos } = processPhotos(
    photos,
    categories,
    tags,
    filters,
    urlFilters,
    {
      showGroupsCollapsed: filters.showGroupsCollapsed,
      isAdminModeOverride: isAdminMode
    }
  );

  const isAnalyzing = tasks.some(t => t.status === 'running' && (t.name.includes('识别') || t.name.includes('分析')));

  const virtualGridRef = useRef<any>(null);
  const scrollToTop = () => virtualGridRef.current?.scrollTo(0);
  const adminActions = useAdminActions();
  const { user } = useAuth();
  const { handleError } = useErrorHandler();

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
      toast.success(`成功上传 ${files.length} 张照片`);
      queryClient.invalidateQueries({ queryKey: photoKeys.lists() });
    } catch (err) {
      handleError(err, '上传照片失败');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // activePhoto can be removed if not needed, but keep activePhotoId
  const handleGroupClick = (gid: string, photoId?: string) => {
     setPhotoId(null);
     setGroupId(gid);
     // Only set activePhotoId if searching or wanted to anchor
     if (filters.searchQuery && filters.searchQuery.trim()) {
         setPhotoId(photoId || null);
     }
  };

  const handleLightboxOpen = (photo: Photo) => {
    setPhotoId(photo.id);
  };

  const renderCard = (photo: Photo, index: number) => (
    <PhotoCard 
      photo={photo}
      index={index}
      variant={variant}
      showGroupsCollapsed={filters.showGroupsCollapsed}
      onGroupClick={(gid, pid) => handleGroupClick(gid, pid || photo.id)}
      onLightboxOpen={handleLightboxOpen}
    />
  );

  return (
    <LayoutGroup id="admin-gallery">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full bg-brand-bg w-full overflow-hidden text-text">
        <AdminFilters 
          onSearch={setSearch}
          searchQuery={filters.searchQuery || ''}
          onSortChange={() => setSortOrder(urlFilters.sortOrder === 'newest' ? 'oldest' : 'newest')}
          currentSort={urlFilters.sortOrder as 'newest' | 'oldest' | 'name'}
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
          onAIIdentify={onBatchAiAnalyze ? (ids) => {
            const targetPhotos = photos.filter(p => ids.includes(p.id));
            onBatchAiAnalyze(targetPhotos);
          } : undefined}
        />

        {!urlFilters.groupId && urlFilters.photoId && (
          <PhotoLightbox onClose={() => setPhotoId(null)}  
            photoId={urlFilters.photoId}
            displayPhotos={displayPhotos}
            onPhotoIdChange={setPhotoId}
            variant={variant}
          />
        )}

        <GroupDetailPage activeGroupId={urlFilters.groupId} initialPhotoId={urlFilters.photoId} variant={variant} />
      </motion.div>
    </LayoutGroup>
  );
};
