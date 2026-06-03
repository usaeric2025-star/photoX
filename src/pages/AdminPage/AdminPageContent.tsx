import React, { useCallback, useEffect, useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Cloud, Settings2, Plus, Terminal, X } from 'lucide-react';
import { useAuth, useTasks, useSyncMutation, useErrorHandler, useAdminMode, useTaskExecutor, useMultiSelect, useUrlFilters, useSettings } from '@/hooks';
import { backfillThumbHashes } from '@/services/photo/backfillService';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DataLoadingContainer } from '@/components/ui/DataLoadingContainer';
import { AdminGlobalModals } from '@/components/admin/AdminGlobalModals';
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
import TasksPage from '@/pages/AdminPage/TasksPage';
import MaintenanceHistoryPage from '@/pages/AdminPage/MaintenanceHistoryPage';
import { useUIStore, useShallow } from '@/store/useUIStore';
import { useFilters } from '@/features/filters/useFilters';
import { useGroupView } from '@/features/groups/useGroupView';
import { useAdminActions } from '@/features/admin/useAdminActions';
import { usePhotoGallery } from '@/features/photos/usePhotoGallery';
import { User, Photo } from '@/types';
import { TranslationType, getCacheBustedImageUrl } from '@/lib/ui-helpers';
import { LanguageCode } from '@/lib/translations';
import { logger } from '@/lib/logger';

/* Removed ErrorFallback component */

export function AdminPageContent() {
  logger.debug('🔍 AdminPageContent 组件渲染');

  const { user, isLoading: isAuthLoading, loginWithGoogle } = useAuth();
  logger.debug('🔍 useAuth 结果:', { user: user?.email, isAuthLoading });

  const { photos, isLoading: isPhotosLoading, infinitePhotosQuery } = usePhotoGallery();
  logger.debug('🔍 usePhotoGallery 结果:', { 
    photosCount: photos?.length, 
    isPhotosLoading, 
    photosError: (infinitePhotosQuery as any)?.error?.message 
  });

  const { filters: userFilters } = useFilters();
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

  const isStaffMode = typeof window !== 'undefined' && 
    window.localStorage.getItem('ais_mock_auth_passcode') === settings?.access_passcode && 
    !!settings?.access_passcode;
  const setIsStaffMode = (val: boolean) => {
    if (!val) {
      window.localStorage.removeItem('ais_mock_auth_passcode');
      window.location.reload();
    }
  };
  const { groupPhotos } = useGroupView(urlFilters.groupId);

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



  const lastSyncTime = (() => {
    // [SYNC-STORAGE-IN-RENDER] @ src/pages/AdminPage/AdminPageContent.tsx:108 - Read from storage in render
    const saved = localStorage.getItem('lastSyncTime');
    return saved ? new Date(saved).getTime() : null;
  })();

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
    return <LoginScreen loginWithGoogle={loginWithGoogle} isLoading={isSyncing} />;
  }

  logger.debug('🔍 条件通过: 有用户或StaffMode，显示管理内容');

  return (
    <ErrorBoundary>
        <DataLoadingContainer
          isLoading={isLoading && !forceShow}
          hasData={(!!photos && photos.length > 0) || forceShow}
        >
          <AdminGlobalModals />
      
        <div className="flex h-screen bg-slate-50 overflow-hidden w-full">
            <div className="hidden lg:block shrink-0 h-full">
              <AdminSidebar />
            </div>

          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
              {store.batchEditingIds && store.batchEditingIds.length > 0 && (
                <BatchEditScreen />
              )}
              
            <main className="flex-1 relative overflow-hidden">
              <div 
                className={`absolute inset-0 transition-opacity duration-200 ease-out ${store.activeScreen === 'home' || store.activeScreen === 'gallery' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
              >
                  {urlFilters.groupId ? (
                    <GroupDetailPage />
                  ) : (
                    <AdminScreen />
                  )}
              </div>

              {(store.activeScreen === 'manage' || store.activeScreen === 'settings') && (
                <div className="absolute inset-0 z-20 bg-slate-50">
                  <SettingsScreen />
                </div>
              )}

              {store.activeScreen === 'dashboard' && (
                <div className="absolute inset-0 z-20 bg-slate-50 flex flex-col">
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
                </div>
              )}

              {store.activeScreen === 'tasks' && (
                <div className="absolute inset-0 z-20 bg-slate-50 flex flex-col">
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
                </div>
              )}

              {store.activeScreen === 'history_maintenance' && (
                <div className="absolute inset-0 z-20 bg-slate-50 flex flex-col">
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
                </div>
              )}
            </main>

          <AnimatePresence>
            {(store.editPhotoId || store.newPhotoData) && (
              <PhotoEditDrawer />
            )}
          </AnimatePresence>
        </div>
      </div>
      </DataLoadingContainer>
    </ErrorBoundary>
  );
};
