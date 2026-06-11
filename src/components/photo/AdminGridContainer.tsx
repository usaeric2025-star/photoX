import React, { useRef } from 'react';
import { motion, LayoutGroup } from 'motion/react';
import { Photo } from '@/types';
import { VirtualPhotoGrid } from '@/components/photo/VirtualPhotoGrid';
import { PhotoCard } from '@/components/photo/PhotoCard';
import { AdminFilters } from '@/components/ui/AdminFilters';
import { 
  useScrollRestoration, 
  useUrlFilters, 
  useColumns,
  useCategories,
  useTags,
  useAdminBatchActions,
  usePermission
} from '@/hooks';
import { useUIStore } from '@/store/useUIStore';
import { UploadButton } from '@/components/shared/UploadButton';
import { SelectionToolbar } from '@/components/shared/SelectionToolbar';
import { useNavigate } from '@tanstack/react-router';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAdminPhotos } from '@/hooks/admin/useAdminPhotos';
import { useAdminSelectionActions } from '@/hooks/admin/useAdminSelectionActions';

export function AdminGridContainer() {
  const { handleBatchAiIdentifyTrigger } = useAdminBatchActions();
  const isManagement = window.location.pathname.startsWith('/admin');
  useScrollRestoration('admin_gallery_scroll');
  
  const navigate = useNavigate();
  const { filters: urlFilters, setShowGroupsCollapsed, setSearchQuery, setSortOrder } = useUrlFilters();
  const showGroupsCollapsed = urlFilters.showGroupsCollapsed !== false;
  const hasSearchQuery = !!urlFilters.searchQuery?.trim();
  
  const update = useUIStore(s => s.update);
  const [columns, setColumns] = useColumns();
  const isMultiSelect = useUIStore(s => s.isMultiSelect);

  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();

  // 1. Data Layer
  const { 
    gridPhotos, photos, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage 
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
  } = useAdminSelectionActions();

  const { can } = usePermission();
  const canPin = can('photo:toggle-pinned');

  const virtualGridRef = useRef<any>(null);
  const scrollToTop = () => virtualGridRef.current?.scrollToIndex(0);

  const renderCard = React.useCallback((photo: Photo, index: number, categories: any[]) => (
    <PhotoCard 
      key={photo.id}
      photo={photo}
      index={index}
      showGroupsCollapsed={showGroupsCollapsed}
      hasSearchQuery={hasSearchQuery}
      sharedCategories={categories}
      sharedTags={tags}
      canPin={canPin}
    />
  ), [showGroupsCollapsed, hasSearchQuery, canPin, tags]);

  const disableMultiSelect = () => {
    update({ isMultiSelect: false, selectedIds: [] });
  };

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
             key={`photo-grid-${urlFilters.showGroupsCollapsed ? 'c' : 'e'}-${urlFilters.searchQuery || ''}`}
             restoreKey="admin_view_scroll_vlist"
             photos={gridPhotos}
             isFetching={isLoading}
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
      </motion.div>
    </LayoutGroup>
  );
};

