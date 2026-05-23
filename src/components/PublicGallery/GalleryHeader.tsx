import React from 'react';
import { PublicGalleryHeader } from '../PublicGalleryHeader';
import { User, AppSettings, Photo } from '../../types';

import { useAdminMode } from '@/hooks';
import { useGalleryStore } from '@/store';
import { translations } from '../../lib/translations';

interface GalleryHeaderProps {
  totalCount?: number;
  photos: Photo[];
  isRefreshing: boolean;
  isMultiSelect: boolean;
  onRefresh?: () => void;
  onAddPhoto?: () => void;
  onExit: () => void;
  onLogin?: () => void;
  onOpenSettings?: () => void;
}

export const GalleryHeader: React.FC<GalleryHeaderProps> = (props) => {
  const isAdminMode = useAdminMode();
  const lang = useGalleryStore(s => s.appLang);
  const t = translations[lang] || translations.zh;

  return (
    <PublicGalleryHeader 
      totalCount={props.totalCount}
      photos={props.photos}
      isAdminMode={isAdminMode}
      isRefreshing={props.isRefreshing}
      onRefresh={props.onRefresh || (() => {})}
      onAddPhoto={props.onAddPhoto || (() => {})}
      onExit={props.onExit}
      onLogin={props.onLogin}
      onOpenSettings={props.onOpenSettings}
    />
  );
};
