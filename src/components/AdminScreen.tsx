import React from 'react';
import { UnifiedGallery } from '@/components/shared/UnifiedGallery';
import { useMultiSelect, useAuth, useTasks, useSyncMutation } from '@/hooks';
import { usePhotoGallery } from '@/features/photos/usePhotoGallery';
import { useGalleryStore, useShallow } from '@/store';
import { translations } from '@/lib/translations';
import { AdminToolbar } from '@/pages/AdminView/AdminToolbar';
import { AdminEmptyState } from '@/pages/AdminView/AdminEmptyState';

export const AdminScreen: React.FC = React.memo(() => {
  const { user, loginWithGoogle } = useAuth();
  const { photos, isLoading: isLoadingPhotos } = usePhotoGallery();
  const { tasks } = useTasks();
  const { mutateAsync: syncMut } = useSyncMutation();
  const isSyncing = tasks.some(t => t.name.includes('同步') && t.status === 'running');
  const onRefresh = () => syncMut('pull');
  const cloudCount = 0;

  const { lang, isStaffMode, setActiveScreen, viewMode, setViewMode } = useGalleryStore(useShallow(s => ({
    lang: s.appLang,
    isStaffMode: s.isStaffMode,
    setActiveScreen: s.setActiveScreen,
    viewMode: s.viewMode,
    setViewMode: s.setViewMode
  })));
  
  const onManageClick = () => setActiveScreen('manage');

  const { selectedIds, clear } = useMultiSelect();
  const isEffectiveStaffMode = isStaffMode && !user;
  
  const t = translations[lang as keyof typeof translations] || translations.en;
  
  const onBatchAiAnalyze = (photos: any[]) => {}; // To be refactored to use task execution

  const variant = user ? 'full-management' : 'staff-workspace';
  
  return (
    <div className="flex flex-col absolute inset-0 bg-brand-bg overflow-hidden" id="main-admin-screen">
            <AdminToolbar 
              variant={variant}
              photos={photos}
              onManageClick={onManageClick}
              loginWithGoogle={loginWithGoogle}
              onRefresh={onRefresh}
              cloudCount={cloudCount}
              isSyncing={isSyncing}
              adminPreviewMode={viewMode as any}
              setAdminPreviewMode={setViewMode as any}
              handleBatchAiIdentifyTrigger={async () => {
              if (selectedIds.length > 0) {
                // Same logic as floating buttons
                const { supabase } = await import('@/lib/supabase');
                const { mapSupabasePhoto } = await import('@/services/photos');
                const { data } = await supabase
                  .from('furniture_items')
                  .select('id, name, item_code, manual_code, model_number, image_hash, category_id, manufacturer_id, sub_category, description, image_url, thumb_url, thumb_hash, created_at, updated_at, group_id, is_group_cover, is_hidden, is_pinned, is_analyzing, user_id, price, description_translations, dimensions, group_order, photo_tags(tag_id)')
                  .or(`id.in.(${selectedIds.join(',')}),group_id.in.(${selectedIds.join(',')})`);
                
                const dbPhotos = (data || []).map(mapSupabasePhoto);
                const finalPhotos = dbPhotos.length > 0 ? dbPhotos : photos.filter(p => 
                  selectedIds.includes(p.id) || (p.group_id && selectedIds.includes(p.group_id))
                );
                onBatchAiAnalyze(finalPhotos);
              } else {
                onBatchAiAnalyze(photos);
              }
        }}
      />
      <div className="flex-1 min-h-0 relative">
        {photos.length === 0 && !isSyncing && !isLoadingPhotos ? (
          <AdminEmptyState t={t} />
        ) : (
          <UnifiedGallery 
            variant={variant}
            handleBatchAiIdentifyTrigger={async () => {
               onBatchAiAnalyze(photos);
            }}
          />
        )}
      </div>
    </div>
  );
});
