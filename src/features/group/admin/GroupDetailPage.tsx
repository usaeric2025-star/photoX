import React, { useState } from 'react';
import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import { useGroupData } from '../shared/hooks/useGroupData';
import { PhotoListItem } from '@/types/api';
import { Photo, Group, ProductGroup, Dimension, Category } from '@/types';
import { AdminPhotoCard } from '@/components/photo/AdminPhotoCard';
import { YarlLightbox } from '@/features/lightbox/YarlLightbox';
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
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { Button } from '@/components/shared/Button';

function AdminPhotoGrid({ photos, categories, onPhotoClick }: { photos: PhotoListItem[]; categories?: Category[]; onPhotoClick: (id: string) => void }) {
  const isMultiSelect = useUIStore(s => s.isMultiSelect);
  const { toggle } = usePhotoSelection();

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1 sm:gap-2 p-1 sm:p-2 lg:p-4 pb-20">
      {photos.map((photo) => (
        <AdminPhotoCard
          key={photo.id}
          photo={photo as any}
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

  const lightboxItems = photos.map((p) => {
    return {
      id: p.id,
      src: p.imageUrl,
      thumbnail: p.thumbnailUrl || p.imageUrl,
      title: p.name || '',
      description: p.description || '',
      category: '',
      tags: p.tags || [],
      photo: p as any,
    };
  });

  const handleBatchDelete = async (ids: string[]) => {
    // Basic implementation since original relied on full useGroupAdminLogic
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
    photos as any,
    async (_id, _data) => {}
  );
  const { update, dissolve } = useGroupMutations();
  const { deletePhoto, updatePhoto } = adminActions;
  
  const handleUpdateTitle = async (newName: string) => {
    await update.mutateAsync({ id: groupId, updates: { name: newName } });
  };
  
  const openEditDrawer = (id: string) => { setPhotoId(id); setModal('edit'); };

  if (loading) return <PageSkeleton />;
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
          <AdminPhotoGrid photos={photos} categories={categories} onPhotoClick={(id: string) => {
               setPhotoId(id);
          }} />
        </div>
        
        <YarlLightbox
          open={lightboxOpen}
          items={lightboxItems}
          currentIndex={Math.max(0, lightboxIndex)}
          onClose={() => setPhotoId(null)}
          onIndexChange={(idx: number) => {
             const photo = photos[idx];
             if (photo) setPhotoId(photo.id);
          }}
          onEdit={openEditDrawer}
          onDelete={(id) => deletePhoto.mutate(id)}
          onSetCover={(id) => updatePhoto.mutate({ id, updates: { is_group_cover: true } })}
        />

        <SelectionToolbar
          totalItems={photos?.length}
          allIds={photos?.map((p) => p.id)}
          allPhotos={photos as any}
          groupId={groupId}
        />

        {showAdminTools && (
          <GroupSettingsDialog
            showGroupSettings={showAdminTools}
            setShowGroupSettings={setShowAdminTools}
            activeGroupId={groupId}
            groupData={groupData}
            setGroupData={setGroupData}
            handleUpdateGroupData={handleUpdateGroupData}
            onUngroup={async (id) => await dissolve.mutateAsync(id)}
            update={async (updates) => { await update.mutateAsync({ id: groupId, updates }); }}
            t={(key: string) => (t as any)[key] || key}
          />
        )}

        <PhotoEditDialog />
      </div>
    </SelectionProvider>
  );
}
