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
  console.log('🔍 AdminViewContent 渲染开始');

  const { user, isLoading: isAuthLoading, loginWithGoogle } = useAuth();
  const { photos, isLoading: isPhotosLoading, infinitePhotosQuery } = usePhotoGallery();
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
    if (isLoading) {
      const timer = setTimeout(() => {
        console.warn('⚠️ Loading 超时，强制显示内容');
        setForceShow(true);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setForceShow(false);
    }
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
    return <LoginScreen loginWithGoogle={loginWithGoogle} isLoading={isSyncing} />;
  }

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

          <main className="overflow-auto">
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
        </main>
      </div>
      </DataLoadingContainer>
    </ErrorBoundary>
  );
};
