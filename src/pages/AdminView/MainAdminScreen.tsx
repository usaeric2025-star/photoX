import React from 'react';
import { AdminFloatingButtons } from '@/components/admin/AdminFloatingButtons';
import { Photo, Category, Tag, User, AppSettings } from '@/types';
import { AdminToolbar } from './AdminToolbar';
import { AdminGallery } from '@/components/admin/AdminGallery';
import { AdminEmptyState } from './AdminEmptyState';

import { useAdmin } from '@/contexts/AdminContext';
import { useMultiSelect } from '@/hooks';
import { usePhotoActions } from '@/contexts/PhotoActionsContext';
import { useGalleryStore, useShallow } from '@/store';
import { translations } from '@/lib/translations';

export const MainAdminScreen: React.FC = React.memo(() => {
  const logic = useAdmin();
  const {
    user, photos, onRefresh, cloudCount,
    isSyncing, loginWithGoogle,
    isLoadingPhotos,
    handleManageClick: onManageClick,
    handleImport: onImport,
  } = logic;

  const { selectedIds, clear } = useMultiSelect();
  const { lang, isStaffMode } = useGalleryStore(useShallow(s => ({
    lang: s.appLang,
    isStaffMode: s.isStaffMode
  })));
  
  const isEffectiveStaffMode = isStaffMode && !user;
  
  const t = translations[lang] || translations.zh;
  
  const {
    onBatchAiAnalyze, onGroupPhotos, onBatchEdit, 
    onDeletePhoto
  } = usePhotoActions();

  return (
    <div className="flex flex-col absolute inset-0 bg-brand-bg overflow-hidden" id="main-admin-screen">
      <AdminToolbar 
        photos={photos}
        onManageClick={onManageClick}
        loginWithGoogle={loginWithGoogle}
        onRefresh={onRefresh}
        cloudCount={cloudCount}
        isSyncing={isSyncing}
        lang={lang}
        adminPreviewMode={logic.adminPreviewMode}
        setAdminPreviewMode={logic.setAdminPreviewMode}
        handleBatchAiIdentifyTrigger={async () => {
            if (onBatchAiAnalyze) {
              if (selectedIds.length > 0) {
                // Same logic as floating buttons
                const { supabase } = await import('@/lib/supabase');
                const { mapSupabasePhoto } = await import('@/services/photoService');
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
            }
        }}
      />
      <div className="flex-1 min-h-0 relative">
        {photos.length === 0 && !isSyncing && !isLoadingPhotos ? (
          <AdminEmptyState t={t} />
        ) : (
          <AdminGallery 
            isRefreshing={isSyncing || isLoadingPhotos}
            onRefresh={onRefresh}
            isStaffMode={isEffectiveStaffMode}
          />
        )}
        <AdminFloatingButtons 
          photos={photos}
          onAdd={onImport}
          onClearSelection={clear}
          onBatchAiIdentify={async () => {
              if (onBatchAiAnalyze && selectedIds.length > 0) {
                  const { supabase } = await import('@/lib/supabase');
                  const { mapSupabasePhoto } = await import('@/services/photoService');
                  const { data } = await supabase
                    .from('furniture_items')
                    .select('id, name, item_code, manual_code, model_number, image_hash, category_id, manufacturer_id, sub_category, description, image_url, thumb_url, thumb_hash, created_at, updated_at, group_id, is_group_cover, is_hidden, is_pinned, is_analyzing, user_id, price, description_translations, dimensions, group_order, photo_tags(tag_id)')
                    .or(`id.in.(${selectedIds.join(',')}),group_id.in.(${selectedIds.join(',')})`);
                  
                  const selectedPhotos = (data || []).map(mapSupabasePhoto);
                  // fallback to memory if DB query somehow failed
                  const finalPhotos = selectedPhotos.length > 0 ? selectedPhotos : photos.filter(p => 
                    selectedIds.includes(p.id) || (p.group_id && selectedIds.includes(p.group_id))
                  );
                  onBatchAiAnalyze(finalPhotos);
              }
          }}
          onBatchEdit={() => {
              if (onBatchEdit) onBatchEdit(selectedIds);
          }}
          onGroup={() => {
              if (onGroupPhotos) onGroupPhotos(selectedIds);
          }}
          onDelete={() => {
              if (onDeletePhoto) {
                 onDeletePhoto(selectedIds);
              }
          }}
          onToggleVisibility={() => {
              if (selectedIds.length > 0) {
                logic.handleBatchToggleHidden(selectedIds);
              }
          }}
        />
      </div>
    </div>
  );
});
