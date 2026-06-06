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
import { toast } from 'sonner';
import { usePhotoGallery } from '@/features/photos/usePhotoGallery';
import { useUIStore, useShallow } from '@/store/useUIStore';
import { translations } from '@/lib/translations';
import { AdminToolbar } from '@/pages/AdminPage/AdminToolbar';
import { AdminEmptyState } from '@/pages/AdminPage/AdminEmptyState';

import { useBatchAiAnalyze } from '@/hooks/core/mutations/useBatchAiAnalyze';
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
  const { handleBatchAiAnalyze: onBatchAiAnalyze } = useBatchAiAnalyze();

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
    <div className="flex flex-col absolute inset-0 bg-slate-50 overflow-hidden z-50" id="main-admin-screen">
       {/* Close Button */}
       <button 
         onClick={() => window.location.href = '/'} 
         className="absolute top-4 right-4 z-[60] p-2 bg-white rounded-full shadow-lg border border-slate-200"
       >
         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
       </button>
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
