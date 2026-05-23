import React from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Photo } from '@/types';

interface AdminToolbarProps {
  photos: Photo[];
  handleBatchAiIdentifyTrigger: () => void;
  onManageClick: () => void;
  loginWithGoogle: () => Promise<any>;
  onRefresh: () => void;
  cloudCount: number;
  lang: string;
  loadingType: string;
}

export const AdminToolbar: React.FC<AdminToolbarProps> = (props) => {
  return (
    <AdminHeader 
      filteredPhotos={props.photos}
      handleBatchAiIdentifyTrigger={props.handleBatchAiIdentifyTrigger}
      handleManageClick={props.onManageClick}
      loginWithGoogle={props.loginWithGoogle}
      onRefresh={props.onRefresh}
      photosCount={props.photos.length}
      totalPhotosCount={props.photos.length}
      cloudCount={props.cloudCount}
      appLang={props.lang as any}
      isAnalyzing={props.loadingType === 'analyzing'}
    />
  );
};
