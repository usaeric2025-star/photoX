import React from 'react';
import { GalleryVariant } from '@/types/variant';
import { Photo } from '@/types';
import { AdminHeader as UnifiedHeader } from '@/components/layouts/AdminHeader';

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
  return (
    <UnifiedHeader 
      variant={props.variant || 'full-management'}
      photos={props.photos}
      handleBatchAiIdentifyTrigger={props.handleBatchAiIdentifyTrigger}
      handleManageClick={props.onManageClick}
      loginWithGoogle={props.loginWithGoogle}
      onRefresh={props.onRefresh}
      cloudCount={props.cloudCount}
      isRefreshing={props.isSyncing}
      adminPreviewMode={props.adminPreviewMode}
      setAdminPreviewMode={props.setAdminPreviewMode}
    />
  );
};
