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
  const onRefresh = async () => {
    try {
      await syncMut('pull');
      toast.success('同步已完成');
    } catch (e: any) {
      toast.error(`同步失败: ${e.message || '未知错误'}`);
    }
  };
  const cloudCount = 0;

  const lang = useUIStore((s) => s.appLang);
  const update = useUIStore((s) => s.update);
  
  const onManageClick = () => update({ activeScreen: 'manage' });

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

    if (!settings?.gemini_api_key) {
      toast.error("请先在‘管理后台 -> 系统配置’中配置 Gemini API 密钥再使用 AI 识别功能。");
      return;
    }

    // Buckets for categorization
    const groupedPhotosMap = new Map<string, any[]>();
    const ungroupedPhotos: any[] = [];

    for (const p of targetPhotos) {
      if (p.group_id) {
        if (!groupedPhotosMap.has(p.group_id)) {
          groupedPhotosMap.set(p.group_id, []);
        }
        groupedPhotosMap.get(p.group_id)!.push(p);
      } else {
        ungroupedPhotos.push(p);
      }
    }

    const taskTitle = groupedPhotosMap.size > 0 
      ? `AI 批量识别 (${targetPhotos.length}张, ${groupedPhotosMap.size}组)` 
      : `AI 批量识别 (${targetPhotos.length}张)`;

    await runTask(taskTitle, async () => {
      let supabase: any;
      let analyzeGroup: any;
      let analyzeProductPhoto: any;

      try {
        const supabaseMod = await import('@/lib/supabase');
        supabase = supabaseMod.supabase;
        
        const analyzeGroupMod = await import("@/services/gemini/groupAnalysis");
        analyzeGroup = analyzeGroupMod.analyzeGroup;

        const geminiMod = await import("@/services/gemini");
        analyzeProductPhoto = geminiMod.analyzeProductPhoto;
      } catch (err: any) {
        console.error("加载 AI 识别或 Supabase 模块失败:", err);
        const isDynamicImportError = 
          err.message?.includes('Failed to fetch dynamically imported module') ||
          err.name === 'TypeError' ||
          String(err).includes('dynamically imported module') ||
          String(err).includes('loading chunk');

        if (isDynamicImportError) {
          toast.error("检测到系统大版本由于更新产生了缓存割裂，正在为您自动重载页面以加载最新版本...");
          setTimeout(() => {
            window.location.reload();
          }, 1500);
          return;
        }
        throw err;
      }
      
      let successCount = 0;
      let totalPhotosToProcess = targetPhotos.length;

      // 1. Process groups first (each group separately!)
      for (const [groupId, groupPhotos] of Array.from(groupedPhotosMap.entries())) {
        try {
          // A. Group Attribute AI Analyze
          const allTagIds = Array.from(new Set(groupPhotos.flatMap(gp => gp.tag_ids || [])));
          let tagMap = new Map<string, string>();
          if (allTagIds.length > 0) {
            const { data: tagsData } = await supabase.from('tags').select('id, name').in('id', allTagIds);
            tagMap = new Map((tagsData || []).map((t: any) => [String(t.id), t.name]));
          }
          const photosForAnalysis = groupPhotos.map(gp => ({
            ...gp,
            tagNames: (gp.tag_ids || []).map((tid: any) => tagMap.get(String(tid)) || '').filter(Boolean)
          }));

          const groupAnalysis = await analyzeGroup(photosForAnalysis);
          if (groupAnalysis) {
            await supabase
              .from('groups')
              .update({
                name: groupAnalysis.name,
                description: groupAnalysis.description,
                colors: groupAnalysis.colors,
                materials: groupAnalysis.materials,
                name_translations: { zh: groupAnalysis.name },
                description_translations: { zh: groupAnalysis.description },
              })
              .eq('id', groupId);
          }
        } catch (err) {
          console.error(`[AI Group Analyze] Failed for group ${groupId}:`, err);
        }

        // B. Run individual photo-level analyze on all items of this group
        for (const p of groupPhotos) {
          const imageUrl = p.uri || p.image_url;
          if (!imageUrl) {
            toast.error(`照片 (${p.id}) 缺少图片链接`);
            continue;
          }

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
              if (result.name_en) updates.name_en = result.name_en;
              if (result.name_ms) updates.name_ms = result.name_ms;
              if (result.category_id) updates.category_id = String(result.category_id);
              if (Array.isArray(result.tag_ids)) {
                updates.tag_ids = result.tag_ids.map((id: any) => String(id));
              }
              if (result.manufacturer_id) updates.manufacturer_id = String(result.manufacturer_id);
              if (result.model_number) updates.model_number = result.model_number;
              if (result.manual_code) updates.manual_code = result.manual_code;
              if (result.description) updates.description = result.description;
              if (result.description_translations) {
                updates.description_translations = result.description_translations;
              }
              if (Array.isArray(result.dimensions)) updates.dimensions = result.dimensions;
              if (result.price) updates.price = String(result.price);

              await updatePhoto(p.id, updates);
              successCount++;
            }
          } catch (err: any) {
            console.error(`Failed to analyze photogroup item ${p.id}:`, err);
            handleError(err, `组内照片识别失败: ${p.name || '照片'} - ${err.message || ''}`);
          }
        }
      }

      // 2. Process ungrouped photos
      for (const p of ungroupedPhotos) {
        const imageUrl = p.uri || p.image_url;
        if (!imageUrl) {
          toast.error(`照片 (${p.id}) 缺少图片链接`);
          continue;
        }

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
            if (result.name_en) updates.name_en = result.name_en;
            if (result.name_ms) updates.name_ms = result.name_ms;
            if (result.category_id) updates.category_id = String(result.category_id);
            if (Array.isArray(result.tag_ids)) {
              updates.tag_ids = result.tag_ids.map((id: any) => String(id));
            }
            if (result.manufacturer_id) updates.manufacturer_id = String(result.manufacturer_id);
            if (result.model_number) updates.model_number = result.model_number;
            if (result.manual_code) updates.manual_code = result.manual_code;
            if (result.description) updates.description = result.description;
            if (result.description_translations) {
              updates.description_translations = result.description_translations;
            }
            if (Array.isArray(result.dimensions)) updates.dimensions = result.dimensions;
            if (result.price) updates.price = String(result.price);

            await updatePhoto(p.id, updates);
            successCount++;
          }
        } catch (err: any) {
          console.error(`Failed to analyze photo ${p.id}:`, err);
          handleError(err, `识别失败: ${p.name || '照片'} - ${err.message || ''}`);
        }
      }

      if (successCount === 0 && totalPhotosToProcess > 0) {
        toast.error(`全部识别失败或未更新 (${totalPhotosToProcess} 张), 请查看控制台或错误提示`);
      } else if (successCount < totalPhotosToProcess) {
        toast.warning(`部分识别失败: 成功 ${successCount}/${totalPhotosToProcess} 张`);
      } else {
        toast.success(`批量识别完成: 成功识别 ${successCount}/${totalPhotosToProcess} 张照片`);
      }
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
              handleBatchAiIdentifyTrigger={async () => {
              const selectedIds = useUIStore.getState().selectedIds;
              if (selectedIds.length > 0) {
                const selectedGroupIds = new Set<string>();
                photos.forEach(p => {
                  if (selectedIds.includes(p.id) && p.group_id) {
                    selectedGroupIds.add(p.group_id);
                  }
                });
                const groupIdsArray = Array.from(selectedGroupIds);

                let orQuery = `id.in.(${selectedIds.join(',')})`;
                if (groupIdsArray.length > 0) {
                  orQuery += `,group_id.in.(${groupIdsArray.join(',')})`;
                }

                const { supabase } = await import('@/lib/supabase');
                const { mapSupabasePhoto } = await import('@/services/photo/queries');
                const { PHOTO_DETAIL_FIELDS } = await import('@/constants/photoFields');
                const { data } = await supabase
                  .from('furniture_items')
                  .select(PHOTO_DETAIL_FIELDS)
                  .or(orQuery);
                
                const dbPhotos = (data || []).map(mapSupabasePhoto);
                const finalPhotos = dbPhotos.length > 0 ? dbPhotos : photos.filter(p => 
                  selectedIds.includes(p.id) || (p.group_id && groupIdsArray.includes(p.group_id))
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
              onBatchAiAnalyze={onBatchAiAnalyze}
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
