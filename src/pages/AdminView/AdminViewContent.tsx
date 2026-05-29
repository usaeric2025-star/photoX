import React, { useCallback, useEffect, useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Cloud, Settings2, Plus, Terminal } from 'lucide-react';
import { useFeedback, useAdminMode, useTasks, useTaskExecutor, useMultiSelect } from '@/hooks';
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
import { PhotoActionsContext } from '@/contexts/PhotoActionsContext';
import { useGalleryStore, useShallow } from '@/store';
import { useFilters } from '@/features/filters/useFilters';
import { usePhotoGallery } from '@/features/photos/usePhotoGallery';
import { useGroupView } from '@/features/groups/useGroupView';
import { useAdminActions } from '@/features/admin/useAdminActions';
import { useAdmin } from '@/features/admin/useAdmin';
import { User, Photo } from '@/types';
import { TranslationType, getCacheBustedImageUrl } from '@/lib/ui-helpers';
import { LanguageCode } from '@/lib/translations';

/* Removed ErrorFallback component */

const AdminDiagnostics = lazy(() => import('./AdminDiagnostics'));

export const AdminViewContent: React.FC = () => {
  const logic = useAdmin();
  const { photos } = usePhotoGallery();
  const { filters } = useFilters();
  const { groupPhotos } = useGroupView(logic.activeGroupId);
  const { deletePhoto, updatePhoto } = useAdminActions();

  const isLoading = logic.isLoading;

  const { showError, showSuccess } = useFeedback();
  const isAdminMode = useAdminMode();
  const { runTask } = useTaskExecutor();
  const { setAlertDialog, isStaffMode } = useGalleryStore(useShallow(s => ({
    setAlertDialog: s.setAlertDialog,
    isStaffMode: s.isStaffMode
  })));
  const user = logic.user;
  const isEffectiveStaffMode = isStaffMode && !user;

  const { tasks, cancelTask } = useTasks();
  const { reset, clear } = useMultiSelect();

  // Reset multi select on unmount
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);



  const handleExitPublic = useCallback(() => {
    reset();
    tasks.filter(t => t.status === 'running').forEach(t => cancelTask(t.id));
    logic.setAdminPreviewMode('private');
  }, [logic, tasks, cancelTask, reset]);

  const handleRefreshPublic = useCallback(() => {
    if (logic.checkSyncLock()) return;
    logic.performPullSync();
  }, [logic]);

  const lastSyncTime = React.useMemo(() => {
    // [SYNC-STORAGE-IN-RENDER] @ src/pages/AdminView/AdminViewContent.tsx:93 - Read from storage in useMemo to avoid repeated sync reads
    const saved = localStorage.getItem('lastSyncTime');
    return saved ? new Date(saved).getTime() : null;
  }, []);

  const logicRef = React.useRef(logic);
  useEffect(() => {
    logicRef.current = logic;
  }, [logic]);

  const photoActions = React.useMemo(() => ({
    onTogglePinned: (photo: Photo) => logicRef.current.togglePinned(photo),
    onDeletePhoto: (id: string | string[]) => logicRef.current.handleDeletePhoto(id),
    onUpdatePhoto: (id: string, updates: Partial<Photo>) => logicRef.current.handleUpdatePhoto(id, updates),
    onUpdatePhotosBulk: (ids: string[], updates: Partial<Photo>) => logicRef.current.handleUpdatePhotosBulk(ids, updates),
    onToggleHidden: (photo: Photo) => logicRef.current.handleToggleHidden(photo),
    onGroupPhotos: (ids: string[]) => logicRef.current.handleGroupPhotos(ids),
    onUngroup: (groupId: string) => logicRef.current.handleUngroup(groupId),
    onBatchAiAnalyze: (photos: Photo[]) => logicRef.current.handleBatchAiIdentifyTrigger(photos),
    onBatchEdit: (ids: string[]) => logicRef.current.handleBatchEdit(ids),
    onEditPhoto: (p: Photo | string) => logicRef.current.onEditPhotoById(p),
    onAiAnalyze: (photo: Photo) => logicRef.current.handleAiAnalyze(photo),
    onSetGroupCover: (id: string, gid: string) => logicRef.current.setGroupCover(id, gid),
    onCancelAnalyze: () => logicRef.current.abortAnalysis()
  }), []);

  if (logic.authChecked && !user && !isStaffMode) {
    return <LoginScreen loginWithGoogle={async () => { await logic.loginWithGoogle(); }} isLoading={logic.isSyncing} />;
  }

  return (
    <ErrorBoundary>
      <PhotoActionsContext.Provider value={photoActions as any}>
        <DataLoadingContainer
          isLoading={!!isLoading}
          hasData={!!logic.photos && logic.photos.length > 0}
        >
          <AdminGlobalModals />
      
        <div className="grid grid-rows-[auto_1fr_auto] h-dvh bg-brand-bg">
          {logic.adminPreviewMode !== 'public' && (
            <div className="hidden lg:block shrink-0">
              <AdminSidebar />
            </div>
          )}

          <main className="overflow-auto">
              {logic.batchEditIds && logic.batchEditIds.length > 0 && (
                <BatchEditScreen />
              )}
              
              <GroupDetailView
                activeGroupId={logic.activeGroupId} setActiveGroupId={logic.setActiveGroupId}
                initialPhotoId={logic.initialPhotoId}
                setLightboxIndex={logic.setLightboxIndex} isStaffMode={isEffectiveStaffMode}
                onLongPressStart={(p: Photo) => logic.onLongPressStart(p.id)} onLongPressEnd={logic.onLongPressEnd}
              />

            <main className="flex-1 relative overflow-hidden">
              <div 
                className={`absolute inset-0 transition-opacity duration-200 ease-out ${logic.activeScreen === 'home' || logic.activeScreen === 'gallery' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
              >
                <div className={`absolute inset-0 transition-opacity duration-300 ${logic.adminPreviewMode === 'private' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                  <AdminScreen />
                </div>
                <div className={`absolute inset-0 transition-opacity duration-300 ${logic.adminPreviewMode === 'public' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                  <div className="flex flex-col h-full bg-brand-bg">
                    <UnifiedHeader 
                      variant="public-showcase"
                      onRefresh={handleRefreshPublic}
                      isRefreshing={logic.isSyncing}
                      onExit={handleExitPublic}
                    />
                    <UnifiedGallery 
                      variant="public-showcase"
                      onExit={handleExitPublic} 
                      loginWithGoogle={logic.loginWithGoogle}
                    />
                  </div>
                </div>
              </div>

              {(logic.activeScreen === 'manage' || logic.activeScreen === 'settings') && (
                <div className="absolute inset-0 z-20 bg-brand-bg">
                  <SettingsScreen />
                </div>
              )}
            </main>

          <AnimatePresence>
            {(logic.editPhotoId || logic.newPhotoData) && (
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
      </PhotoActionsContext.Provider>
    </ErrorBoundary>
  );
};
