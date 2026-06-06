import React, { useCallback, useEffect, useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Cloud, Settings2, Plus, Terminal, X, Loader2 } from 'lucide-react';
import { useLocation } from '@tanstack/react-router';
import { useAuth, useTasks, useSyncMutation, useErrorHandler, useAdminMode, useTaskExecutor, useMultiSelect, useUrlFilters, useSettings, useCategories } from '@/hooks';
import { backfillThumbHashes } from '@/services/photo/backfillService';
import { logger } from '@/lib/logger';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DataLoadingContainer } from '@/components/ui/DataLoadingContainer';
import { BatchEditScreen } from '@/components/admin/BatchEditScreen';
import { StatisticsScreen } from '@/components/admin/StatisticsScreen';
import { SettingsScreen } from '@/components/SettingsScreen';
import { PhotoEditDrawer } from '@/components/admin/PhotoEditDrawer';
import { GroupDetailPage } from '@/components/GroupDetailPage';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { LoginScreen } from '@/components/admin/LoginScreen';
import { AdminScreen } from '@/components/AdminScreen';
import { PublicGridContainer } from '@/components/photo/PublicGridContainer';
import { AdminGridContainer } from '@/components/photo/AdminGridContainer';
import { PublicHeader } from '@/components/layouts/headers/PublicHeader';
import { AdminHeader } from '@/components/layouts/headers/AdminHeader';
import { useBatchAiAnalyze } from '@/hooks/core/mutations/useBatchAiAnalyze';
import { translations } from '@/lib/translations';
import TasksPage from '@/pages/AdminPage/TasksPage';
import MaintenanceHistoryPage from '@/pages/AdminPage/MaintenanceHistoryPage';
import { ErrorLogViewer } from '@/components/admin/ErrorLogViewer';
import { useUIStore, useShallow } from '@/store/useUIStore';
import { useGroupView } from '@/features/groups/useGroupView';
import { useAdminActions } from '@/features/admin/useAdminActions';
import { usePhotoGallery } from '@/features/photos/usePhotoGallery';
import { User, Photo, Category } from '@/types';
import { TranslationType, getCacheBustedImageUrl } from '@/lib/ui-helpers';
import { LanguageCode } from '@/lib/translations';
import { toast } from 'sonner';

/* Removed ErrorFallback component */

import { useLocalStorage } from '@mantine/hooks';

