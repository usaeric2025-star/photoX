import React, { useMemo, useRef, useCallback } from 'react';
import { queryClient } from '@/lib/queryClient';
import { photoKeys } from '@/lib/queryKeys';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { Photo, Category, Tag } from '@/types';
import { GalleryVariant } from '@/types/variant';
import { VirtualPhotoGrid } from '@/components/photo/VirtualPhotoGrid';
import { PhotoCard } from '@/components/photo/PhotoCard';
import { AdminFilters } from '@/components/ui/AdminFilters';
import { useScrollRestoration, useTasks, useMultiSelect, useFilters, usePhotos, useAdminMode, usePermission, useCategories, useTags, useUrlFilters, useTaskExecutor } from '@/hooks';
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
  const isAdminMode = useAdminMode() && isManagement;
  const { tasks, addTask, updateTask } = useTasks();
  const { runTask } = useTaskExecutor();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();
  const { filters, setSearch } = useFilters();
  const { filters: urlFilters, setGroupId, setPhotoId, setSortOrder, setShowGroupsCollapsed } = useUrlFilters();
  const update = useUIStore(s => s.update);
  const columns = useUIStore(s => s.columns);
  const processingIds = useUIStore(s => s.processingIds);
  const isMultiSelect = useUIStore(s => s.isMultiSelect);

  const disable = useCallback(() => {
    update({ isMultiSelect: false, selectedIds: [] });
  }, [update]);

  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();

  const infiniteQuery = usePhotos({
    category_id: filters.categoryId,
    tag_id: Array.isArray(filters.tagIds) && filters.tagIds.length > 0 ? filters.tagIds[0] : null,
    searchQuery: filters.searchQuery,
    sortOrder: urlFilters.sortOrder as 'newest' | 'oldest' | 'name',
    isAdminMode: isAdminMode
  }, PAGINATION.ADMIN_BATCH_SIZE, true);

  const rawPhotos = infiniteQuery.data?.pages?.flatMap(p => p.photos) ?? EMPTY_ARRAY;

  const photos = useMemo(() => {
    const normalized = normalizeAdminPhotos(rawPhotos);
    if (!processingIds || processingIds.length === 0) return normalized;
    return normalized.filter(p => !processingIds.includes(p.id));
  }, [rawPhotos, processingIds]);

  const { displayPhotos, gridPhotos } = useMemo(() => processPhotos(
    photos,
    categories,
    tags,
    filters,
    urlFilters,
    {
      showGroupsCollapsed: urlFilters.showGroupsCollapsed,
      isAdminModeOverride: isAdminMode
    }
  ), [photos, categories, tags, filters, urlFilters, isAdminMode]);

  const isAnalyzing = tasks.some(t => t.status === 'running' && (t.name.includes('识别') || t.name.includes('分析')));

  const virtualGridRef = useRef<any>(null);
  const scrollToTop = () => virtualGridRef.current?.scrollTo(0);
  const adminActions = useAdminActions();
  const { user } = useAuth();
  const { handleError } = useErrorHandler();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    const { checkDuplicateBatch } = await import('@/lib/data/duplicateCheck');
    const { newFiles: uniqueFiles, duplicateHashes: duplicateFiles } = checkDuplicateBatch(Array.from(files));

    if (duplicateFiles.length > 0) {
      toast.warning(`已跳过 ${duplicateFiles.length} 张重复照片`);
    }

    if (uniqueFiles.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const taskId = addTask({ 
      name: `上传 ${uniqueFiles.length} 张照片`,
      message: '正在准备中...'
    });

    try {
      const fileArray = Array.from(uniqueFiles);
      
      const { processImageFiles } = await import('@/lib/image/imageProcess');
      const processedImages = await processImageFiles(fileArray, (count, total) => {
         updateTask(taskId, {
            progress: Math.round((count / total) * 50),
            message: `正在准备 (${count}/${total})`
         });
      });

      const photoData: Photo[] = processedImages.map((result) => ({
         id: `temp-${crypto.randomUUID()}`,
         name: result.file.name.split('.')[0],
         uri: result.dataUrl,
         image_hash: result.hash,
         thumb_hash: result.thumbHash,
         created_at: new Date().toISOString(),
         updated_at: new Date().toISOString(),
         _fileSize: result.file.size,
         _fileName: result.file.name,
         _lastModified: result.file.lastModified
      } as unknown as Photo));

      updateTask(taskId, { progress: 50, message: `正在上传 ${files.length} 张照片...` });
      
      await savePhotosToCloudBatch(user.id, photoData, (count) => {
        const pct = 50 + Math.round((count / files.length) * 50);
        updateTask(taskId, { 
          progress: pct, 
          message: `正在保存 (${count}/${files.length})` 
        });
      });

      updateTask(taskId, { status: 'completed', progress: 100, message: '上传完成' });
      toast.success('上传成功');
      queryClient.invalidateQueries({ queryKey: photoKeys.all });
    } catch (err) {
      handleError(err, '上传照片失败');
      updateTask(taskId, { status: 'error', progress: 100, message: '上传失败' });
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

  const renderCard = useCallback((photo: Photo, index: number) => (
    <PhotoCard 
      photo={photo}
      index={index}
      variant={variant}
    />
  ), [variant]);

  return (
    <LayoutGroup id="admin-gallery">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full bg-brand-bg w-full overflow-hidden text-text">
        <AdminFilters 
          onSearch={setSearch}
          searchQuery={filters.searchQuery || ''}
          onSortChange={() => setSortOrder(urlFilters.sortOrder === 'newest' ? 'oldest' : 'newest')}
          currentSort={urlFilters.sortOrder as 'newest' | 'oldest' | 'name'}
          onColumnsChange={(cols) => {
              update({ columns: cols as 2 | 3 | 5 });
              navigate({ 
                to: '.', search: (prev: any) => ({ ...prev, view: cols === 2 ? 'list' : 'grid' } as any) 
              });
          }}
          currentColumns={columns}
          onToggleGroups={() => setShowGroupsCollapsed(!urlFilters.showGroupsCollapsed)}
          showGroupsCollapsed={urlFilters.showGroupsCollapsed}
        />
        <div className="flex-1 overflow-hidden bg-brand-bg relative">
           <VirtualPhotoGrid 
             key={`photo-grid-${urlFilters.showGroupsCollapsed ? 'collapsed' : 'expanded'}-${filters.searchQuery || ''}`}
             photos={gridPhotos}
             isFetching={infiniteQuery.isLoading}
             isFetchingNextPage={infiniteQuery.isFetchingNextPage}
             hasNextPage={!!infiniteQuery.hasNextPage}
             onLoadMore={infiniteQuery.fetchNextPage}
             renderCard={renderCard}
             ref={virtualGridRef} 
             columns={columns}
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
          onBatchEdit={() => {
            const currentSelected = useUIStore.getState().selectedIds;
            update({ batchEditingIds: currentSelected });
          }}
          onGroup={() => {}}
          onDelete={() => {
            const currentSelected = useUIStore.getState().selectedIds;
            adminActions.deletePhoto(Array.from(currentSelected));
          }}
          onToggleVisibility={() => {
            const currentSelected = useUIStore.getState().selectedIds;
            adminActions.batchUpdate.mutateAsync({ ids: Array.from(currentSelected), updates: { is_hidden: true } });
          }}
          onClearSelection={disable}
        />

        <SelectionToolbar
          onDelete={(ids) => adminActions.deletePhoto(ids)}
          onBatchEdit={(ids) => update({ batchEditingIds: ids })}
          onHide={(ids) => adminActions.batchUpdate.mutateAsync({ ids, updates: { is_hidden: true } })}
          onAIIdentify={onBatchAiAnalyze ? (ids) => {
            const selectedGroupIds = new Set<string>();
            photos.forEach(p => {
              if (ids.includes(p.id) && p.group_id) {
                selectedGroupIds.add(p.group_id);
              }
            });
            const groupIdsArray = Array.from(selectedGroupIds);

            const targetPhotos = photos.filter(p => 
              ids.includes(p.id) || (p.group_id && groupIdsArray.includes(p.group_id))
            );
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

        <GroupDetailPage 
          activeGroupId={urlFilters.groupId} 
          initialPhotoId={urlFilters.photoId} 
          variant={variant} 
          onBatchAiAnalyze={onBatchAiAnalyze}
        />
      </motion.div>
    </LayoutGroup>
  );
};

