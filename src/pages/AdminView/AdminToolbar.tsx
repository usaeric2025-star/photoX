import React from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Photo } from '@/types';

interface AdminToolbarProps {
  isMultiSelect: boolean;
  selectedIds: string[];
  photos: Photo[];
  setSelectedIds: (ids: string[]) => void;
  setIsMultiSelect: (m: boolean) => void;
  handleBatchAiIdentifyTrigger: () => void;
  onManageClick: () => void;
  loginWithGoogle: () => Promise<any>;
  onRefresh: () => void;
  cloudCount: number;
  lang: string;
  loadingType: string;
  batchProgress: any;
}

export const AdminToolbar: React.FC<AdminToolbarProps> = (props) => {
  return (
    <AdminHeader 
      isMultiSelect={props.isMultiSelect}
      selectedIds={props.selectedIds}
      filteredPhotos={props.photos}
      setSelectedIds={props.setSelectedIds}
      setIsMultiSelect={props.setIsMultiSelect}
      handleBatchAiIdentifyTrigger={props.handleBatchAiIdentifyTrigger}
      handleManageClick={props.onManageClick}
      loginWithGoogle={props.loginWithGoogle}
      onRefresh={props.onRefresh}
      photosCount={props.photos.length}
      totalPhotosCount={props.photos.length}
      cloudCount={props.cloudCount}
      appLang={props.lang as any}
      isAnalyzing={props.loadingType === 'analyzing'}
      batchProgress={props.batchProgress}
    />
  );
};
