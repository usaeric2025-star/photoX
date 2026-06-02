import React, { useState, useEffect } from 'react';
import { AdminGridContainer } from '@/components/photo/AdminGridContainer';
import { 
  useMultiSelect, 
  useAuth, 
  useTasks, 
  useSyncMutation, 
  useAdminMode,
  useSettings,
  useCategories,
  useTags,
  useManufacturers,
  useTaskExecutor,
  useErrorHandler
} from '@/hooks';
import { useAdminActions } from '@/features/admin/useAdminActions';
import { toast } from '@/lib/ui/toast';
import { usePhotoGallery } from '@/features/photos/usePhotoGallery';
import { useUIStore, useShallow } from '@/store/useUIStore';
import { translations } from '@/lib/translations';
import { AdminToolbar } from '@/pages/AdminPage/AdminToolbar';
import { AdminEmptyState } from '@/pages/AdminPage/AdminEmptyState';

export function AdminScreen() {
  const { user, loginWithGoogle } = useAuth();
  const { photos, isLoading: isLoadingPhotos } = usePhotoGallery();
  const { tasks } = useTasks();
  const { mutateAsync: syncMut } = useSyncMutation();
  const isSyncing = tasks.some(t => t.name.includes('同步') && t.status === 'running');
  const onRefresh = () => syncMut('pull');
  const cloudCount = 0;

  const { lang, update, viewMode } = useUIStore(useShallow(s => ({
    lang: s.appLang,
    update: s.update,
    viewMode: s.viewMode
  })));
  
  const onManageClick = () => update({ activeScreen: 'manage' });

  const { selectedIds, clear } = useMultiSelect();
  const hasAdminAccess = useAdminMode();
  const isEffectiveStaffMode = hasAdminAccess && !user;
  
  const t = translations[lang as keyof typeof translations] || translations.en;
  
  const { updatePhoto } = useAdminActions();
  const { settings } = useSettings();
  const { data: categories = [] } = useCategories();
  const { data: tags = [] } = useTags();
  const { data: manufacturers = [] } = useManufacturers();
  const { runTask } = useTaskExecutor();
  const { handleError } = useErrorHandler();

  const onBatchAiAnalyze = React.useCallback(async (targetPhotos: any[]) => {
    if (!targetPhotos || targetPhotos.length === 0) {
      toast.error("没有可识别的照片");
      return;
    }

    await runTask(`AI 批量属性识别 (${targetPhotos.length}张)`, async () => {
      const { analyzeProductPhoto } = await import("@/services/gemini");
      
      let successCount = 0;
      for (const p of targetPhotos) {
        const imageUrl = p.uri || p.image_url;
        if (!imageUrl) continue;

        try {
          const result = await analyzeProductPhoto(
            imageUrl,
            categories,
            tags,
            manufacturers,
            settings?.gemini_api_key || "",
            "google",
            settings?.custom_model || ""
          );

          if (result) {
            const updates: any = {};
            if (result.name) updates.name = result.name;
            if (result.category_id) updates.category_id = String(result.category_id);
            if (Array.isArray(result.tag_ids)) {
              updates.tag_ids = result.tag_ids.map((id: any) => String(id));
            }
            if (result.manufacturer_id) updates.manufacturer_id = String(result.manufacturer_id);
            if (result.model_number) updates.model_number = result.model_number;
            if (result.manual_code) updates.manual_code = result.manual_code;
            if (result.description) updates.description = result.description;
            if (result.price) updates.price = String(result.price);

            await updatePhoto(p.id, updates);
            successCount++;
          }
        } catch (err) {
          console.error(`Failed to analyze photo ${p.id}:`, err);
        }
      }

      toast.success(`批量识别完成: 成功识别 ${successCount}/${targetPhotos.length} 张照片`);
    });
  }, [categories, tags, manufacturers, settings, runTask, updatePhoto, handleError]);

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
    <div className="flex flex-col absolute inset-0 bg-slate-50 overflow-hidden" id="main-admin-screen">
            <AdminToolbar 
              variant={variant}
              photos={photos}
              onManageClick={onManageClick}
              loginWithGoogle={loginWithGoogle}
              onRefresh={onRefresh}
              cloudCount={cloudCount}
              isSyncing={isSyncing}
              adminPreviewMode={viewMode as any}
              setAdminPreviewMode={update as any}
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
           <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400 bg-slate-50">
             <svg className="animate-spin h-6 w-6 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
             <span className="text-xs">{lang === 'zh' ? '正在加载照片，请稍候...' : 'Loading photos, please wait...'}</span>
           </div>
         ) : photos.length === 0 && !isSyncing ? (
           <AdminEmptyState t={t} />
         ) : (
           <AdminGridContainer 
             variant={variant}
             handleBatchAiIdentifyTrigger={async () => {
                onBatchAiAnalyze(photos);
             }}
           />
         )}
       </div>
    </div>
  );
}
