import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppRouter } from '#lib/router/index.js';
import { useGroupData } from '#src/hooks/index.js';
import { PhotoListItem } from '#src/types/api.js';
import { Photo } from '#src/types/index.js';
import { useLightbox, photosToLightboxSlides } from '#lib/lightbox/index.js';
import { useFilters, useTranslation } from '#src/hooks/index.js';
import { useIsMultiSelect } from '#src/hooks/index.js';
import { GroupSettingsDialog } from '#src/components/groups/GroupSettingsDialog.js';
import { useGroupEditState } from '#src/hooks/index.js';
import { useGroupMutations } from '#src/hooks/group/index.js';
import { AdminGroupHeader } from './components/AdminGroupHeader.js';
import { photoWallStore } from '#src/features/photo-wall/signal.js';
import { GroupDetailLayout } from './components/GroupDetailLayout.js';

export function AdminGroupDetailPage() {
  const { params, navigate } = useAppRouter();
  const { groupId: fGroupId, photoId } = useFilters();
  
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const pathId = pathname.startsWith('/admin/group/') ? pathname.split('/admin/group/')[1]?.replace(/\/$/, '') : undefined;
  const groupId = pathId || (params as { id?: string }).id || fGroupId;
  
  const { 
    group, 
    photos: rawPhotos, 
    totalCount, 
    loading, 
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage 
  } = useGroupData({ groupId, isAdmin: true });

  const photos = useMemo(() => rawPhotos || [], [rawPhotos]);
  const { t } = useTranslation();
  const { anchor, setAnchor } = useFilters();
  const { open: openLightbox } = useLightbox();

  const lightboxItems = useMemo(() => photosToLightboxSlides(photos), [photos]);

  const handlePhotoClick = useCallback((photo: PhotoListItem) => {
    const index = photos.findIndex(p => p.id === photo.id);
    openLightbox(lightboxItems, index >= 0 ? index : 0);
  }, [photos, lightboxItems, openLightbox]);

  // Sync mode and click handler to photoWallStore
  useEffect(() => {
    photoWallStore.setState({
      mode: 'admin',
      onPhotoClick: handlePhotoClick,
    });
  }, [handlePhotoClick]);

  // Anchoring effect
  useEffect(() => {
    if (anchor && photoId && !loading && photos.length > 0) {
      const timer = setTimeout(() => {
        const element = document.querySelector(`[data-photo-id="${photoId}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-4', 'ring-primary', 'scale-95');
          setTimeout(() => { 
             element.classList.remove('ring-4', 'ring-primary', 'scale-95');
             setAnchor(false);
          }, 2000);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [anchor, photoId, loading, photos.length]);

  const [showAdminTools, setShowAdminTools] = useState(false);
  const isMultiSelect = useIsMultiSelect();
  
  const { groupData, handleUpdateGroupData } = useGroupEditState(
    groupId,
    photos as unknown as Photo[],
    async (_id, _data) => {}
  );
  const { update, dissolve } = useGroupMutations();
  
  const handleUpdateTitle = async (newName: string) => {
    if (groupId) {
      await update.mutateAsync({ id: groupId, updates: { name: newName } });
    }
  };

  return (
    <GroupDetailLayout
      loading={loading}
      error={error}
      group={group}
      photos={photos}
      hasNextPage={!!hasNextPage}
      isFetchingNextPage={!!isFetchingNextPage}
      fetchNextPage={fetchNextPage || (() => {})}
      emptyTitle="分组不存在或已合并"
      emptyMessage="该分组可能已被删除、解散或合并至其他分组。正在跳转回管理页面..."
      onRetry={() => navigate.admin()}
      bottomPadding={isMultiSelect}
      header={
        <AdminGroupHeader 
          group={group!} 
          photoCount={totalCount} 
          onEditSettings={() => setShowAdminTools(true)}
          onUpdateTitle={handleUpdateTitle}
        />
      }
      floatingActions={
        showAdminTools ? (
          <GroupSettingsDialog
            showGroupSettings={showAdminTools}
            setShowGroupSettings={setShowAdminTools}
            activeGroupId={groupId || null}
            groupData={groupData}
            handleUpdateGroupData={handleUpdateGroupData}
            onUngroup={async (id) => {
              await dissolve.mutateAsync(id);
              navigate.admin();
            }}
            update={async (updates) => { if (groupId) await update.mutateAsync({ id: groupId, updates }); }}
            t={t}
          />
        ) : null
      }
    />
  );
}
