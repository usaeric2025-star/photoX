import React, { useState } from 'react';
import { useAppRouter } from '@/lib/router';
import { useGroupData } from '../hooks/useGroupData';
import { PhotoListItem } from '@/types/api';
import { Photo, Group, ProductGroup, Dimension, Category } from '@/types';
import { AdminPhotoCard } from '@/components/photo/AdminPhotoCard';
import { useLightbox, photosToLightboxSlides } from '@/lib/lightbox';
import { useFilters, useTranslation, useCategories } from '@/hooks';
import { getTranslatedCategoryName } from '@/services/category/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { useUI, useSignal, uiStore } from '@/lib/store';
import { batchModeSignal } from '@/lib/store';
import { usePhotoSelection } from '@/hooks/photo/usePhotoSelection';
import { SelectionProvider, SelectionToolbar } from '@/features/selection';
import { useAdminMaintenance } from '@/hooks/admin/useAdminMaintenance';
import { useAdminBatchActions } from '@/hooks/admin/useAdminBatch';
import { translations } from '@/locales';
import { GroupSettingsDialog } from '@/components/groups/GroupSettingsDialog';
import { useGroupDraft } from '@/components/groups/useGroupDraft';
import { useGroupMutations } from '@/hooks/groups/useGroupMutations';
import { GroupHeader } from '../components/GroupHeader';
import { Button } from '@/components/shared/Button';
import { useColumns } from '@/hooks';
import { FilterBar } from '@/features/filter/FilterBar';

function AdminPhotoGrid({ photos, categories, onPhotoClick }: { photos: PhotoListItem[]; categories?: Category[]; onPhotoClick: (id: string, index: number) => void }) {
  const isMultiSelect = useSignal(batchModeSignal);
  const { toggle } = usePhotoSelection();
  const { columns } = useColumns();

  const gridClass = "grid-cols-3";

  return (
    <div className={`grid ${gridClass} gap-1 sm:gap-2 p-1 sm:p-2 lg:p-4 pb-20`}>
      {photos.map((photo, index) => (
        <AdminPhotoCard
          key={photo.id}
          photo={photo}
          onClick={() => {
            if (isMultiSelect) {
              toggle(photo.id);
            } else {
              onPhotoClick(photo.id, index);
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
  const { params } = useAppRouter();
  const { groupId: fGroupId, photoId, setPhotoId, setModal } = useFilters();
  const groupId = (params as { id?: string }).id || fGroupId;
  
  const { group, photos, totalCount, loading, error } = useGroupData({ groupId, isAdmin: true });

  const { lang, uiTranslations: t } = useTranslation();
  const { data: categories = [] } = useCategories();
  const { anchor, setAnchor } = useFilters();

  const openLightbox = useUI(s => s.openLightbox);
  const lightboxItems = React.useMemo(() => photosToLightboxSlides(photos), [photos]);

  React.useEffect(() => {
     if (photoId && (photos || []).length > 0) {
        const index = (photos || []).findIndex(p => p.id === photoId);
        if (index !== -1) {
           const { lightboxIsOpen, lightboxCurrentIndex } = uiStore.getState();
           if (!lightboxIsOpen || (photos || [])[lightboxCurrentIndex]?.id !== photoId) {
              openLightbox(lightboxItems, index);
           }
        }
     }
  }, [photos, photoId, openLightbox, lightboxItems]);

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
  const isMultiSelect = useSignal(batchModeSignal);

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
  
  const openEditDrawer = (id: string) => { setPhotoId(id); setModal('edit'); };

  const handlePhotoClick = (id: string, index: number) => {
      openLightbox(lightboxItems, index);
      setPhotoId(id);
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
        
        <SelectionToolbar
          totalItems={(photos || []).length}
          allIds={(photos || []).map((p) => p.id)}
          allPhotos={photos || []}
          groupId={groupId || undefined}
        />

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
    </SelectionProvider>
  );
}
