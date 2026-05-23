import React from 'react';
import { AdminFloatingButtons } from '@/components/admin/AdminFloatingButtons';
import { Photo, Category, Tag, User, AppSettings } from '@/types';
import { AdminToolbar } from './AdminToolbar';
import { AdminPhotoGrid } from './AdminPhotoGrid';
import { AdminEmptyState } from './AdminEmptyState';

interface Props {
  photos: Photo[];
  onManageClick: () => void;
  onRefresh: () => void;
  cloudCount: number;
  loadingType: string;
  onLoadMore: () => void;
  hasNextPage: boolean;
  onImport: () => void;
  loginWithGoogle: () => Promise<any>;
  isFetchingNextPage?: boolean;
  isLoading?: boolean;
  isAdmin?: boolean;
}

import { useMultiSelect } from '@/hooks/useMultiSelect';

import { useGalleryStore, useShallow } from '@/store';
import { usePhotoActions } from '@/contexts/PhotoActionsContext';
import { translations } from '@/lib/translations';
import { useTaskExecutor } from '@/hooks';

export const MainAdminScreen: React.FC<Props> = React.memo((props) => {
  const {
    photos, onManageClick, onRefresh, cloudCount,
    loadingType, onLoadMore, hasNextPage, onImport, loginWithGoogle,
    isFetchingNextPage, isLoading
  } = props;

  const { selectedIds, clear } = useMultiSelect();
  const { lang, columns, setColumns } = useGalleryStore(useShallow(s => ({
    lang: s.appLang,
    columns: s.columns,
    setColumns: s.setColumns
  })));
  
  const t = translations[lang as keyof typeof translations] || translations.zh;
  
  const {
    onEditPhoto, onToggleHidden, onTogglePinned, onAiAnalyze, 
    onSetGroupCover, onBatchAiAnalyze, onGroupPhotos, onBatchEdit, 
    onDeletePhoto
  } = usePhotoActions();

  const isAnalyzing = loadingType === 'analyzing';
  const batchProgress = props.isAdmin ? (props as any).batchProgress : null;

  return (
    <div className="flex flex-col fixed inset-0 bg-brand-bg overflow-hidden">
      <AdminToolbar 
        photos={photos}
        onManageClick={onManageClick}
        loginWithGoogle={loginWithGoogle}
        onRefresh={onRefresh}
        cloudCount={cloudCount}
        loadingType={loadingType}
        lang={lang}
        handleBatchAiIdentifyTrigger={() => {
            if (onBatchAiAnalyze) onBatchAiAnalyze(photos);
        }}
      />
      <div className="flex-1 min-h-0 relative">
        {photos.length === 0 && loadingType !== 'sync-pull' && !isLoading ? (
          <AdminEmptyState t={t} />
        ) : (
          <AdminPhotoGrid 
            photos={photos}
            loadingType={loadingType}
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
}, (prevProps, nextProps) => {
  return prevProps.photos === nextProps.photos &&
         prevProps.cloudCount === nextProps.cloudCount &&
         prevProps.loadingType === nextProps.loadingType &&
         prevProps.hasNextPage === nextProps.hasNextPage &&
         prevProps.isFetchingNextPage === nextProps.isFetchingNextPage;
});
