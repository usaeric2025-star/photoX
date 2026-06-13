import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import React, { useRef, useEffect } from 'react';
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
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAdminPhotos } from '@/hooks/admin/useAdminPhotos';
import { useAdminSelection } from '@/hooks/admin/useAdminSelection';

export function AdminGridContainer() {
  const { handleBatchAiIdentifyTrigger } = useAdminBatchActions();
  const isManagement = window.location.pathname.startsWith('/admin');
  
  const navigate = useRouterSafe().navigate;
  const { dataFilters, setShowGroupsCollapsed, setSearchQuery, setSortOrder } = useUrlFilters();
  const showGroupsCollapsed = dataFilters.showGroupsCollapsed !== false;
  const hasSearchQuery = !!dataFilters.searchQuery?.trim();
  
  const update = useUIStore(s => s.update);
  const [columns, setColumns] = useColumns();
  const isMultiSelect = useUIStore(s => s.isMultiSelect);
  
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        setColumns(3);
      } else {
        setColumns(5); // Default desktop to 5
      }
    };
    handleResize(); 

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setColumns]);

  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();

  const filterKeyHash = `${dataFilters.categoryId || 'all'}-${dataFilters.tagId || 'all'}-${encodeURIComponent(dataFilters.searchQuery || '')}-${dataFilters.sortOrder || 'newest'}`;

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
  } = useAdminSelection();

  const { can } = usePermission();
  const canPin = can('photo:toggle-pinned');

  const virtualGridRef = useRef<any>(null);
  const scrollToTop = () => virtualGridRef.current?.scrollToIndex(0);

  const renderCard = (photo: Photo, index: number, categories: any[]) => (
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
  );

  const disableMultiSelect = () => {
    update({ isMultiSelect: false, selectedIds: [] });
  };

  return (
    <div className="flex flex-col h-full bg-brand-bg w-full overflow-hidden text-text animate-fade-in">
      <AdminFilters 
        onSearch={setSearchQuery}
        searchQuery={dataFilters.searchQuery || ''}
          onSortChange={() => setSortOrder(dataFilters.sortOrder === 'newest' ? 'oldest' : 'newest')}
          currentSort={dataFilters.sortOrder as 'newest' | 'oldest' | 'name'}
          onColumnsChange={(cols) => {
              setColumns(cols as 2 | 3 | 5);
              navigate({ 
                to: '.', search: (prev: any) => ({ ...prev, view: cols === 2 ? 'list' : 'grid' } as any) 
              });
          }}
          currentColumns={columns}
          onToggleGroups={() => setShowGroupsCollapsed(!dataFilters.showGroupsCollapsed)}
          showGroupsCollapsed={dataFilters.showGroupsCollapsed}
        />
        
        <div className="flex-1 overflow-hidden bg-brand-bg relative">
            <VirtualPhotoGrid 
              key={`admin-photo-grid-${filterKeyHash}`}
              restoreKey={`admin_view_scroll_vlist-${filterKeyHash}`}
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
      </div>
  );
};

