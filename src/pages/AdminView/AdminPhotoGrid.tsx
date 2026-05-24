import React from 'react';
import { AdminGallery } from '@/components/admin/AdminGallery';
import { Photo, Category, Tag, AppSettings } from '@/types';
import { useGalleryStore } from '@/store';

interface AdminPhotoGridProps {
  photos: Photo[];
  isSyncing: boolean;
  onRefresh: () => void;
  cloudCount: number;
  onLoadMore: () => void;
  hasNextPage: boolean;
  isFetchingNextPage?: boolean;
  isLoading?: boolean;
}

export const AdminPhotoGrid: React.FC<AdminPhotoGridProps> = (props) => {
  return (
    <AdminGallery 
      isRefreshing={props.isSyncing || props.isLoading}
      onRefresh={props.onRefresh}
      isStaffMode={true}
    />
  );
};
