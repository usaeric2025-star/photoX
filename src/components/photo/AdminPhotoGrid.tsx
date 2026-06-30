import React from 'react';
import { motion } from 'lite-sleek';
import { PhotoGridContent } from './PhotoGridContent';
import { useIsMultiSelect, useSelectionActions } from '@/features/selection';
import { Category } from '@/types/photo';
import { PhotoListItem } from '@/types/api';
import { AdminPhotoCard } from './AdminPhotoCard';
import { usePermission } from '@/hooks';

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
  onRetry
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
      <motion.div
        initial={{ opacity: 0, transform: 'translateY(10px)' }}
        animate={{ opacity: 1, transform: 'translateY(0)' }}
        transition="all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
        className="w-full h-full p-[1px]"
      >
        <AdminPhotoCard 
          photo={photo} 
          onClick={(e: any) => handlePhotoClick(photo.id, index, e)} 
          showGroupsCollapsed={showGroupsCollapsed}
          hasSearchQuery={hasSearchQuery}
          canPinGlobal={canPinGlobal}
        />
      </motion.div>
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
      />
    </div>
  );
}
