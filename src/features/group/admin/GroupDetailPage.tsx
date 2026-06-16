import React, { useState } from 'react';
import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import { useGroupData } from '../shared/hooks/useGroupData';
import { Photo, Group, ProductGroup, Dimension } from '@/types';
import { AdminPhotoCard } from '@/components/photo/AdminPhotoCard';
import { YarlLightbox } from '@/components/lightbox/YarlLightbox';
import { useFilters, useTranslation, useCategories } from '@/hooks';
import { getTranslatedCategoryName } from '@/services/category/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { useUIStore } from '@/store/useUIStore';
import { usePhotoSelection } from '@/hooks/photo/usePhotoSelection';
import { SelectionProvider, SelectionToolbar } from '@/features/selection';
import { useAdminMaintenance } from '@/hooks/admin/useAdminMaintenance';
import { useAdminBatchActions } from '@/hooks/admin/useAdminBatch';
import { translations } from '@/locales';
import { GroupSettingsModal } from '@/components/groups/GroupSettingsModal';
import { useGroupDraft } from '@/components/groups/useGroupDraft';
import { useGroupMutations } from '@/hooks/groups/useGroupMutations';
import { GroupHeader } from '../shared/components/GroupHeader';
import { PhotoEditModal } from '@/components/admin/PhotoEditModal';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { Button } from '@/components/shared/Button';

function AdminPhotoGrid({ photos, onPhotoClick }: { photos: Photo[]; onPhotoClick: (id: string) => void }) {
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

  const lightboxIndex = React.useMemo(() => {
    if (!photoId) return -1;
    return photos.findIndex((p: Photo) => p.id === photoId);
  }, [photoId, photos]);

  const lightboxOpen = lightboxIndex !== -1;
  const [showAdminTools, setShowAdminTools] = useState(false);
  const isMultiSelect = useUIStore((s) => s.isMultiSelect);
  
  const { lang, uiTranslations: t } = useTranslation();
  const { data: categories = [] } = useCategories();

  const adminActions = useAdminMaintenance();
  const { handleBatchAiIdentifyTrigger } = useAdminBatchActions();

  const lightboxItems = photos.map((p: Photo) => {
    const catName = p.category_id ? getTranslatedCategoryName(String(p.category_id), categories, lang, t) : '';
    return {
      id: p.id,
      src: p.image_url,
      thumbnail: p.thumbnail_sm_url || p.image_url,
      title: p.name?.[lang as 'zh'] || p.item_code || '',
      description: p.description?.[lang as 'zh'] || '',
      category: catName,
      tags: p.tags?.map((tag) => tag.name) || [],
      photo: p,
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
    photos,
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
      <div className="min-h-screen bg-slate-50 group-detail-admin flex flex-col relative w-full h-[100dvh] overflow-hidden overscroll-none text-base">
        <div className="flex-shrink-0 z-10 sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
          <GroupHeader 
            group={group} 
            photoCount={totalCount} 
            isAdmin={true} 
            onEditSettings={() => setShowAdminTools(true)}
            onUpdateTitle={handleUpdateTitle}
          />
        </div>
        <div className="flex-1 overflow-y-auto relative overscroll-y-auto overscroll-x-none bg-slate-50">
          <AdminPhotoGrid photos={photos} onPhotoClick={(id: string) => {
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
          allIds={photos?.map((p: Photo) => p.id)}
          className="px-6 py-2 bg-white border-t border-gray-100 shadow-lg z-50 fixed bottom-0 inset-x-0"
        />

        {showAdminTools && (
          <GroupSettingsModal
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

        <PhotoEditModal />
      </div>
    </SelectionProvider>
  );
}
