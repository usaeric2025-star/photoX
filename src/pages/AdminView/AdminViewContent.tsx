import React, { useCallback, useEffect, useState } from 'react';
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
import { MainAdminScreen } from './MainAdminScreen';
import { PublicGallery } from '@/components/public/PublicGallery';
import { PhotoActionsContext } from '@/contexts/PhotoActionsContext';
import { useGalleryStore, useShallow } from '@/store';
import { useAdmin } from '@/contexts/AdminContext';
import { useAdminDataPrep } from './useAdminDataPrep';
import { User, Photo } from '@/types';
import { TranslationType, getCacheBustedImageUrl } from '@/lib/ui-helpers';
import { LanguageCode } from '@/lib/translations';

/* Removed ErrorFallback component */

export const AdminViewContent: React.FC = () => {
  const logic = useAdmin();
  const {
    user, authChecked, t, lang, isSyncing, infinitePhotosQuery
  } = logic;

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    if (infinitePhotosQuery && !infinitePhotosQuery.isLoading) {
      setHasLoadedOnce(true);
    }
  }, [infinitePhotosQuery?.isLoading]);

  const isLoading = !hasLoadedOnce && infinitePhotosQuery?.isLoading;

  const { showError, showSuccess } = useFeedback();
  const isAdminMode = useAdminMode();
  const { runTask } = useTaskExecutor();
  const { setAlertDialog, isStaffMode } = useGalleryStore(useShallow(s => ({
    setAlertDialog: s.setAlertDialog,
    isStaffMode: s.isStaffMode
  })));
  const isEffectiveStaffMode = isStaffMode && !user;

  const { tasks, cancelTask } = useTasks();
  const { reset, clear } = useMultiSelect();

  // Reset multi select on unmount
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  // 保存滚动位置
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem('scrollPosition', String(window.scrollY));
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 恢复滚动位置
  useEffect(() => {
    const savedPosition = sessionStorage.getItem('scrollPosition');
    if (savedPosition) {
      window.scrollTo({ top: parseInt(savedPosition), behavior: 'auto' });
    }
  }, []);

  const handleExitPublic = useCallback(() => {
    reset();
    tasks.filter(t => t.status === 'running').forEach(t => cancelTask(t.id));
    logic.setAdminPreviewMode('private');
  }, [logic, tasks, cancelTask, reset]);

  const handleRefreshPublic = useCallback(() => {
    if (logic.checkSyncLock()) return;
    logic.performPullSync();
  }, [logic]);

  const lastSyncTime = localStorage.getItem('lastSyncTime') ? new Date(localStorage.getItem('lastSyncTime')!).getTime() : null;

  const {
    togglePinned, handleDeletePhoto, handleUpdatePhoto, handleToggleHidden,
    handleGroupPhotos, handleUngroup, handleBatchAiIdentifyTrigger, handleBatchEdit,
    onEditPhotoById, handleAiAnalyze, setGroupCover, abortAnalysis
  } = logic;

  const logicRef = React.useRef(logic);
  logicRef.current = logic;

  const photoActions = React.useMemo(() => ({
    onTogglePinned: logic.togglePinned,
    onDeletePhoto: logic.handleDeletePhoto,
    onUpdatePhoto: logic.handleUpdatePhoto,
    onUpdatePhotosBulk: (ids, updates, taskName) => logic.handleUpdatePhotosBulk(ids, updates, { taskName }),
    onToggleHidden: logic.handleToggleHidden,
    onGroupPhotos: logic.handleGroupPhotos,
    onUngroup: logic.handleUngroup,
    onBatchAiAnalyze: logic.handleBatchAiIdentifyTrigger,
    onBatchEdit: logic.handleBatchEdit,
    onEditPhoto: logic.onEditPhotoById,
    onAiAnalyze: logic.handleAiAnalyze,
    onSetGroupCover: logic.setGroupCover,
    onCancelAnalyze: logic.abortAnalysis
  }), [logic]);

  if (authChecked && !user && !isStaffMode) {
    return <LoginScreen loginWithGoogle={async () => { await logic.loginWithGoogle(); }} isLoading={isSyncing} />;
  }

  return (
    <ErrorBoundary>
      <PhotoActionsContext.Provider value={photoActions}>
        <DataLoadingContainer
          isLoading={!!isLoading}
          hasData={!!logic.photos && logic.photos.length > 0}
        >
          <AdminGlobalModals />
      
        <div className="flex h-[100dvh] overflow-hidden bg-brand-bg">
          <div className="hidden lg:block shrink-0">
            <AdminSidebar />
          </div>

          <div className="flex-1 flex flex-col min-w-0 relative h-full">
            <React.Suspense fallback={<div className="flex flex-col items-center justify-center h-screen bg-brand-bg gap-4"><div className="w-8 h-8 border-[1px] border-brand-navy/10 border-t-brand-gold rounded-full animate-spin" /><span className="text-[10px] font-bold text-brand-navy/30 uppercase tracking-widest">Loading...</span></div>}>
              {logic.batchEditIds && logic.batchEditIds.length > 0 && (
                <BatchEditScreen />
              )}
              
              <GroupDetailView
                activeGroupId={logic.activeGroupId} setActiveGroupId={logic.setActiveGroupId}
                initialPhotoId={logic.initialPhotoId}
                setLightboxIndex={logic.setLightboxIndex} isStaffMode={isEffectiveStaffMode}
                onLongPressStart={(p: Photo) => logic.onLongPressStart(p.id)} onLongPressEnd={logic.onLongPressEnd}
              />
            </React.Suspense>

            <main className={`flex-1 relative overflow-hidden ${logic.activeScreen === 'home' || logic.activeScreen === 'manage' || logic.activeScreen === 'settings' ? 'pb-20 lg:pb-0' : ''}`}>
              <div 
                className={`absolute inset-0 transition-opacity duration-200 ease-out ${logic.activeScreen === 'home' || logic.activeScreen === 'gallery' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
              >
                <div className={`absolute inset-0 transition-opacity duration-300 ${logic.adminPreviewMode === 'private' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                  <MainAdminScreen />
                </div>
                <div className={`absolute inset-0 transition-opacity duration-300 ${logic.adminPreviewMode === 'public' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                  <div className="flex flex-col h-full bg-brand-bg">
                    <PublicGallery 
                      isRefreshing={isSyncing}
                      onExit={handleExitPublic} showExit={true}
                      user={user} loginWithGoogle={logic.loginWithGoogle}
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

          {/* Mobile Bottom Navigation */}
          {!isEffectiveStaffMode && logic.adminPreviewMode !== 'public' && (
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 z-[100] px-6 py-3 flex justify-between items-center safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
              <button 
                onClick={() => logic.setActiveScreen('home')}
                className={`p-2 flex flex-col items-center gap-1 transition-all active:scale-90 ${logic.activeScreen === 'home' ? 'text-blue-600' : 'text-slate-400'}`}
              >
                <Home size={20} />
                <span className="text-[10px] font-bold">照片库</span>
              </button>
              <button 
                onClick={() => logic.setActiveScreen('manage')}
                className={`p-2 flex flex-col items-center gap-1 transition-all active:scale-90 ${logic.activeScreen === 'manage' ? 'text-blue-600' : 'text-slate-400'}`}
              >
                <Cloud size={20} />
                <span className="text-[10px] font-bold">迁移/管理</span>
              </button>
              <button 
                onClick={logic.handleImport}
                className="mb-6 bg-blue-600 p-3 rounded-full text-white shadow-lg active:scale-90 transition-all border-4 border-white"
              >
                <Plus size={24} />
              </button>
              <button 
                onClick={() => logic.setActiveScreen('manage')} // For mobile simplify jump to manage for now
                className={`p-2 flex flex-col items-center gap-1 transition-all active:scale-90 ${logic.activeScreen === 'ai_settings' ? 'text-blue-600' : 'text-slate-400'}`}
              >
                <Terminal size={20} />
                <span className="text-[10px] font-bold">控制台</span>
              </button>
              <button 
                onClick={() => logic.setActiveScreen('settings')}
                className={`p-2 flex flex-col items-center gap-1 transition-all active:scale-90 ${logic.activeScreen === 'settings' ? 'text-blue-600' : 'text-slate-400'}`}
              >
                <Settings2 size={20} />
                <span className="text-[10px] font-bold">全局设置</span>
              </button>
            </div>
          )}
        </div>
      </div>
      </DataLoadingContainer>
      </PhotoActionsContext.Provider>
    </ErrorBoundary>
  );
};
