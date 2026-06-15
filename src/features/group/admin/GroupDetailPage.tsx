import React, { useState } from 'react';
import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import { useGroupData } from '../shared/hooks/useGroupData';
import { Group, ProductGroup, Dimension } from '@/types';
import { PhotoCard } from '@/components/photo/PhotoCard';
import { Lightbox } from '@/components/lightbox/Lightbox';
import { useFilters } from '@/hooks';
import { PageHeader } from '@/components/ui/PageHeader';
import { useUIStore } from '@/store/useUIStore';
import { usePhotoSelection } from '@/hooks/photo/usePhotoSelection';
import { SelectionToolbar } from '@/components/shared/SelectionToolbar';
import { useAdminMaintenance } from '@/hooks/admin/useAdminMaintenance';
import { useAdminBatchActions } from '@/hooks/admin/useAdminBatch';
import { translations } from '@/locales';
import { GroupSettingsModal } from '@/components/groups/GroupSettingsModal';
import { useGroupDraft } from '@/components/groups/useGroupDraft';
import { useGroupMutations } from '@/hooks/groups/useGroupMutations';
import { GroupHeader } from '../shared/components/GroupHeader';

function AdminPhotoGrid({ photos, onPhotoClick }: { photos: any[]; onPhotoClick: (id: string) => void }) {
  const selectedIds = useUIStore(s => s.selectedIds);
  const isMultiSelect = useUIStore(s => s.isMultiSelect);
  const { toggle, enable } = usePhotoSelection();

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1 sm:gap-2 p-1 sm:p-2 lg:p-4 pb-20">
      {photos.map((photo, index) => (
        <PhotoCard
          key={photo.id}
          photo={photo}
          index={index}
          onClick={() => {
            if (isMultiSelect) {
              toggle(photo.id);
            } else {
              onPhotoClick(photo.id);
            }
          }}
          selected={selectedIds.includes(photo.id)}
          hideGroupBadge={true}
        />
      ))}
    </div>
  );
}

export function AdminGroupDetailPage() {
  const routerSafe = useRouterSafe();
  const { groupId: fGroupId } = useFilters();
  const groupId = (routerSafe.params as any).groupId || fGroupId;
  
  const { group, photos, totalCount, loading, error } = useGroupData({ groupId, isAdmin: true });
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showAdminTools, setShowAdminTools] = useState(false);
  const isMultiSelect = useUIStore((s) => s.isMultiSelect);
  const lang = useUIStore(s => s.appLang);
  const t = translations[lang as keyof typeof translations] || translations.en;

  const adminActions = useAdminMaintenance();
  const { handleBatchAiIdentifyTrigger } = useAdminBatchActions();

  const handleBatchDelete = async (ids: string[]) => {
    // Basic implementation since original relied on full useGroupAdminLogic
    for (const id of ids) {
      await adminActions.deletePhoto(id);
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
    photos as any[],
    async (id, data) => {}
  );
  const { update, dissolve } = useGroupMutations();
  
  const handleUpdateTitle = async (newName: string) => {
    await update.mutateAsync({ id: groupId, updates: { name: newName } });
  };

  if (loading) return <div className="p-8 text-center text-slate-500">載入中...</div>;
  if (error) return <div className="p-4 text-red-500">錯誤：{error}</div>;
  if (!group) return <div className="p-4">合組不存在</div>;
  
  return (
    <div className="min-h-screen bg-slate-50 group-detail-admin flex flex-col relative w-full h-[100dvh] overflow-hidden overscroll-none">
      <div className="flex-shrink-0 z-10 sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <GroupHeader 
          group={group} 
          photoCount={totalCount || group.member_count} 
          isAdmin={true} 
          onEditSettings={() => setShowAdminTools(true)}
          onUpdateTitle={handleUpdateTitle}
        />
      </div>
      <div className="flex-1 overflow-y-auto relative overscroll-y-auto overscroll-x-none bg-slate-50">
        <AdminPhotoGrid photos={photos} onPhotoClick={setSelectedPhoto} />
        <Lightbox
          mode="admin"
          open={!!selectedPhoto}
          items={photos.map((p: any) => ({
            id: p.id,
            src: p.image_url || '',
            thumbnail: p.thumbnail_sm_url || p.image_url,
            title: (p.name as any)?.zh || String(p.name || ''),
          }))}
          initialIndex={Math.max(0, photos.findIndex((p: any) => p.id === selectedPhoto))}
          onClose={() => setSelectedPhoto(null)}
        />
      </div>

      {isMultiSelect && (
        <SelectionToolbar
         onDelete={handleBatchDelete}
         onHide={handleBatchHide}
         onAIIdentify={handleBatchAiIdentifyTrigger}
        />
      )}

      {showAdminTools && (
        <GroupSettingsModal
          showGroupSettings={showAdminTools}
          setShowGroupSettings={setShowAdminTools}
          activeGroupId={groupId}
          groupData={groupData}
          setGroupData={setGroupData}
          handleUpdateGroupData={handleUpdateGroupData}
          onUngroup={async (id) => await dissolve.mutateAsync(id)}
          update={update}
          t={t}
        />
      )}
    </div>
  );
}
