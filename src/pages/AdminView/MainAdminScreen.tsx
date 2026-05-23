import React from 'react';
import { AdminFloatingButtons } from '@/components/admin/AdminFloatingButtons';
import { Photo, Category, Tag, User, AppSettings } from '@/types';
import { AdminToolbar } from './AdminToolbar';
import { AdminPhotoGrid } from './AdminPhotoGrid';
import { AdminEmptyState } from './AdminEmptyState';

import { useAdmin } from '@/contexts/AdminContext';
import { useMultiSelect } from '@/hooks';
import { usePhotoActions } from '@/contexts/PhotoActionsContext';
import { useGalleryStore, useShallow } from '@/store';
import { translations } from '@/lib/translations';

export const MainAdminScreen: React.FC = React.memo(() => {
  const logic = useAdmin();
  const {
    photos, onRefresh, cloudCount,
    isSyncing, loginWithGoogle,
    infinitePhotosQuery,
    handleManageClick: onManageClick,
    handleLoadMoreCallback: onLoadMore,
    handleImport: onImport,
  } = logic;

  const hasNextPage = !!infinitePhotosQuery?.hasNextPage;
  const isFetchingNextPage = !!infinitePhotosQuery?.isFetchingNextPage;
  const isLoading = !!infinitePhotosQuery?.isLoading;

  const { selectedIds, clear } = useMultiSelect();
  const { lang } = useGalleryStore(useShallow(s => ({
    lang: s.appLang
  })));
  
  const t = translations[lang] || translations.zh;
  
  const {
    onBatchAiAnalyze, onGroupPhotos, onBatchEdit, 
    onDeletePhoto
  } = usePhotoActions();

  return (
    <div className="flex flex-col fixed inset-0 bg-brand-bg overflow-hidden" id="main-admin-screen">
      <AdminToolbar 
        photos={photos}
        onManageClick={onManageClick}
        loginWithGoogle={loginWithGoogle}
        onRefresh={onRefresh}
        cloudCount={cloudCount}
        isSyncing={isSyncing}
        lang={lang}
        adminPreviewMode={logic.adminPreviewMode}
        setAdminPreviewMode={logic.setAdminPreviewMode}
        handleBatchAiIdentifyTrigger={() => {
            if (onBatchAiAnalyze) onBatchAiAnalyze(photos);
        }}
      />
      <div className="flex-1 min-h-0 relative">
        {photos.length === 0 && !isSyncing && !isLoading ? (
          <AdminEmptyState t={t} />
        ) : (
          <AdminPhotoGrid 
            photos={photos}
            isSyncing={isSyncing}
            onRefresh={onRefresh}
            cloudCount={cloudCount}
            onLoadMore={onLoadMore}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            isLoading={isLoading}
          />
        )}
        <AdminFloatingButtons 
          photos={photos}
          onAdd={onImport}
          onClearSelection={clear}
          onBatchAiIdentify={() => {
              if (onBatchAiAnalyze) onBatchAiAnalyze(photos.filter(p => selectedIds.includes(p.id)));
          }}
          onBatchEdit={() => {
              if (onBatchEdit) onBatchEdit(selectedIds);
          }}
          onGroup={() => {
              if (onGroupPhotos) onGroupPhotos(selectedIds);
          }}
          onDelete={() => {
              if (onDeletePhoto) {
                 onDeletePhoto(selectedIds);
              }
          }}
          onToggleVisibility={() => {
              // Usually the store has a batch toggle or we need one
          }}
        />
      </div>
    </div>
  );
});
