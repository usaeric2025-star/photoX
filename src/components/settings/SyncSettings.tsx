import React from 'react';
import { SyncSection } from './SyncSection';
import { ExportDataSection } from './ExportDataSection';
import { User, Photo, Category, Tag, Manufacturer, ApiResponse } from '@/types';
import { useGalleryStore } from '@/store/galleryStore';

interface SyncSettingsProps {
  user: User | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  performPushSync: () => Promise<ApiResponse>;
  performPullSync: () => Promise<ApiResponse>;
  refreshCloudData: (user: User | null, force?: boolean) => Promise<void>;
  cloudCount: number | null;
  isSyncing: boolean;
  photos: Photo[];
  categories: Category[];
  tags: Tag[];
  manufacturers: Manufacturer[];
  handleDeduplicate: () => Promise<void>;
  cardClass: string;
  buttonStyles: any;
}

export const SyncSettings: React.FC<SyncSettingsProps> = (props) => {
  const { setAlertDialog } = useGalleryStore();
  return (
    <>
      <SyncSection 
        user={props.user}
        loginWithGoogle={props.loginWithGoogle}
        logout={props.logout}
        performPushSync={props.performPushSync}
        performPullSync={props.performPullSync}
        refreshCloudData={props.refreshCloudData}
        cloudCount={props.cloudCount}
        isSyncing={props.isSyncing}
        setAlertDialog={setAlertDialog}
      />
      <ExportDataSection 
        photos={props.photos}
        categories={props.categories}
        tags={props.tags}
        manufacturers={props.manufacturers}
        isSyncing={props.isSyncing}
        user={props.user}
        cardClass={props.cardClass}
        buttonStyles={props.buttonStyles}
        handleDeduplicate={props.handleDeduplicate}
      />
    </>
  );
};
