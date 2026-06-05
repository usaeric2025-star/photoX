import React, { useMemo, useRef, useCallback, useState } from 'react';
import { queryClient } from '@/lib/queryClient';
import { photoKeys } from '@/lib/queryKeys';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { Photo, Category, Tag } from '@/types';
import { GalleryVariant } from '@/types/variant';
import { VirtualPhotoGrid } from '@/components/photo/VirtualPhotoGrid';
import { PhotoCard } from '@/components/photo/PhotoCard';
import { AdminFilters } from '@/components/ui/AdminFilters';
import { useScrollRestoration, useTasks, useMultiSelect, usePhotos, useAdminMode, usePermission, useCategories, useTags, useUrlFilters, useTaskExecutor } from '@/hooks';
import { processImageFiles } from '@/lib/image/imageProcess';
import { processPhotos } from '@/lib/filters';
import { checkDuplicateBatch, removeFromDuplicateCache, checkDuplicate } from '@/lib/data/duplicateCheck';
import { useUIStore, useShallow, useColumns } from '@/store/useUIStore';
import { UploadButton } from '@/components/shared/UploadButton';
import { SelectionToolbar } from '@/components/shared/SelectionToolbar';
import { useAdminActions } from '@/features/admin/useAdminActions';
import { savePhotosToCloudBatch } from "@/services/photo/photoUploadService";
import { useAuth, useErrorHandler } from '@/hooks';
import { ErrorFactory } from '@/lib/errorFactory';
import { toast } from '@/lib/ui/toast';
import { GroupDetailPage } from '../GroupDetailPage';
import { PAGINATION } from '@/constants/config';
import { normalizeAdminPhotos } from '@/lib/selectors/photos';
import { useNavigate } from '@tanstack/react-router';
import { usePhotoGallery } from '@/features/photos/usePhotoGallery';
import { useDisclosure } from '@mantine/hooks';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

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
  const { filters: urlFilters, setGroupId, setPhotoId, setSortOrder, setShowGroupsCollapsed, setSearchQuery } = useUrlFilters();
  const update = useUIStore(s => s.update);
  const [columns, setColumns] = useColumns();
  const processingIds = useUIStore(s => s.processingIds);
  const isMultiSelect = useUIStore(s => s.isMultiSelect);

  const disable = useCallback(() => {
    update({ isMultiSelect: false, selectedIds: [] });
  }, [update]);

  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();

  const { photos: rawPhotos, infinitePhotosQuery: infiniteQuery } = usePhotoGallery();

  const photos = useMemo(() => {
    const normalized = normalizeAdminPhotos(rawPhotos);
    if (!processingIds || processingIds.length === 0) return normalized;
    return normalized.filter(p => !processingIds.includes(p.id));
  }, [rawPhotos, processingIds]);

  const { displayPhotos, gridPhotos } = useMemo(() => processPhotos(
    photos,
    categories,
    tags,
    urlFilters as any,
    urlFilters,
    {
      showGroupsCollapsed: urlFilters.showGroupsCollapsed,
      isAdminModeOverride: isAdminMode
    }
  ), [photos, categories, tags, urlFilters, isAdminMode]);

  const [isDeleteOpen, deleteDialog] = useDisclosure(false);
  const [idsToDelete, setIdsToDelete] = useState<string[]>([]);
  
  const initiateDelete = (ids: string[]) => {
    setIdsToDelete(ids);
    deleteDialog.open();
  };

  const virtualGridRef = useRef<any>(null);
  const scrollToTop = () => virtualGridRef.current?.scrollToIndex(0);
  const adminActions = useAdminActions();
  const { user } = useAuth();
  const { handleError } = useErrorHandler();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !isManagement) return;

    const fileArray = Array.from(files);
    const { newFiles: uniqueFiles, duplicateHashes } = checkDuplicateBatch(fileArray);

    if (duplicateHashes.length > 0) {
      toast.warning(`已跳过 ${duplicateHashes.length} 张本地重复照片`);
    }

    if (uniqueFiles.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const taskId = addTask({ 
      name: `批量上传 (${uniqueFiles.length}张)`,
      message: '正在初始化队列...'
    });

    try {
      const savedPhotos: Photo[] = [];
      let successCount = 0;

      // Import services sequentially to save initial memory
      const { processImageFile } = await import('@/lib/image/imageProcess');
      const { savePhotoToCloud } = await import("@/services/photo/photoUploadService");

      // Sequential Processing Loop - Crucial for Mobile Stability
      for (let i = 0; i < uniqueFiles.length; i++) {
        const file = uniqueFiles[i];
        const progress = Math.round((i / uniqueFiles.length) * 100);
        
        updateTask(taskId, { 
          progress, 
          message: `正在处理第 ${i + 1}/${uniqueFiles.length} 张: ${file.name}` 
        });

        try {
          // 1. Process (Resize, ThumbHash) - One at a time to save RAM
          const processed = await processImageFile(file);
          
          // 2. Upload to Cloud
          const tempPhoto: Photo = {
            id: `temp-${crypto.randomUUID()}`,
            name: processed.file.name.split('.')[0],
            uri: processed.dataUrl,
            image_hash: processed.hash,
            thumb_hash: processed.thumbHash,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as unknown as Photo;

          const savedId = await savePhotoToCloud(user?.id || 'staff', tempPhoto);
          if (savedId) {
            const finalPhoto = { ...tempPhoto, id: savedId };
            savedPhotos.push(finalPhoto);
            successCount++;
          }

          // Force garbage collection hint (release dataUrl)
          (processed as any).dataUrl = '';
        } catch (itemErr) {
          console.error(`Failed to process/upload ${file.name}:`, itemErr);
        }
      }

      updateTask(taskId, { status: 'completed', progress: 100, message: `上传完成: 成功 ${successCount} 张` });
      toast.success(`上传完成 (成功 ${successCount}/${uniqueFiles.length})`);
      
      queryClient.invalidateQueries({ queryKey: photoKeys.all });

    } catch (err) {
      handleError(ErrorFactory.wrap(err, '批量操作'), '上传失败');
      updateTask(taskId, { status: 'error', progress: 100, message: '执行中断' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // activePhoto can be removed if not needed, but keep activePhotoId
  const handleGroupClick = (gid: string, photoId?: string) => {
     setPhotoId(null);
     setGroupId(gid);
     // Only set activePhotoId if searching or wanted to anchor
     if (urlFilters.searchQuery && urlFilters.searchQuery.trim()) {
         setPhotoId(photoId || null);
     }
  };

  const handleLightboxOpen = (photo: Photo) => {
    setPhotoId(photo.id);
  };

  const renderCard = useCallback((photo: Photo, index: number) => (
    <PhotoCard 
      key={photo.id}
      photo={photo}
      index={index}
      variant={variant}
    />
  ), [variant]);

  return (
    <LayoutGroup id="admin-gallery">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full bg-brand-bg w-full overflow-hidden text-text">
        <AdminFilters 
          onSearch={setSearchQuery}
          searchQuery={urlFilters.searchQuery || ''}
          onSortChange={() => setSortOrder(urlFilters.sortOrder === 'newest' ? 'oldest' : 'newest')}
          currentSort={urlFilters.sortOrder as 'newest' | 'oldest' | 'name'}
          onColumnsChange={(cols) => {
              setColumns(cols as 2 | 3 | 5);
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
             key={`photo-grid-${urlFilters.showGroupsCollapsed ? 'collapsed' : 'expanded'}-${urlFilters.searchQuery || ''}`}
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
            initiateDelete(Array.from(currentSelected));
          }}
          onToggleVisibility={() => {
            const currentSelected = useUIStore.getState().selectedIds;
            adminActions.batchUpdate.execute({ ids: Array.from(currentSelected), updates: { is_hidden: true } });
          }}
          onClearSelection={disable}
        />

        <SelectionToolbar
          onDelete={(ids) => initiateDelete(ids)}
          onBatchEdit={(ids) => update({ batchEditingIds: ids })}
          onHide={(ids) => adminActions.batchUpdate.execute({ ids, updates: { is_hidden: true } })}
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

        <GroupDetailPage 
          activeGroupId={urlFilters.groupId} 
          initialPhotoId={urlFilters.photoId} 
          variant={variant} 
          onBatchAiAnalyze={onBatchAiAnalyze}
        />
        <ConfirmDialog
          open={isDeleteOpen}
          onOpenChange={deleteDialog.toggle}
          title="确认删除"
          description={`确认删除这 ${idsToDelete.length} 张照片吗？`}
          confirmText="删除"
          variant="destructive"
          onConfirm={() => adminActions.deletePhoto(idsToDelete)}
        />
      </motion.div>
    </LayoutGroup>
  );
};

