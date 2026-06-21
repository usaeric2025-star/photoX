import React, { useState } from 'react';
import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import { useGroupData } from '../shared/hooks/useGroupData';
import { PhotoListItem } from '@/types/api';
import { Photo, Group, ProductGroup, Dimension, Category } from '@/types';
import { AdminPhotoCard } from '@/components/photo/AdminPhotoCard';
import { useLightboxStore } from '@/store/useLightboxStore';
import { LazyPhotoLightbox } from '@/features/lightbox/LazyPhotoLightbox';
import { useFilters, useTranslation, useCategories } from '@/hooks';
import { getTranslatedCategoryName } from '@/services/category/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { useUIStore } from '@/store/useUIStore';
import { usePhotoSelection } from '@/hooks/photo/usePhotoSelection';
import { SelectionProvider, SelectionToolbar } from '@/features/selection';
import { useAdminMaintenance } from '@/hooks/admin/useAdminMaintenance';
import { useAdminBatchActions } from '@/hooks/admin/useAdminBatch';
import { translations } from '@/locales';
import { GroupSettingsDialog } from '@/components/groups/GroupSettingsDialog';
import { useGroupDraft } from '@/components/groups/useGroupDraft';
import { useGroupMutations } from '@/hooks/groups/useGroupMutations';
import { GroupHeader } from '../shared/components/GroupHeader';
import { PhotoEditDialog } from '@/features/photo-edit';
import { PhotoCardSkeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/shared/Button';

function AdminPhotoGrid({ photos, categories, onPhotoClick }: { photos: PhotoListItem[]; categories?: Category[]; onPhotoClick: (id: string) => void }) {
  const isMultiSelect = useUIStore(s => s.isMultiSelect);
  const { toggle } = usePhotoSelection();

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1 sm:gap-2 p-1 sm:p-2 lg:p-4 pb-20">
      {photos.map((photo) => (
        <AdminPhotoCard
          key={photo.id}
          photo={photo}
          onClick={() => {
            if (isMultiSelect) {
              toggle(photo.id);
            } else {
              onPhotoClick(photo.id);
            }
          }}
          hideGroupBadge={true}
          sharedCategories={categories}
        />
      ))}
    </div>
  );
}

