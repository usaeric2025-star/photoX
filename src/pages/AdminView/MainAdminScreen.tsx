import React from 'react';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { PublicGallery } from '../../components/PublicGallery';
import { FloatingActionButton } from '../../components/admin/FloatingActionButton';
import { Photo, Category, Tag, User, AppSettings } from '../../types';

interface Props {
  isMultiSelect: boolean;
  selectedIds: string[];
  photos: Photo[];
  setSelectedIds: (ids: string[]) => void;
  setIsMultiSelect: (m: boolean) => void;
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
  loginWithGoogle: () => void;
}

export const MainAdminScreen: React.FC<Props> = ({
  isMultiSelect, selectedIds, photos, setSelectedIds, setIsMultiSelect,
  handleBatchAiIdentifyTrigger, onManageClick, onRefresh, cloudCount,
  lang, loadingType, batchProgress, categories, tags,
  onTogglePinned, onToggleHidden, onSetGroupCover, settings,
  columns, setColumns, user, onEditPhoto, onLoadMore, hasNextPage, onImport, t, loginWithGoogle
}) => {
  return (
    <div className="flex flex-col fixed inset-0 bg-brand-bg overflow-hidden">
      <AdminHeader 
          isMultiSelect={isMultiSelect}
          selectedIds={selectedIds}
          filteredPhotos={photos}
          setSelectedIds={setSelectedIds}
          setIsMultiSelect={setIsMultiSelect}
          handleBatchAiIdentifyTrigger={handleBatchAiIdentifyTrigger}
          handleManageClick={onManageClick}
          loginWithGoogle={loginWithGoogle}
          onRefresh={onRefresh}
          photosCount={photos.length}
          totalPhotosCount={photos.length}
          cloudCount={cloudCount}
          appLang={lang as any}
          isAnalyzing={loadingType === 'analyzing'}
          batchProgress={batchProgress}
       />
       <div className="flex-1 min-h-0 relative">
          <PublicGallery 
             photos={photos}
             categories={categories}
             tags={tags}
             isAdminMode={true}
             isStaffMode={true}
             onTogglePinned={onTogglePinned}
             onToggleHidden={onToggleHidden}
             onSetGroupCover={onSetGroupCover}
             settings={settings}
             isRefreshing={loadingType === 'sync-pull' || loadingType === 'sync-push'} // Simple isRefreshing check
             hideHeader={true}
             columns={columns}
             setColumns={setColumns}
             totalCount={cloudCount}
             user={user}
             loginWithGoogle={loginWithGoogle}
             onEditPhoto={onEditPhoto}
             onLoadMore={onLoadMore}
             hasMore={hasNextPage}
          />
          <FloatingActionButton 
            onClick={onImport}
            title={t.addPhoto}
          />
       </div>
    </div>
  );
};
