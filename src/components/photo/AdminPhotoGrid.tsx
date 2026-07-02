import React from 'react';
import { PhotoGridContent } from './PhotoGridContent.js';
import { useIsMultiSelect, useSelectionActions } from '#src/features/selection/index.js';
import { Category } from '#src/types/photo.js';
import { PhotoListItem } from '#src/types/api.js';
import { AdminPhotoCard } from './AdminPhotoCard.js';
import { usePermission } from '#src/hooks/index.js';

interface AdminPhotoGridProps {
  photos: PhotoListItem[];
  dataVersion: string;
  isPending: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  columns: number;
  filters: Record<string, unknown>;
  categories?: Category[];
  error?: unknown;
  onRetry?: () => void;
  onPhotoClick?: (id: string, index: number, e?: React.MouseEvent) => void;
  ref?: React.Ref<any>;
}

export function AdminPhotoGrid({ 
  photos, 
  dataVersion, 
  isPending, 
  isFetching, 
  isFetchingNextPage, 
  hasNextPage, 
  fetchNextPage, 
  filters,
  onPhotoClick,
  columns,
  error,
  onRetry,
  ref: gridRef
}: AdminPhotoGridProps) {
  const isMultiSelect = useIsMultiSelect();
  const { toggleSelect } = useSelectionActions();
  const { can } = usePermission();
  const canPinGlobal = can('photo:toggle-pinned');
  
  const allIds = React.useMemo(() => (photos || []).map(p => p.id), [photos]);

  const handlePhotoClick = React.useCallback((id: string, index: number, e?: React.MouseEvent) => {
    if (isMultiSelect) {
      toggleSelect(id);
    } else {
      onPhotoClick?.(id, index, e);
    }
  }, [isMultiSelect, toggleSelect, onPhotoClick]);

  const showGroupsCollapsed = filters?.showGroupsCollapsed !== false;
  const hasSearchQuery = !!filters?.search;

  const renderItem = React.useCallback((photo: PhotoListItem, index: number) => {
    return (
      <div className="w-full h-full p-[1px]">
        <AdminPhotoCard 
          photo={photo} 
          onClick={(e: any) => handlePhotoClick(photo.id, index, e)} 
          showGroupsCollapsed={showGroupsCollapsed}
          hasSearchQuery={hasSearchQuery}
          canPinGlobal={canPinGlobal}
          priority={index < 12}
        />
      </div>
    );
  }, [handlePhotoClick, showGroupsCollapsed, hasSearchQuery, canPinGlobal]);

  return (
    <div className="h-full w-full relative">
      <PhotoGridContent 
        photos={photos || []}
        dataVersion={dataVersion}
        isPending={isPending}
        isFetching={isFetching}
        isFetchingNextPage={isFetchingNextPage}
        hasNextPage={hasNextPage}
        fetchNextPage={fetchNextPage}
        columns={columns}
        error={error}
        onRetry={onRetry}
        renderItem={renderItem}
        gridRef={gridRef}
      />
    </div>
  );
}
