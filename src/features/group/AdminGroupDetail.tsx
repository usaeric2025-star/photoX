import React, { useState } from 'react';
import { useAppRouter } from '@/lib/router';
import { useGroupData } from './hooks/useGroupData';
import { PhotoListItem } from '@/types/api';
import { Photo, Group, ProductGroup, Dimension, Category } from '@/types';
import { PhotoGridContent } from '@/components/photo/PhotoGridContent';
import { useLightbox, photosToLightboxSlides } from '@/lib/lightbox';
import { useFilters, useTranslation, useCategories, usePermission } from '@/hooks';
import { getTranslatedCategoryName } from '@/services/category/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { useSignal, uiStore, useUI, currentEditingPhoto, gridColumns as gridColumnsSignal } from '@/lib/store';
// import { batchModeSignal } from '@/lib/store'; // 移除此行
import { useIsMultiSelect, useSelectionActions } from '@/features/selection';
import { useAdminMaintenance } from '@/hooks/admin/useAdminMaintenance';
import { useAdminBatchActions } from '@/hooks/admin/useAdminBatch';
import { translations } from '@/locales';
import { GroupSettingsDialog } from '@/components/groups/GroupSettingsDialog';
import { useGroupDraft } from '@/components/groups/useGroupDraft';
import { useGroupMutations } from '@/hooks/group';
import { GroupHeader } from './components/GroupHeader';
import { Button } from '@/components/shared/Button';
import { useColumns } from '@/hooks';
import { FilterBar } from '@/features/filters';

function AdminPhotoGrid({ photos, categories, onPhotoClick }: { photos: PhotoListItem[]; categories?: Category[]; onPhotoClick: (id: string, index: number, e?: React.MouseEvent) => void }) {
  const isMultiSelect = useIsMultiSelect();
  const { toggleSelect } = useSelectionActions();
  const columns = useSignal(gridColumnsSignal) as number;

  return (
    <PhotoGridContent 
      photos={photos}
      dataVersion="1" // Groups usually load all at once, versioning not critical here
      isPending={false}
      isFetching={false}
      isFetchingNextPage={false}
      hasNextPage={false}
      fetchNextPage={() => {}}
      columns={columns}
      mode="admin"
      onPhotoClick={(id, index, e) => {
        if (isMultiSelect) {
          toggleSelect(id);
        } else {
          onPhotoClick(id, index, e);
        }
      }}
    />
  );
}

export function AdminGroupDetailPage() {
  const { params } = useAppRouter();
  const { groupId: fGroupId, photoId, setPhotoId, setModal } = useFilters();
  const groupId = (params as { id?: string }).id || fGroupId;
  
  const { group, photos, totalCount, loading, error } = useGroupData({ groupId, isAdmin: true });

  const { lang, uiTranslations: t } = useTranslation();
  const { categories = [] } = useCategories();
  const { anchor, setAnchor } = useFilters();

  const { open: openLightbox } = useLightbox();
  const lightboxItems = React.useMemo(() => photosToLightboxSlides(photos), [photos]);

  // Anchoring effect
  React.useEffect(() => {
    if (anchor && photoId && !loading && (photos || []).length > 0) {
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
  }, [anchor, photoId, loading, (photos || []).length]);

  const [showAdminTools, setShowAdminTools] = useState(false);
  const isMultiSelect = useIsMultiSelect();

  const adminActions = useAdminMaintenance();
  
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
  
  const openEditDrawer = (id: string) => { 
    const p = photos.find(p => p.id === id);
    if (p) {
      currentEditingPhoto.set(p as any);
      setModal('edit');
      setPhotoId(p.id);
    }
  };

  const handlePhotoClick = (id: string, index: number) => {
      openLightbox(lightboxItems, index);
  };

  if (loading) {
    return (
      <div className="p-1 sm:p-2 lg:p-4 w-full h-full">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1 sm:gap-2">
           {Array.from({ length: 18 }).map((_, i) => (
             <div key={i} className="aspect-square w-full bg-surface-soft rounded-xl border border-border-soft animate-shimmer" />
           ))}
        </div>
      </div>
    );
  }
  if (error) return <div className="p-4 text-red-500">錯誤：{error}</div>;
  if (!group) return <div className="p-4 flex flex-col justify-center items-center h-full"><div className="text-xl text-slate-500 mb-4">合組不存在或已被刪除</div><Button onClick={() => window.history.back()}>返回</Button></div>;
  
  return (
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
      <div className={`flex-1 relative bg-slate-50 transition-all duration-300 ${isMultiSelect ? 'pb-16' : ''}`}>
        <AdminPhotoGrid photos={photos} categories={categories} onPhotoClick={handlePhotoClick} />
      </div>

      {showAdminTools && (
        <GroupSettingsDialog
          showGroupSettings={showAdminTools}
          setShowGroupSettings={setShowAdminTools}
          activeGroupId={groupId || null}
          groupData={groupData}
          setGroupData={setGroupData}
          handleUpdateGroupData={handleUpdateGroupData}
          onUngroup={async (id) => await dissolve.mutateAsync(id)}
          update={async (updates) => { if (groupId) await update.mutateAsync({ id: groupId, updates }); }}
          t={(key: string) => String((t as Record<string, unknown>)[key] || key)}
        />
      )}
    </div>
  );
}
