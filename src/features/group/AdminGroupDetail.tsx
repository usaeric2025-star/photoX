import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppRouter } from '#lib/router/index.js';
import { useGroupData } from '#src/hooks/index.js';
import { PhotoListItem } from '#src/types/api.js';
import { Photo } from '#src/types/index.js';
import { useLightbox, photosToLightboxSlides } from '#lib/lightbox/index.js';
import { useFilters, useTranslation } from '#src/hooks/index.js';
import { useIsMultiSelect } from '#src/hooks/index.js';
import { useAdminMaintenance } from '#src/hooks/admin/useAdminMaintenance.js';
import { GroupSettingsDialog } from '#src/components/groups/GroupSettingsDialog.js';
import { useGroupDraft } from '#src/hooks/index.js';
import { useGroupMutations } from '#src/hooks/group/index.js';
import { AdminGroupHeader } from './components/AdminGroupHeader.js';
import { Button } from '#src/components/shared/Button.js';
import { Icon } from '#src/components/ui/Icon.js';
import { toast } from 'sonner';
import { ErrorBoundary } from '#src/components/shared/ErrorBoundary.js';
import { PhotoWallGrid } from '#src/features/photo-wall/components/PhotoWallGrid.js';
import { photoWallStore } from '#src/features/photo-wall/signal.js';
import { DataFallback } from '#src/components/ui/DataFallback.js';

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

  const { uiTranslations: t } = useTranslation();
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

  const adminActions = useAdminMaintenance();
  
  const { groupData, setGroupData, handleUpdateGroupData } = useGroupDraft(
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

  const loadingSkeleton = (
    <div className="p-1 sm:p-2 lg:p-4 w-full h-full bg-slate-50">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1 sm:gap-2">
         {Array.from({ length: 18 }).map((_, i) => (
           <div key={i} className="aspect-square w-full bg-surface-soft rounded-xl border border-border-soft animate-shimmer" />
         ))}
      </div>
    </div>
  );

  return (
    <DataFallback
      loading={loading}
      error={error}
      isEmpty={!loading && !error && !group}
      emptyTitle="分組不存在或已合併"
      emptyMessage="該分組可能已被刪除、解散或合併至其他分組。正在跳轉回管理頁面..."
      onRetry={() => navigate.admin()}
      loadingSkeleton={loadingSkeleton}
    >
      {group && (
        <div className="bg-slate-50 group-detail-admin flex flex-col relative w-full h-[100dvh] overflow-hidden overscroll-none text-base">
      <div className="flex-shrink-0 bg-white border-b border-slate-100 shadow-sm">
        <AdminGroupHeader 
          group={group} 
          photoCount={totalCount} 
          onEditSettings={() => setShowAdminTools(true)}
          onUpdateTitle={handleUpdateTitle}
        />
      </div>
      <div className={`flex-1 bg-slate-50 transition-all duration-300 ${isMultiSelect ? 'pb-16' : ''} overflow-y-auto p-1 sm:p-2 relative`}>
        <ErrorBoundary>
          <PhotoWallGrid 
          photos={photos} 
          hasMore={!!hasNextPage} 
          isLoading={loading}
          isLoadingMore={!!isFetchingNextPage} 
          loadMore={fetchNextPage || (() => {})} 
          hideGroupBadge={true}
          isGroupDetail={true}
        />
        </ErrorBoundary>
      </div>

      {showAdminTools && (
        <GroupSettingsDialog
          showGroupSettings={showAdminTools}
          setShowGroupSettings={setShowAdminTools}
          activeGroupId={groupId || null}
          groupData={groupData}
          setGroupData={setGroupData}
          handleUpdateGroupData={handleUpdateGroupData}
          onUngroup={async (id) => {
            await dissolve.mutateAsync(id);
            navigate.admin();
          }}
          update={async (updates) => { if (groupId) await update.mutateAsync({ id: groupId, updates }); }}
          t={(key: string) => String((t as Record<string, unknown>)[key] || key)}
        />
      )}
    </div>
      )}
    </DataFallback>
  );
}
