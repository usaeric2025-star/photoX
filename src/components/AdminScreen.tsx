import React, { useState, useEffect } from 'react';
import { AdminGallery } from '@/components/photo/AdminGallery';
import { useMultiSelect, useAuth, useTasks, useSyncMutation, useAdminMode } from '@/hooks';
import { usePhotoGallery } from '@/features/photos/usePhotoGallery';
import { useGalleryStore, useShallow } from '@/store/galleryStore';
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

  const { lang, setActiveScreen, viewMode, setViewMode } = useGalleryStore(useShallow(s => ({
    lang: s.appLang,
    setActiveScreen: s.setActiveScreen,
    viewMode: s.viewMode,
    setViewMode: s.setViewMode
  })));
  
  const onManageClick = () => setActiveScreen('manage');

  const { selectedIds, clear } = useMultiSelect();
  const hasAdminAccess = useAdminMode();
  const isEffectiveStaffMode = hasAdminAccess && !user;
  
  const t = translations[lang as keyof typeof translations] || translations.en;
  
  const onBatchAiAnalyze = (photos: any[]) => {}; // To be refactored to use task execution

  const variant = user ? 'full-management' : 'staff-workspace';

  const [forceShow, setForceShow] = useState(false);

  useEffect(() => {
    if (!isLoadingPhotos) return;
    const timer = setTimeout(() => {
      console.warn('⚠️ [AdminScreen] Photos loading timed out, forcing view display');
      setForceShow(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [isLoadingPhotos]);

  const shouldShowContent = !isLoadingPhotos || forceShow;
  
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
                const { mapSupabasePhoto } = await import('@/services/photo/queries');
                const { PHOTO_DETAIL_FIELDS } = await import('@/constants/photoFields');
                const { data } = await supabase
                  .from('furniture_items')
                  .select(PHOTO_DETAIL_FIELDS)
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
         {!shouldShowContent ? (
           <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400 bg-brand-bg">
             <svg className="animate-spin h-6 w-6 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
             <span className="text-xs">{lang === 'zh' ? '正在加载照片，请稍候...' : 'Loading photos, please wait...'}</span>
           </div>
         ) : photos.length === 0 && !isSyncing ? (
           <AdminEmptyState t={t} />
         ) : (
           <AdminGallery 
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
