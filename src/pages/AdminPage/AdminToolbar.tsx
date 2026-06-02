import React from 'react';
import { AdminHeader } from '@/components/layouts/headers/AdminHeader';

interface AdminToolbarProps {
  variant: string;
  photos: any[];
  onManageClick: () => void;
  loginWithGoogle: () => void;
  onRefresh: () => void;
  cloudCount: number;
  isSyncing: boolean;
  handleBatchAiIdentifyTrigger?: () => Promise<void>;
}

export function AdminToolbar({
  variant,
  photos,
  onRefresh,
  isSyncing,
  handleBatchAiIdentifyTrigger,
}: AdminToolbarProps) {
  return (
    <AdminHeader
      onRefresh={onRefresh}
      isRefreshing={isSyncing}
      totalCount={photos?.length}
      onBatchAiIdentify={handleBatchAiIdentifyTrigger}
    />
  );
}