export function AdminGroupDetailPage() {
  const routerSafe = useRouterSafe();
  const { groupId: fGroupId, photoId, setPhotoId, setModal } = useFilters();
  const groupId = (routerSafe.params as { groupId?: string }).groupId || fGroupId;
  
  const { group, photos, totalCount, loading, error } = useGroupData({ groupId, isAdmin: true });

  const { lang, uiTranslations: t } = useTranslation();
  const { data: categories = [] } = useCategories();
  const { anchor, setAnchor } = useFilters();

  // Anchoring effect
  React.useEffect(() => {
    if (anchor && photoId && !loading && photos.length > 0) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        const element = document.querySelector(`[data-photo-id="${photoId}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add a temporary highlight effect 
          element.classList.add('ring-4', 'ring-primary', 'scale-95');
          setTimeout(() => {
             element.classList.remove('ring-4', 'ring-primary', 'scale-95');
             // Clear anchor from URL so it doesn't trigger again on reload
             setAnchor(false);
          }, 2000);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [anchor, photoId, loading, photos.length]);

  const lightboxIndex = React.useMemo(() => {
    if (!photoId || anchor) return -1;
    return photos.findIndex((p) => p.id === photoId);
  }, [photoId, photos, anchor]);

  const lightboxOpen = lightboxIndex !== -1;
  const [showAdminTools, setShowAdminTools] = useState(false);
  const isMultiSelect = useUIStore((s) => s.isMultiSelect);

  const adminActions = useAdminMaintenance();
  const { handleBatchAiIdentifyTrigger } = useAdminBatchActions();

  const openLightbox = useLightboxStore((s) => s.open);
  
  const lightboxItems = photos.map((p) => {
    return {
      id: p.id,
      src: p.imageUrl,
      alt: p.name || '照片',
      title: p.name || '',
      category: '',
      metadata: {
        description: p.description || undefined,
        tags: p.tags,
      }
    };
  });

  const handleBatchDelete = async (ids: string[]) => {
    for (const id of ids) {
      await adminActions.deletePhoto.mutateAsync(id);
    }
  };

  const handleBatchHide = async (ids: string[]) => {
    await adminActions.batchUpdate.mutateAsync({
      ids,
      updates: { is_hidden: true }
    });
  };

  const { groupData, setGroupData, handleUpdateGroupData } = useGroupDraft(
    groupId,
    photos as unknown as Photo[],
    async (_id, _data) => {}
  );
  const { update, dissolve } = useGroupMutations();
  const { deletePhoto, updatePhoto } = adminActions;
  
  const handleUpdateTitle = async (newName: string) => {
    if (groupId) {
      await update.mutateAsync({ id: groupId, updates: { name: newName } });
    }
  };
  
  const openEditDrawer = (id: string) => { setPhotoId(id); setModal('edit'); };

  const handlePhotoClick = (id: string) => {
      const index = photos.findIndex(p => p.id === id);
      if (index !== -1) {
          openLightbox(lightboxItems, index);
      }
  };

  if (loading) {
    return (
      <div className="p-1 sm:p-2 lg:p-4 w-full h-full">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1 sm:gap-2">
           {Array.from({ length: 18 }).map((_, i) => (
             <PhotoCardSkeleton key={i} />
           ))}
        </div>
      </div>
    );
  }
  if (error) return <div className="p-4 text-red-500">錯誤：{error}</div>;
  if (!group) return <div className="p-4 flex flex-col justify-center items-center h-full"><div className="text-xl text-slate-500 mb-4">合組不存在或已被刪除</div><Button onClick={() => window.history.back()}>返回</Button></div>;
  
  return (
    <SelectionProvider>
      <div className="bg-slate-50 group-detail-admin flex flex-col relative w-full h-[100dvh] overflow-hidden overscroll-none text-base">
        <div className="flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
          <GroupHeader 
            group={group} 
            photoCount={totalCount} 
            isAdmin={true} 
            onEditSettings={() => setShowAdminTools(true)}
            onUpdateTitle={handleUpdateTitle}
          />
        </div>
        <div className={`flex-1 overflow-y-auto relative overscroll-y-auto overscroll-x-none bg-slate-50 transition-all duration-300 ${isMultiSelect ? 'pb-16' : ''}`}>
          <AdminPhotoGrid photos={photos} categories={categories} onPhotoClick={handlePhotoClick} />
        </div>
        
        <LazyPhotoLightbox
          open={useLightboxStore((s) => s.isOpen)}
          images={useLightboxStore((s) => s.images)}
          currentIndex={useLightboxStore((s) => s.currentIndex)}
          onOpenChange={(open) => !open && useLightboxStore.getState().close()}
          onIndexChange={(idx: number) => useLightboxStore.getState().goTo(idx)}
          onEdit={openEditDrawer}
          onDelete={(id) => deletePhoto.mutate(id)}
          onSetCover={(id) => updatePhoto.mutate({ id, updates: { is_group_cover: true } })}
        />

        <SelectionToolbar
          totalItems={photos?.length}
          allIds={photos?.map((p) => p.id)}
          allPhotos={photos as any}
          groupId={groupId || undefined}
        />

        {showAdminTools && (
          <GroupSettingsDialog
            showGroupSettings={showAdminTools}
            setShowGroupSettings={setShowAdminTools}
            activeGroupId={(groupId as any) || null}
            groupData={groupData}
            setGroupData={setGroupData}
            handleUpdateGroupData={handleUpdateGroupData}
            onUngroup={async (id) => await dissolve.mutateAsync(id)}
            update={async (updates) => { if (groupId) await update.mutateAsync({ id: groupId, updates }); }}
            t={(key: string) => (t as any)[key] || key}
          />
        )}

        <PhotoEditDialog />
      </div>
    </SelectionProvider>
  );
}
