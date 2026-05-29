import React, { useCallback, useEffect, useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Cloud, Settings2, Plus, Terminal } from 'lucide-react';
import { useAuth, useTasks, useSyncMutation, useFeedback, useAdminMode, useTaskExecutor, useMultiSelect } from '@/hooks';
import { backfillThumbHashes } from '@/services/photo/backfillService';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DataLoadingContainer } from '@/components/ui/DataLoadingContainer';
import { AdminGlobalModals } from '@/components/admin/AdminGlobalModals';
import { BatchEditScreen } from '@/components/admin/BatchEditScreen';
import { SettingsScreen } from '@/components/SettingsScreen';
import { PhotoEditDrawer } from '@/components/admin/PhotoEditDrawer';
import { GroupDetailView } from '@/components/GroupDetailView';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { LoginScreen } from '@/components/admin/LoginScreen';
import { AdminScreen } from '@/components/AdminScreen';
import { UnifiedHeader } from '@/components/shared/UnifiedHeader';
import { UnifiedGallery } from '@/components/shared/UnifiedGallery';
import { useGalleryStore, useShallow } from '@/store';
import { useFilters } from '@/features/filters/useFilters';
import { useGroupView } from '@/features/groups/useGroupView';
import { useAdminActions } from '@/features/admin/useAdminActions';
import { usePhotoGallery } from '@/features/photos/usePhotoGallery';
import { User, Photo } from '@/types';
import { TranslationType, getCacheBustedImageUrl } from '@/lib/ui-helpers';
import { LanguageCode } from '@/lib/translations';

/* Removed ErrorFallback component */

const AdminDiagnostics = lazy(() => import('./AdminDiagnostics'));

