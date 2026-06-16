import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import React, { useRef, useEffect } from 'react';
import { Photo } from '@/types';
import { VirtualPhotoGrid } from '@/components/photo/VirtualPhotoGrid';
import { AdminPhotoCard } from '@/components/photo/AdminPhotoCard';
import { 
  useScrollRestoration, 
  useFilters, 
  useCategories,
  useTags,
  useAdminBatchActions,
  usePermission
} from '@/hooks';
import { useColumns } from '@/features/layout/hooks/useColumns';
import { useUIStore } from '@/store/useUIStore';
import { UploadButton } from '@/components/shared/UploadButton';
import { SelectionToolbar } from '@/components/shared/SelectionToolbar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAdminPhotos } from '@/hooks/admin/useAdminPhotos';
import { useAdminSelection } from '@/hooks/admin/useAdminSelection';
// Removed PhotoDetailDialog as it is replaced by YarlLightbox

export function AdminGridContainer() {
  const { handleBatchAiIdentifyTrigger } = useAdminBatchActions();
  const isManagement = window.location.pathname.startsWith('/admin');
  
  const navigate = useRouterSafe().navigate;
  const filters = useFilters({ enableStatus: true, enableBatch: true });
  const { search, setSearch, sort, setSort, showGroupsCollapsed, setShowGroupsCollapsed } = filters;
  const hasSearchQuery = !!search?.trim();
  
  const update = useUIStore(s => s.update);
  const { columns, setColumns } = useColumns();
  const isMultiSelect = useUIStore(s => s.isMultiSelect);
  
  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();

  const filterKeyHash = `${filters.category || 'all'}-${filters.tags?.[0] || 'all'}-${encodeURIComponent(search || '')}-${sort || 'newest'}`;

  // 1. Data Layer
  const { 
    gridPhotos, photos, isPending, isFetchingNextPage, hasNextPage, fetchNextPage 
  } = useAdminPhotos();

  // 2. Action Layer
  const {
      isDeleteOpen,
      idsToDelete,
      deleteDialogControl,
      initiateDelete,
      confirmDelete,
      initiateHide,
      initiateBatchEdit
  } = useAdminSelection();

  const { can } = usePermission();
  const canPin = can('photo:toggle-pinned');

  const virtualGridRef = useRef<any>(null);
  const scrollToTop = () => virtualGridRef.current?.scrollToIndex(0);

  const renderCard = (photo: Photo, index: number, categories: any[]) => (
    <AdminPhotoCard 
      key={`${photo.id}-${showGroupsCollapsed}`}
      photo={photo}
      showGroupsCollapsed={showGroupsCollapsed}
      hasSearchQuery={hasSearchQuery}
      sharedCategories={categories}
      sharedTags={tags}
      canPin={canPin}
    />
  );

  const disableMultiSelect = () => {
    update({ isMultiSelect: false, selectedIds: [] });
  };

  return (
    <div className="flex flex-col h-full bg-brand-bg w-full overflow-hidden text-text animate-fade-in">
        <div className="flex-1 overflow-hidden bg-brand-bg relative">
            <VirtualPhotoGrid 
              key="admin-photo-grid"
              restoreKey="admin_view_scroll_vlist"
              photos={gridPhotos}
              isFetching={isPending}
              isFetchingNextPage={isFetchingNextPage}
              hasNextPage={hasNextPage}
              onLoadMore={fetchNextPage}
              renderCard={renderCard}
              columns={columns}
              categories={categories}
            />
        </div>

        <UploadButton 
          onAdd={() => document.getElementById('admin-quick-add-input')?.click()}
        />

        <SelectionToolbar
          onDelete={initiateDelete}
          onBatchEdit={initiateBatchEdit}
          onHide={initiateHide}
          onAIIdentify={(ids) => handleBatchAiIdentifyTrigger(ids)}
        />

        <ConfirmDialog
          open={isDeleteOpen}
          onOpenChange={deleteDialogControl.toggle}
          title="确认删除"
          description={`确认删除这 ${idsToDelete.length} 张照片吗？`}
          confirmText="删除"
          variant="destructive"
          onConfirm={confirmDelete}
        />
      </div>
  );
};

