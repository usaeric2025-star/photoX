import React from 'react';
import { AdminFloatingButtons } from '@/components/admin/AdminFloatingButtons';
import { Photo, Category, Tag, User, AppSettings } from '@/types';
import { AdminToolbar } from './AdminToolbar';
import { AdminPhotoGrid } from './AdminPhotoGrid';
import { AdminEmptyState } from './AdminEmptyState';

interface Props {
  photos: Photo[];
  handleBatchAiIdentifyTrigger: () => void;
  onManageClick: () => void;
  onRefresh: () => void;
  cloudCount: number;
  lang: string;
  loadingType: string;
  batchProgress: any;
  categories: Category[];
  tags: Tag[];
  onTogglePinned: (p: Photo) => Promise<void>;
  onToggleHidden: (p: Photo) => Promise<void>;
  onSetGroupCover: (id: string, gid: string) => Promise<void>;
  settings: AppSettings;
  columns: 2 | 3 | 5;
  setColumns: (c: 2 | 3 | 5) => void;
  user: User | null;
  onEditPhoto: (id: string) => void;
  onLoadMore: () => void;
  hasNextPage: boolean;
  onImport: () => void;
  t: any;
  loginWithGoogle: () => Promise<any>;
  onDeletePhotos?: (ids: string[]) => void;
  onGroupPhotos?: (ids: string[]) => void;
  onBatchEdit?: (ids: string[]) => void;
  onAiAnalyze?: (photo: Photo) => Promise<any>;
  onBatchAiAnalyze?: (photos: Photo[]) => void;
  onCancelAnalyze?: () => void;
  onBatchToggleHidden?: (ids: string[]) => void;
  isAnalyzing?: boolean;
  isFetchingNextPage?: boolean;
  isLoading?: boolean;
  isAdmin?: boolean;
}

import { useMultiSelect } from '@/hooks/useMultiSelect';

export const MainAdminScreen: React.FC<Props> = React.memo((props) => {
  const {
    photos, 
    handleBatchAiIdentifyTrigger, onManageClick, onRefresh, cloudCount,
    lang, loadingType, batchProgress, categories, tags,
    settings, columns, setColumns, onLoadMore, hasNextPage, onImport, t, loginWithGoogle,
    onDeletePhotos, onGroupPhotos, onBatchEdit, onBatchAiAnalyze, onBatchToggleHidden,
    isFetchingNextPage, isLoading, onEditPhoto, onToggleHidden, onTogglePinned, onAiAnalyze, onSetGroupCover, onCancelAnalyze, isAnalyzing
  } = props;

  const { selectedIds, clear } = useMultiSelect();

  return (
    <div className="flex flex-col fixed inset-0 bg-brand-bg overflow-hidden">
      <AdminToolbar 
        photos={photos}
        handleBatchAiIdentifyTrigger={handleBatchAiIdentifyTrigger}
        onManageClick={onManageClick}
        loginWithGoogle={loginWithGoogle}
        onRefresh={onRefresh}
        cloudCount={cloudCount}
        lang={lang}
        loadingType={loadingType}
        batchProgress={batchProgress}
      />
      <div className="flex-1 min-h-0 relative">
        {photos.length === 0 && loadingType !== 'sync-pull' && !isLoading ? (
          <AdminEmptyState t={t} />
        ) : (
          <AdminPhotoGrid 
            photos={photos}
            categories={categories}
            tags={tags}
            settings={settings}
            loadingType={loadingType}
            onRefresh={onRefresh}
            columns={columns}
            setColumns={setColumns}
            cloudCount={cloudCount}
            onLoadMore={onLoadMore}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            isLoading={isLoading}
            onEditPhoto={onEditPhoto}
            onToggleHidden={onToggleHidden}
            onTogglePinned={onTogglePinned}
            onAiAnalyze={onAiAnalyze}
            onSetGroupCover={onSetGroupCover}
            onCancelAnalyze={onCancelAnalyze}
            isAnalyzing={isAnalyzing}
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
              if (onDeletePhotos) onDeletePhotos(selectedIds);
          }}
          onToggleVisibility={() => {
              if (onBatchToggleHidden) onBatchToggleHidden(selectedIds);
          }}
        />
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.photos === nextProps.photos &&
         prevProps.cloudCount === nextProps.cloudCount &&
         prevProps.lang === nextProps.lang &&
         prevProps.loadingType === nextProps.loadingType &&
         prevProps.batchProgress === nextProps.batchProgress &&
         prevProps.categories === nextProps.categories &&
         prevProps.tags === nextProps.tags &&
         prevProps.settings === nextProps.settings &&
         prevProps.columns === nextProps.columns &&
         prevProps.user === nextProps.user &&
         prevProps.hasNextPage === nextProps.hasNextPage &&
         prevProps.isAnalyzing === nextProps.isAnalyzing &&
         prevProps.isFetchingNextPage === nextProps.isFetchingNextPage;
});
