import React from 'react';
import { GroupDetailView } from '../GroupDetailView';
import { AdminHeader } from './AdminHeader';
import { AdminGalleryShell } from '../AdminGalleryShell';
import { FloatingActionButton } from './FloatingActionButton';
import { PublicGallery } from '../PublicGallery';
import { PAGINATION } from '../../constants/config';
import { photoApi } from '../../api/photos';

export function AdminMainScreen({
  activeGroupId,
  setActiveGroupId,
  setAlertDialog,
  photos,
  setPhotos,
  setEditPhotoId,
  setBatchEditIds,
  handleUngroup,
  handlePhotoImport,
  lang,
  t,
  categories,
  manufacturers,
  tags,
  tagIdToNameMap,
  handleGroupAiIdentify,
  handleSingleAiAnalyze,
  handleError,
  viewMode,
  setViewMode,
  isMultiSelect,
  selectedIds,
  gridPhotos,
  setSelectedIds,
  setIsMultiSelect,
  handleBatchAiIdentifyTrigger,
  setActiveScreen,
  loginWithGoogle,
  performPullSync,
  cloudCount,
  appLang,
  settings,
  loadingState,
  columns,
  setColumns,
  user,
  visibleCount,
  setVisibleCount,
  showToast
}: any) {
  if (activeGroupId) {
    return (
      <GroupDetailView
        activeGroupId={activeGroupId}
        setActiveGroupId={setActiveGroupId}
        setAlertDialog={setAlertDialog}
        photos={photos}
        displayPhotos={photos.filter((p: any) => p.groupId === activeGroupId)}
        setLightboxIndex={() => {}}
        isAdminMode={true}
        isStaffMode={true}
        onEditPhoto={(p: any) => { setEditPhotoId(p.id); }}
        onLongPressStart={() => {}}
        onLongPressEnd={() => {}}
        onBatchEdit={(ids: string[]) => { setBatchEditIds(ids); }}
        onUngroup={async (groupId: string) => { 
          await handleUngroup(groupId); 
        }}
        onAddPhotoToGroup={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.multiple = true;
          input.onchange = (e) => handlePhotoImport(e as any, false);
          input.click();
        }}
        setPhotos={setPhotos}
        lang={lang}
        t={t}
        categories={categories}
        manufacturers={manufacturers}
        allTags={tags}
        tagMap={tagIdToNameMap as any}
        onBatchAiAnalyze={handleGroupAiIdentify}
        onAiAnalyze={(p: any) => {
          handleSingleAiAnalyze(p.uri || p.image_url, p.categoryId || undefined, p.id);
        }}
        onToggleHidden={async (photo: any) => {
          const newStatus = !photo.isHidden;
          try {
            await photoApi.update(photo.id, { isHidden: newStatus, updatedAt: new Date().toISOString() });
            setPhotos((prev: any) => prev.map((p: any) => p.id === photo.id ? { ...p, isHidden: newStatus } : p));
          } catch (e) {
            handleError(e, '切換隱藏狀態失敗');
          }
        }}
      />
    );
  }

  if (viewMode === 'private') {
    return (
      <div className="flex flex-col fixed inset-0 bg-[#FDFAF6] overflow-hidden">
        <AdminHeader 
            isMultiSelect={isMultiSelect}
            selectedIds={selectedIds}
            filteredPhotos={gridPhotos}
            setSelectedIds={setSelectedIds}
            setIsMultiSelect={setIsMultiSelect}
            handleBatchAiIdentifyTrigger={handleBatchAiIdentifyTrigger}
            handleManageClick={() => setActiveScreen((prev: string) => prev === 'manage' ? 'home' : 'manage')}
            loginWithGoogle={loginWithGoogle}
            onRefresh={() => performPullSync()}
            photosCount={photos.length}
            totalPhotosCount={photos.length}
            cloudCount={cloudCount}
            appLang={appLang}
        />
        <div className="flex-1 min-h-0 relative">
            <AdminGalleryShell 
                onExit={() => setViewMode('public')}
            />
            <FloatingActionButton 
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.multiple = true;
                input.onchange = (e) => handlePhotoImport(e as any, false);
                input.click();
              }}
              title={t.addPhoto}
            />
        </div>
      </div>
    );
  }

  if (viewMode === 'public') {
    return (
      <div className="flex flex-col fixed inset-0 bg-[#FDFAF6] overflow-hidden">
        <div className="flex-1 min-h-0 relative bg-bg">
            <PublicGallery 
                isAdminMode={false}
                onTogglePinned={async (photo: any) => {
                  const newStatus = !photo.isPinned;
                  const affectedPhotos = photo.groupId 
                    ? photos.filter((p: any) => p.groupId === photo.groupId)
                    : [photo];
                  import('../../services/photoService').then(async (m) => {
                    try {
                      await Promise.all(
                        affectedPhotos.map((p: any) => 
                          m.updatePhoto(p.id, { isPinned: newStatus }, setPhotos)
                        )
                      );
                    } catch (e: any) {
                      handleError(e, "[ERROR] Failed to toggle pinned:");
                      showToast('Failed to toggle pin status', 'error');
                    }
                  });
                }}
                settings={settings}
                isRefreshing={loadingState === 'syncing'}
                onExit={() => setViewMode('private')}
                showExit={true}
                onRefresh={() => performPullSync()}
                hideHeader={false}
                columns={columns}
                setColumns={setColumns}
                cloudCount={cloudCount}
                user={user}
                loginWithGoogle={loginWithGoogle}
                onLoadMore={() => {
                  if (visibleCount < gridPhotos.length) {
                    setVisibleCount((prev: number) => prev + PAGINATION.PUBLIC_PAGE_SIZE);
                  } else if (photos.length < (cloudCount || 0)) {
                    performPullSync();
                  }
                }}
                hasMore={visibleCount < gridPhotos.length || (cloudCount !== null && photos.length < cloudCount)}
            />
        </div>
      </div>
    );
  }

  return null;
}
