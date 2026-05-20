import React from 'react';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { PublicGallery } from '../../components/PublicGallery';
import { FloatingActionButton } from '../../components/admin/FloatingActionButton';
import { MultiSelectToolbar } from '../../components/admin/MultiSelectToolbar';
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
  isAdmin?: boolean;
}

export const MainAdminScreen: React.FC<Props> = React.memo(({
  isMultiSelect, selectedIds, photos, setSelectedIds, setIsMultiSelect,
  handleBatchAiIdentifyTrigger, onManageClick, onRefresh, cloudCount,
  lang, loadingType, batchProgress, categories, tags,
  onTogglePinned, onToggleHidden, onSetGroupCover, settings,
  columns, setColumns, user, onEditPhoto, onLoadMore, hasNextPage, onImport, t, loginWithGoogle,
  onDeletePhotos, onGroupPhotos, onBatchEdit, onAiAnalyze, onBatchAiAnalyze, onCancelAnalyze, onBatchToggleHidden, isAnalyzing,
  isFetchingNextPage, isAdmin
}) => {
  console.log('Rendering MainAdminScreen');
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
             isStaffMode={true}
             isAdminMode={isAdmin}
             onTogglePinned={onTogglePinned}
             onToggleHidden={onToggleHidden}
             onSetGroupCover={onSetGroupCover}
             settings={settings}
             isRefreshing={loadingType === 'sync-pull' || loadingType === 'sync-push'}
             isFetchingNextPage={isFetchingNextPage}
             hideHeader={true}
             columns={columns}
             setColumns={setColumns}
             totalCount={cloudCount}
             user={user}
             loginWithGoogle={loginWithGoogle}
             onEditPhoto={onEditPhoto}
             onLoadMore={onLoadMore}
             hasMore={hasNextPage}
             onDeletePhotos={onDeletePhotos}
             onGroupPhotos={onGroupPhotos}
             onBatchEdit={onBatchEdit}
             onAiAnalyze={onAiAnalyze}
             onBatchAiAnalyze={onBatchAiAnalyze}
             onCancelAnalyze={onCancelAnalyze}
             isAnalyzing={isAnalyzing}
             isMultiSelect={isMultiSelect}
             setIsMultiSelect={setIsMultiSelect}
             selectedIds={selectedIds}
             onToggleSelection={(id) => {
               if (selectedIds.includes(id)) {
                 setSelectedIds(selectedIds.filter(pid => pid !== id));
               } else {
                 setSelectedIds([...selectedIds, id]);
               }
             }}
             onClearSelection={() => setSelectedIds([])}
          />
          <FloatingActionButton 
            onClick={onImport}
            title={t.addPhoto}
          />
          {isMultiSelect && selectedIds.length > 0 && (
            <MultiSelectToolbar
              selectedCount={selectedIds.length}
              onClose={() => setIsMultiSelect(false)}
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
          )}
       </div>
    </div>
  );
}, (prevProps, nextProps) => {
  if (prevProps.photos !== nextProps.photos) return false;
  if (prevProps.isMultiSelect !== nextProps.isMultiSelect) return false;
  if (prevProps.selectedIds !== nextProps.selectedIds) return false;
  if (prevProps.cloudCount !== nextProps.cloudCount) return false;
  if (prevProps.lang !== nextProps.lang) return false;
  if (prevProps.loadingType !== nextProps.loadingType) return false;
  if (prevProps.batchProgress !== nextProps.batchProgress) return false;
  if (prevProps.categories !== nextProps.categories) return false;
  if (prevProps.tags !== nextProps.tags) return false;
  if (prevProps.settings !== nextProps.settings) return false;
  if (prevProps.columns !== nextProps.columns) return false;
  if (prevProps.user !== nextProps.user) return false;
  if (prevProps.hasNextPage !== nextProps.hasNextPage) return false;
  if (prevProps.isAnalyzing !== nextProps.isAnalyzing) return false;
  if (prevProps.isFetchingNextPage !== nextProps.isFetchingNextPage) return false;
  return true;
});
