import React from 'react';
import { PublicHeader } from '@/components/layouts/headers/PublicHeader';
import { AdminHeader } from '@/components/layouts/headers/AdminHeader';

interface AdminToolbarProps {
  variant: string;
  photos: any[];
  onManageClick: () => void;
  loginWithGoogle: () => void;
  onRefresh: () => void;
  cloudCount: number;
  isSyncing: boolean;
  adminPreviewMode: 'private' | 'public';
  setAdminPreviewMode: (data: any) => void;
  handleBatchAiIdentifyTrigger?: () => Promise<void>;
}

export function AdminToolbar({
  variant,
  photos,
  onRefresh,
  isSyncing,
  adminPreviewMode,
  handleBatchAiIdentifyTrigger,
}: AdminToolbarProps) {
  if (adminPreviewMode === 'public') {
    return (
      <PublicHeader
        totalCount={photos?.length}
        onRefresh={onRefresh}
        isRefreshing={isSyncing}
      />
    );
  }

  return (
    <AdminHeader
      onRefresh={onRefresh}
      isRefreshing={isSyncing}
      totalCount={photos?.length}
      onBatchAiIdentify={handleBatchAiIdentifyTrigger}
    />
  );
}
