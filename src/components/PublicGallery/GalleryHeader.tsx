import React from 'react';
import { PublicGalleryHeader } from '../PublicGalleryHeader';
import { User, AppSettings, Photo } from '../../types';

interface GalleryHeaderProps {
  totalCount?: number;
  settings?: AppSettings;
  photos: Photo[];
  isAdminMode: boolean;
  isRefreshing: boolean;
  isMultiSelect: boolean;
  lang: string;
  t: any;
  onRefresh?: () => void;
  onToggleMultiSelect: () => void;
  clearSelection: () => void;
  setIsMultiSelect: (val: boolean) => void;
  onAddPhoto?: () => void;
  onSetLang: (lang: any) => void;
  onExit: () => void;
  onLogin?: () => void;
  onOpenSettings?: () => void;
}

export const GalleryHeader: React.FC<GalleryHeaderProps> = (props) => {
  return (
    <PublicGalleryHeader 
      totalCount={props.totalCount}
      settings={props.settings}
      photos={props.photos}
      isAdminMode={props.isAdminMode}
      isRefreshing={props.isRefreshing}
      isMultiSelect={props.isMultiSelect}
      lang={props.lang}
      t={props.t}
      onHeaderClick={() => {}}
      onRefresh={props.onRefresh!}
      onToggleMultiSelect={props.onToggleMultiSelect}
      clearSelection={props.clearSelection}
      setIsMultiSelect={props.setIsMultiSelect}
      onAddPhoto={props.onAddPhoto!}
      onSetLang={props.onSetLang}
      onExit={props.onExit}
      onLogin={props.onLogin}
      onOpenSettings={props.onOpenSettings}
    />
  );
};
