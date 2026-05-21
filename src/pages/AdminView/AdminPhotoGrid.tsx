import React from 'react';
import { AdminGallery } from '@/components/admin/AdminGallery';
import { Photo, Category, Tag, AppSettings } from '@/types';
import { useGalleryStore } from '@/store';

interface AdminPhotoGridProps {
  photos: Photo[];
  categories: Category[];
  tags: Tag[];
  settings: AppSettings;
  loadingType: string;
  onRefresh: () => void;
  columns: 2 | 3 | 5;
  setColumns: (c: 2 | 3 | 5) => void;
  cloudCount: number;
  onLoadMore: () => void;
  hasNextPage: boolean;
  isFetchingNextPage?: boolean;
  onEditPhoto?: (id: string) => void;
  onToggleHidden?: (p: Photo) => Promise<void>;
  onAiAnalyze?: (photo: Photo) => Promise<any>;
  onSetGroupCover?: (id: string, gid: string) => Promise<void>;
  onCancelAnalyze?: () => void;
  isAnalyzing?: boolean;
}

export const AdminPhotoGrid: React.FC<AdminPhotoGridProps> = (props) => {

  return (
    <AdminGallery 
      photos={props.photos}
      categories={props.categories}
      tags={props.tags}
      settings={props.settings}
      isRefreshing={props.loadingType === 'sync-pull' || props.loadingType === 'sync-push'}
      onRefresh={props.onRefresh}
      columns={props.columns}
      setColumns={props.setColumns}
      totalCount={props.cloudCount}
      onLoadMore={props.onLoadMore}
      hasMore={props.hasNextPage}
      isFetchingNextPage={props.isFetchingNextPage}
      isStaffMode={true}
      onEditPhoto={props.onEditPhoto}
      onToggleHidden={props.onToggleHidden}
      onAiAnalyze={props.onAiAnalyze}
      onSetGroupCover={props.onSetGroupCover}
      onCancelAnalyze={props.onCancelAnalyze}
      isAnalyzing={props.isAnalyzing}
    />
  );
};
