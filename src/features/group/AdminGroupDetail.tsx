import React, { useState } from 'react';
import { motion } from 'lite-sleek';
import { useAppRouter } from '#lib/router/index.js';
import { useGroupData } from './hooks/useGroupData.js';
import { PhotoListItem } from '#src/types/api.js';
import { Photo, Group, ProductGroup, Dimension, Category } from '#src/types/index.js';
import { PhotoGridContent } from '#src/components/photo/PhotoGridContent.js';
import { AdminPhotoCard } from '#src/components/photo/AdminPhotoCard.js';
import { useLightbox, photosToLightboxSlides } from '#lib/lightbox/index.js';
import { useFilters, useTranslation, useCategories, usePermission } from '#src/hooks/index.js';
import { getTranslatedCategoryName } from '#src/services/category/utils.js';
import { PageHeader } from '#src/components/ui/PageHeader.js';
import { useSignal, uiStore, useUI, currentEditingPhoto, gridColumns as gridColumnsSignal } from '#lib/store/index.js';
// import { batchModeSignal } from '#lib/store/index.js'; // 移除此行
import { useIsMultiSelect, useSelectionActions } from '#src/features/selection/index.js';
import { useAdminMaintenance } from '#src/hooks/admin/useAdminMaintenance.js';
import { useAdminBatchActions } from '#src/hooks/admin/useAdminBatch.js';
import { translations } from '#src/locales/index.js';
import { GroupSettingsDialog } from '#src/components/groups/GroupSettingsDialog.js';
import { useGroupDraft } from '#src/components/groups/useGroupDraft.js';
import { useGroupMutations } from '#src/hooks/group/index.js';
import { AdminGroupHeader } from './components/AdminGroupHeader.js';
import { Button } from '#src/components/shared/Button.js';
import { useColumns } from '#src/hooks/index.js';
import { FilterBar } from '#src/features/filters/index.js';

function AdminPhotoGrid({ photos, categories, onPhotoClick }: { photos: PhotoListItem[]; categories?: Category[]; onPhotoClick: (id: string, index: number, e?: React.MouseEvent) => void }) {
  const isMultiSelect = useIsMultiSelect();
  const { toggleSelect } = useSelectionActions();
  const columns = useSignal(gridColumnsSignal) as number;
  const { can } = usePermission();
  const canPinGlobal = can('photo:toggle-pinned');

  const renderItem = React.useCallback((photo: PhotoListItem, index: number) => {
    return (
      <motion.div
        initial={{ opacity: 0, transform: 'translateY(10px)' }}
        animate={{ opacity: 1, transform: 'translateY(0)' }}
        transition="all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
        className="w-full h-full p-[1px]"
      >
        <AdminPhotoCard 
          photo={photo} 
          onClick={(e: any) => {
            if (isMultiSelect) {
              toggleSelect(photo.id);
            } else {
              onPhotoClick(photo.id, index, e);
            }
          }} 
          showGroupsCollapsed={false}
          hasSearchQuery={false}
          canPinGlobal={canPinGlobal}
        />
      </motion.div>
    );
  }, [isMultiSelect, toggleSelect, onPhotoClick, canPinGlobal]);

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
      renderItem={renderItem}
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
  if (error) return <div className="p-4 text-red-500">{t.errorPrefix}{error}</div>;
  if (!group) return <div className="p-4 flex flex-col justify-center items-center h-full"><div className="text-xl text-slate-500 mb-4">{t.groupNotFound}</div><Button onClick={() => window.history.back()}>{t.goBack}</Button></div>;
  
  return (
    <div className="bg-slate-50 group-detail-admin flex flex-col relative w-full h-[100dvh] overflow-hidden overscroll-none text-base">
      <div className="flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <AdminGroupHeader 
          group={group} 
          photoCount={totalCount} 
          onEditSettings={() => setShowAdminTools(true)}
          onUpdateTitle={handleUpdateTitle}
        />
      </div>
      <div className={`flex-1 relative bg-slate-50 transition-all duration-300 ${isMultiSelect ? 'pb-16' : ''}`}>
        <div className="absolute inset-0">
          <AdminPhotoGrid photos={photos} categories={categories} onPhotoClick={handlePhotoClick} />
        </div>
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
