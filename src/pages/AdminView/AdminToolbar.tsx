import React from 'react';
import { GalleryVariant } from '@/types/variant';
import { Photo } from '@/types';
import { AdminHeader } from '@/components/layouts/headers/AdminHeader';
import { PublicHeader } from '@/components/layouts/headers/PublicHeader';

interface AdminToolbarProps {
  photos: Photo[];
  handleBatchAiIdentifyTrigger: () => void;
  onManageClick: () => void;
  loginWithGoogle: () => Promise<any>;
  onRefresh: () => void;
  cloudCount: number;
  isSyncing: boolean;
  adminPreviewMode: 'private' | 'public';
  setAdminPreviewMode: (m: 'private' | 'public') => void;
  variant?: GalleryVariant;
}

export function AdminToolbar(props: AdminToolbarProps) {
  // 如果是在公开预览模式，使用 PublicHeader
  if (props.adminPreviewMode === 'public') {
    return (
      <PublicHeader 
        totalCount={props.photos?.length}
        onRefresh={props.onRefresh}
        isRefreshing={props.isSyncing}
        isStaff={props.variant === 'staff-workspace'}
      />
    );
  }

  return (
    <AdminHeader 
      onRefresh={props.onRefresh}
      isRefreshing={props.isSyncing}
      totalCount={props.photos?.length}
      onBatchAiIdentify={props.handleBatchAiIdentifyTrigger}
    />
  );
};