export function AdminPageContent() {
  logger.debug('🔍 AdminPageContent 组件渲染');
  const [passcode, setPasscode, removePasscode] = useLocalStorage({
    key: 'ais_mock_auth_passcode',
    defaultValue: '',
  });

  const { user, isLoading: isAuthLoading, loginWithGoogle } = useAuth();
  logger.debug('🔍 useAuth 结果:', { user: user?.email, isAuthLoading });

  const { photos, isLoading: isPhotosLoading, infinitePhotosQuery } = usePhotoGallery();
  logger.debug('🔍 usePhotoGallery 结果:', { 
    photosCount: photos?.length, 
    isPhotosLoading, 
    photosError: (infinitePhotosQuery as any)?.error?.message 
  });

  const { filters: urlFilters } = useUrlFilters();
  const { deletePhoto, updatePhoto } = useAdminActions();
  const adminActions = useAdminActions();
  const { settings, isLoading: isSettingsLoading } = useSettings();

  const store = useUIStore(useShallow(s => ({
    update: s.update,
    activeScreen: s.activeScreen,
    
    editPhotoId: s.editPhotoId,
    newPhotoData: s.newPhotoData,
    batchEditingIds: s.batchEditingIds,
  })));

  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');
  
  // Sync URL to store for compatibility with old components if needed, 
  // but prefer using location directly.
  useEffect(() => {
    if (location.pathname === '/admin/error-logs') {
      store.update({ activeScreen: 'error-logs' });
    } else if (location.pathname === '/admin/tasks') {
      store.update({ activeScreen: 'tasks' });
    } else if (location.pathname === '/admin/history/maintenance') {
      store.update({ activeScreen: 'history_maintenance' });
    } else if (location.pathname === '/admin') {
       // Only set to home if we aren't in another sub-screen
       // (this is a bit messy because of the old state architecture)
       if (store.activeScreen === 'error-logs' || store.activeScreen === 'tasks' || store.activeScreen === 'history_maintenance') {
         store.update({ activeScreen: 'home' });
       }
    }
  }, [location.pathname, store.update, store.activeScreen]);

  // Determine active screen from either store or URL
  const currentScreen = location.pathname === '/admin/error-logs' ? 'error-logs' :
                        location.pathname === '/admin/tasks' ? 'tasks' :
                        location.pathname === '/admin/history/maintenance' ? 'history_maintenance' :
                        store.activeScreen;

  const isStaffMode = passcode === settings?.access_passcode && !!settings?.access_passcode;
  const setIsStaffMode = (val: boolean) => {
    if (!val) {
      removePasscode();
      window.location.reload();
    }
  };
  const { groupPhotos } = useGroupView(urlFilters.groupId);

  const { data: categories = [] } = useCategories();
  const appLang = useUIStore(s => s.appLang);

  const currentCategoryName = (() => {
    if (!urlFilters.categoryId) return null;
    const cat = categories.find(c => c.id === urlFilters.categoryId);
    if (!cat) return null;
    return (cat[appLang as keyof Category] as string) || (cat.name as string);
  })();

  const pageTitle = (() => {
    if (urlFilters.groupId) return appLang === 'zh' ? '合组详情' : appLang === 'ms' ? 'Butiran Kumpulan' : 'Group Details';
    if (currentScreen === 'dashboard') return appLang === 'zh' ? '数据看板' : appLang === 'ms' ? 'Papan Pemuka' : 'Dashboard';
    if (currentScreen === 'tasks') return appLang === 'zh' ? '任务中心' : appLang === 'ms' ? 'Pusat Tugasan' : 'Task Center';
    if (currentScreen === 'history_maintenance') return appLang === 'zh' ? '维护历史' : appLang === 'ms' ? 'Sejarah Penyelenggaraan' : 'Maintenance';
    if (currentScreen === 'error-logs') return appLang === 'zh' ? '系统日志' : appLang === 'ms' ? 'Log Sistem' : 'Logs';
    if (currentCategoryName) return currentCategoryName;
    return appLang === 'zh' ? '全部照片' : appLang === 'ms' ? 'Semua Foto' : 'All Photos';
  })();

  const { handleBatchAiAnalyze } = useBatchAiAnalyze();

  const handleBatchAiAnalyzeTrigger = async () => {
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
      handleBatchAiAnalyze(finalPhotos);
    } else {
      handleBatchAiAnalyze(photos);
    }
  };

  const onRefresh = async () => {
    try {
      await syncMut('pull');
      toast.success(appLang === 'zh' ? '同步已完成' : appLang === 'ms' ? 'Penyegerakan Selesai' : 'Sync completed');
    } catch (e: any) {
      toast.error(`${appLang === 'zh' ? '同步失败' : appLang === 'ms' ? 'Gagal Segerak' : 'Sync failed'}: ${e.message || '未知错误'}`);
    }
  };

  const isLoading = isAuthLoading || isPhotosLoading || isSettingsLoading;

  // 添加 loading 超时强制显示
  const [forceShow, setForceShow] = useState(false);
  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => {
      logger.warn('⚠️ Loading 超时，强制显示内容');
      setForceShow(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  const { handleError } = useErrorHandler();
  const isAdminMode = useAdminMode();
  const { runTask } = useTaskExecutor();
  const isEffectiveStaffMode = !user && isAdminMode;

  const handlePublicScrollToTop = () => {
  };


  logger.debug('📸 照片数量:', photos?.length, '加载状态:', isLoading, '强制显示:', forceShow);

  const { tasks, cancelTask } = useTasks();
  const { mutateAsync: syncMut } = useSyncMutation();
  const { reset, clear } = useMultiSelect();
  
  const isSyncing = tasks.some(t => t.status === 'running' && (t.name.includes('同步') || t.name.includes('Sync')));

  // Reset multi select on unmount
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);



  const [lastSyncTimeVal] = useLocalStorage<string | null>({
    key: 'lastSyncTime',
    defaultValue: null,
  });

  const lastSyncTime = lastSyncTimeVal ? new Date(lastSyncTimeVal).getTime() : null;

  const adminRef = React.useRef(adminActions);
  const storeRef = React.useRef(store);
  useEffect(() => {
    adminRef.current = adminActions;
    storeRef.current = store;
  }, [adminActions, store]);
  
  // NOTE: photoActions might not be used here since we deleted contexts earlier.

  // 未认证且未登录，显示登录屏
  if (!isAuthLoading && !user && !isStaffMode) {
    logger.debug('🔍 条件触发: 无用户且非StaffMode，显示登录页');
    return (
      <div className="h-screen w-full">
        <LoginScreen loginWithGoogle={loginWithGoogle} isLoading={isSyncing} />
      </div>
    );
  }

  // Auth is still loading - show stable layout with loading state instead of unmounting everything
  if (isAuthLoading && !user && !isStaffMode && !forceShow) {
    return (
      <div className="flex h-screen bg-slate-50 overflow-hidden w-full">
        <div className="hidden lg:block shrink-0 h-full">
          <div className="w-72 bg-white border-r border-slate-100 flex flex-col h-full animate-pulse" />
        </div>
        <div className="flex-1 flex flex-col h-full items-center justify-center">
          <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">验证身份中 / Authenticating...</p>
        </div>
      </div>
    );
  }

  logger.debug('🔍 条件通过: 有用户或StaffMode，显示管理内容');

  return (
    <ErrorBoundary>
        <DataLoadingContainer
          isLoading={isLoading && !forceShow}
          hasData={(!!photos && photos.length > 0) || forceShow}
        >
        <div className="flex h-screen bg-slate-50 overflow-hidden w-full">
            <div className="hidden lg:block shrink-0 h-full">
              <AdminSidebar />
            </div>

          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
              <AdminHeader 
                onRefresh={onRefresh}
                isRefreshing={isSyncing}
                totalCount={photos?.length}
                onBatchAiIdentify={handleBatchAiAnalyzeTrigger}
                title={pageTitle}
              />

              {store.batchEditingIds && store.batchEditingIds.length > 0 && (
                <BatchEditScreen />
              )}
              
            <main className="flex-1 relative overflow-hidden">
              <div 
                className={`absolute inset-0 transition-all duration-300 ease-out ${currentScreen === 'home' || currentScreen === 'gallery' ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 pointer-events-none scale-[0.98]'}`}
              >
                  {urlFilters.groupId ? (
                    null
                  ) : (
                    <AdminScreen />
                  )}
              </div>

              <AnimatePresence>
                {(currentScreen === 'manage' || currentScreen === 'settings') && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 z-20 bg-slate-50"
                  >
                    <SettingsScreen />
                  </motion.div>
                )}

                {currentScreen === 'dashboard' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 z-20 bg-slate-50 flex flex-col"
                  >
                    <div className="flex justify-end p-4 shrink-0 bg-slate-50/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100">
                      <button 
                        onClick={() => store.update({ activeScreen: 'gallery' })}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-900"
                      >
                        <X size={24} />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto w-full no-scrollbar px-8 pb-8">
                      <StatisticsScreen />
                    </div>
                  </motion.div>
                )}

                {currentScreen === 'tasks' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 z-20 bg-slate-50 flex flex-col"
                  >
                    <div className="flex justify-end p-4 shrink-0 bg-slate-50/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100">
                      <button 
                        onClick={() => store.update({ activeScreen: 'gallery' })}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-900"
                      >
                        <X size={24} />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto w-full no-scrollbar p-8">
                      <TasksPage />
                    </div>
                  </motion.div>
                )}

                {currentScreen === 'history_maintenance' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 z-20 bg-slate-50 flex flex-col"
                  >
                    <div className="flex justify-end p-4 shrink-0 bg-slate-50/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100">
                      <button 
                        onClick={() => store.update({ activeScreen: 'gallery' })}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-900"
                      >
                        <X size={24} />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto w-full no-scrollbar p-8">
                      <MaintenanceHistoryPage />
                    </div>
                  </motion.div>
                )}

                {currentScreen === 'error-logs' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 z-20 bg-slate-50 flex flex-col"
                  >
                    <div className="flex justify-end p-4 shrink-0 bg-slate-50/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100">
                      <button 
                        onClick={() => store.update({ activeScreen: 'gallery' })}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-900"
                      >
                        <X size={24} />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto w-full no-scrollbar p-8">
                      <ErrorLogViewer />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </main>

          <AnimatePresence>
            {(store.editPhotoId || store.newPhotoData) && (
              <PhotoEditDrawer />
            )}
          </AnimatePresence>
        </div>
      </div>
      </DataLoadingContainer>

      <GroupDetailPage 
        variant={user ? 'full-management' : 'staff-workspace'} 
        onBatchAiAnalyze={handleBatchAiAnalyzeTrigger}
      />
    </ErrorBoundary>
  );
};
