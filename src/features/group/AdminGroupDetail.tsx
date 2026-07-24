import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useAppLocation } from '#src/hooks/core/index.js';
import { useParams } from 'react-router-dom';

/**
 * AdminGroupDetailPage
 * 
 * 管理員合組詳情頁面。
 */
export function AdminGroupDetailPage() {
  const routeParams = useParams<{ id?: string }>();
  const { groupId: fGroupId, photoId } = useFilters();
  const [, setLocation] = useAppLocation();
  
  const groupId = routeParams?.id || fGroupId;
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
          element.classList.add('ring-4', 'ring-blue-500', 'scale-95');
          setTimeout(() => { 
             element.classList.remove('ring-4', 'ring-blue-500', 'scale-95');
             setAnchor(null);
          }, 2000);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [anchor, photoId, loading, photos.length, setAnchor]);

  const [showAdminTools, setShowAdminTools] = useState(false);
  const isMultiSelect = useIsMultiSelect();
  
  const { groupData, handleUpdateGroupData } = useGroupEditState(
    groupId || '',
    photos as unknown as Photo[],
    async () => {}
  );
  
  const { update, dissolve } = useGroupMutations();

  const handleUpdateTitle = async (newName: string) => {
    if (groupId) {
      await update.mutateAsync({ id: groupId, updates: { name: newName } });
    }
  };

  // Redirect to admin only if group is truly not found (not just loading or errored)
  useEffect(() => {
    // Only redirect if loading is finished, group is null, we have an ID, 
    // AND there isn't a transient error (like 401/500)
    if (!loading && !group && groupId && !error) {
      const timer = setTimeout(() => {
        setLocation('/admin');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [loading, group, groupId, error, setLocation]);

  if (loading || !groupId) {
    return (
      <GroupDetailLayout
        loading={true}
        error={null}
        group={undefined}
        photos={[]}
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchNextPage={() => {}}
        onRetry={() => {}}
        header={<div className="p-4 text-center text-slate-500 font-semibold bg-white border-b">{t('loading')}...</div>}
      />
    );
  }

  if (!group) {
    return (
      <GroupDetailLayout
        loading={false}
        error={error}
        group={undefined}
        photos={[]}
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchNextPage={() => {}}
        emptyTitle={t('groupNotFound') || "分组不存在或已合并"}
        emptyMessage={t('groupNotFoundDesc') || "该分组可能已被删除、解散或合并至其他分组。正在跳转回管理页面..."}
        onRetry={() => setLocation('/admin')}
        bottomPadding={isMultiSelect}
        header={<div className="p-4 text-center text-slate-500 font-semibold bg-white border-b">分组不存在</div>}
      />
    );
  }

  return (
    <GroupDetailLayout
      loading={loading}
      error={error}
      group={group}
      photos={photos}
      hasNextPage={!!hasNextPage}
      isFetchingNextPage={!!isFetchingNextPage}
      fetchNextPage={fetchNextPage || (() => {})}
      emptyTitle="分组暂无照片"
      emptyMessage="该分组目前还没有照片。"
      onRetry={() => {}}
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
              setLocation('/admin');
            }}
            update={async (updates) => { if (groupId) await update.mutateAsync({ id: groupId, updates }); }}
            t={t}
          />
        ) : null
      }
    />
  );
}