export const AdminViewContent: React.FC = () => {
  console.log('🔍 AdminViewContent 组件渲染');

  const { user, isLoading: isAuthLoading, loginWithGoogle } = useAuth();
  console.log('🔍 useAuth 结果:', { user: user?.email, isAuthLoading });

  const { photos, isLoading: isPhotosLoading, infinitePhotosQuery } = usePhotoGallery();
  console.log('🔍 usePhotoGallery 结果:', { 
    photosCount: photos?.length, 
    isPhotosLoading, 
    photosError: (infinitePhotosQuery as any)?.error?.message 
  });

  const { filters } = useFilters();
  const { deletePhoto, updatePhoto } = useAdminActions();
  const adminActions = useAdminActions();

  const store = useGalleryStore(useShallow(s => ({
    viewMode: s.viewMode,
    setViewMode: s.setViewMode,
    activeScreen: s.activeScreen,
    setActiveScreen: s.setActiveScreen,
    editPhotoId: s.editPhotoId,
    setEditPhotoId: s.setEditPhotoId,
    newPhotoData: s.newPhotoData,
    batchEditingIds: s.batchEditingIds,
    setBatchEditingIds: s.setBatchEditingIds,
    setLightboxIndex: s.setLightboxIndex,
    activeGroupId: s.activeGroupId,
    setActiveGroupId: s.setActiveGroupId,
    isStaffMode: s.isStaffMode,
    setAlertDialog: s.setAlertDialog,
  })));

  const { groupPhotos } = useGroupView(store.activeGroupId);

  const isLoading = isAuthLoading || isPhotosLoading;

  // 添加 loading 超时强制显示
  const [forceShow, setForceShow] = useState(false);
  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => {
      console.warn('⚠️ Loading 超时，强制显示内容');
      setForceShow(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  const { showError, showSuccess } = useFeedback();
  const isAdminMode = useAdminMode();
  const { runTask } = useTaskExecutor();
  const isEffectiveStaffMode = store.isStaffMode && !user;

  console.log('📸 照片数量:', photos?.length, '加载状态:', isLoading, '强制显示:', forceShow);

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

  const handleExitPublic = useCallback(() => {
    reset();
    tasks.filter(t => t.status === 'running').forEach(t => cancelTask(t.id));
    store.setViewMode('private');
  }, [store.setViewMode, tasks, cancelTask, reset]);

  const handleRefreshPublic = useCallback(() => {
    if (isSyncing) return;
    syncMut('pull');
  }, [isSyncing, syncMut]);

  const lastSyncTime = React.useMemo(() => {
    // [SYNC-STORAGE-IN-RENDER] @ src/pages/AdminView/AdminViewContent.tsx:93 - Read from storage in useMemo to avoid repeated sync reads
    const saved = localStorage.getItem('lastSyncTime');
    return saved ? new Date(saved).getTime() : null;
  }, []);

  const adminRef = React.useRef(adminActions);
  const storeRef = React.useRef(store);
  useEffect(() => {
    adminRef.current = adminActions;
    storeRef.current = store;
  }, [adminActions, store]);
  
  // NOTE: photoActions might not be used here since we deleted contexts earlier.

  if (!isAuthLoading && !user && !store.isStaffMode) {
    console.log('🔍 条件触发: 无用户且非StaffMode，显示登录页');
    return <LoginScreen loginWithGoogle={loginWithGoogle} isLoading={isSyncing} />;
  }

  // 员工模式：显示受限限制界面
  if (!user && store.isStaffMode) {
    console.log('🔍 显示员工模式受限界面');
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-[24px] p-8 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[11px] font-bold tracking-wider uppercase mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
              员工模式 / Staff Mode
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              PHOT<span className="text-blue-600">O</span>X WORKSPACE
            </h1>
            <p className="text-xs text-slate-500">
              功能受限模式 / Restricted Access Mode
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-3 leading-relaxed">
            <p className="font-semibold text-slate-800">
              当前为员工工作环境，提供以下安全权限：
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
              <li>查看商品画册及隐藏信息</li>
              <li>使用 AI 人工智能属性别名识别</li>
              <li>商品分组关联与编辑权限</li>
            </ul>
            <p className="text-[10px] text-slate-400">
              * 为保障系统安全性，云端同步及系统全局配置等底层架构管理功能已物理隔离。如需完整控制，请切换至管理员账号。
            </p>
          </div>

          <button
            onClick={() => useGalleryStore.getState().setIsStaffMode(false)}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white h-14 rounded-2xl text-[13px] font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            退出员工模式 / Exit Workspace
          </button>
        </div>
      </div>
    );
  }

  console.log('🔍 条件通过: 有用户或StaffMode，显示管理内容');

  return (
    <ErrorBoundary>
        <DataLoadingContainer
          isLoading={isLoading && !forceShow}
          hasData={(!!photos && photos.length > 0) || forceShow}
        >
          <AdminGlobalModals />
      
        <div className="grid grid-rows-[auto_1fr_auto] h-dvh bg-brand-bg">
          {store.viewMode !== 'public' && (
            <div className="hidden lg:block shrink-0">
              <AdminSidebar />
            </div>
          )}

          <div className="overflow-auto flex flex-col flex-1 min-h-0">
              {store.batchEditingIds && store.batchEditingIds.length > 0 && (
                <BatchEditScreen />
              )}
              
              <GroupDetailView
                activeGroupId={store.activeGroupId} setActiveGroupId={store.setActiveGroupId}
                initialPhotoId={null}
                setLightboxIndex={store.setLightboxIndex} isStaffMode={isEffectiveStaffMode}
                onLongPressStart={(photo: Photo) => {}} onLongPressEnd={() => {}}
              />

            <main className="flex-1 relative overflow-hidden">
              <div 
                className={`absolute inset-0 transition-opacity duration-200 ease-out ${store.activeScreen === 'home' || store.activeScreen === 'gallery' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
              >
                <div className={`absolute inset-0 transition-opacity duration-300 ${store.viewMode === 'private' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                  <AdminScreen />
                </div>
                <div className={`absolute inset-0 transition-opacity duration-300 ${store.viewMode === 'public' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                  <div className="flex flex-col h-full bg-brand-bg">
                    <UnifiedHeader 
                      variant="public-showcase"
                      onRefresh={handleRefreshPublic}
                      isRefreshing={isSyncing}
                      onExit={handleExitPublic}
                    />
                    <UnifiedGallery 
                      variant="public-showcase"
                      onExit={handleExitPublic} 
                      loginWithGoogle={loginWithGoogle}
                    />
                  </div>
                </div>
              </div>

              {(store.activeScreen === 'manage' || store.activeScreen === 'settings') && (
                <div className="absolute inset-0 z-20 bg-brand-bg">
                  <SettingsScreen />
                </div>
              )}
            </main>

          <AnimatePresence>
            {(store.editPhotoId || store.newPhotoData) && (
              <PhotoEditDrawer />
            )}
          </AnimatePresence>

          {typeof __ADMIN_DIAGNOSTICS__ !== 'undefined' && __ADMIN_DIAGNOSTICS__ && (
            <Suspense fallback={null}>
              <AdminDiagnostics />
            </Suspense>
          )}
        </div>
      </div>
      </DataLoadingContainer>
    </ErrorBoundary>
  );
};
