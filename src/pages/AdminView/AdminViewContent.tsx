import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFeedback, useAdminMode, useTasks, useTaskExecutor } from '@/hooks';
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
import { useGalleryStore } from '@/store';
import { useAdminDataPrep } from './useAdminDataPrep';
import { useMultiSelect } from '@/hooks/useMultiSelect';
import { User, Photo } from '@/types';
import { TranslationType, getCacheBustedImageUrl } from '@/lib/ui-helpers';
import { LanguageCode } from '@/lib/translations';

/* Removed ErrorFallback component */

export const AdminViewContent: React.FC = () => {
  const logic = useAdminDataPrep();
  const actions = logic;

  const {
    user, authChecked, t, lang, hasNextPage, isFetchingNextPage, loadingType, infinitePhotosQuery
  } = logic;

  const isLoading = infinitePhotosQuery.isLoading;

  console.log('AdminView render', { isLoading });
  const { showError, showSuccess } = useFeedback();
  const isAdminMode = useAdminMode();
  const { runTask } = useTaskExecutor();
  const setAlertDialog = useGalleryStore(s => s.setAlertDialog);

  const [isMaintenanceRunning, setIsMaintenanceRunning] = useState(false);
  const [showImmediateLoading, setShowImmediateLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowImmediateLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);
  
  const handleRunMaintenance = useCallback(async () => {
    if (isMaintenanceRunning) return;
    setIsMaintenanceRunning(true);
    await runTask('自动修复缩略图 / Auto Repair ThumbHashes', async ({ updateProgress }) => {
        const { getPhotosWithoutThumbHash } = await import('@/services/photoService');
        updateProgress(15, '正在 analysis 未生成缩略图占位项目的数量...');
        // First check if there are any missing thumb hashes to avoid needless backfilling
        const missingHashes = await getPhotosWithoutThumbHash();
        
        if (!missingHashes || missingHashes.length === 0) {
            updateProgress(100, '完美分析完成，没有缺失占位图的照片。');
            return { skipped: true };
        }

        updateProgress(40, `正在为 ${missingHashes.length} 项商品自动回填修复...`);
        await backfillThumbHashes((stats) => {
            const progressPct = 40 + (stats.processed / stats.total) * 60;
            updateProgress(
                progressPct,
                `正在修复: ${stats.processed}/${stats.total} (成功: ${stats.success}, 失败: ${stats.failed})`
            );
        });
        return { skipped: false };
    }, {
        onSuccess: (res) => {
            if (res?.skipped) {
                showSuccess('诊断完成：所有照片缩略图高度一致，无需修复！ (已跳过已完善项目)');
            } else {
                showSuccess('缩略图自动修复完成');
            }
        },
        onError: (e) => {
            showError(e, '修复失败，已停止');
        },
        showSuccessToast: false,
        showErrorToast: true
    });
    setIsMaintenanceRunning(false);
  }, [runTask, showError, showSuccess, isMaintenanceRunning]);

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
  const hasLoadedOnce = useGalleryStore((s) => s.hasLoadedOnce);

  const isStaffMode = useGalleryStore((s) => s.isStaffMode);
  const setActions = useGalleryStore((s) => s.setActions);
  const setAbortAnalysis = useGalleryStore((s) => s.setAbortAnalysis);

  const {
    togglePinned, handleDeletePhoto, handleUpdatePhoto, handleToggleHidden,
    handleGroupPhotos, handleUngroup, handleBatchAiIdentifyTrigger, handleBatchEdit,
    onEditPhotoById, handleAiAnalyze, setGroupCover, abortAnalysis
  } = logic;

  useEffect(() => {
    setActions({
      onTogglePinned: togglePinned,
      onDeletePhoto: handleDeletePhoto,
      onUpdatePhoto: handleUpdatePhoto,
      onToggleHidden: handleToggleHidden,
      onGroupPhotos: handleGroupPhotos,
      onUngroup: handleUngroup,
      onBatchAiAnalyze: handleBatchAiIdentifyTrigger,
      onBatchEdit: handleBatchEdit,
      onEditPhoto: onEditPhotoById,
      onAiAnalyze: handleAiAnalyze,
      onSetGroupCover: setGroupCover,
      onCancelAnalyze: abortAnalysis
    });
    setAbortAnalysis(abortAnalysis);
  }, [
    setActions, setAbortAnalysis, togglePinned, handleDeletePhoto, handleUpdatePhoto,
    handleToggleHidden, handleGroupPhotos, handleUngroup, handleBatchAiIdentifyTrigger,
    handleBatchEdit, onEditPhotoById, handleAiAnalyze, setGroupCover, abortAnalysis
  ]);

  if (authChecked && !user && !isStaffMode) {
    return <LoginScreen loginWithGoogle={async () => { await logic.loginWithGoogle(); }} isLoading={(loadingType as string) === 'auth'} />;
  }

  return (
    <ErrorBoundary>
      <DataLoadingContainer
        isLoading={!!isLoading}
        hasData={!!logic.photos && logic.photos.length > 0}
        showImmediateLoading={showImmediateLoading}
      >
        <AdminGlobalModals />
      
      <div className="flex h-[100dvh] overflow-hidden bg-brand-bg">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block shrink-0">
          <AdminSidebar 
            settings={logic.settings}
            activeScreen={logic.activeScreen}
            setActiveScreen={logic.setActiveScreen}
            cloudCount={logic.cloudCount}
            onRefresh={logic.onRefresh}
          />
        </div>

        <div className="flex-1 flex flex-col min-w-0 relative h-full">
          <React.Suspense fallback={<div className="flex flex-col items-center justify-center h-screen bg-brand-bg gap-4"><div className="w-8 h-8 border-[1px] border-brand-navy/10 border-t-brand-gold rounded-full animate-spin" /><span className="text-[10px] font-bold text-brand-navy/30 uppercase tracking-widest">Loading...</span></div>}>
            {logic.batchEditIds && (
              <BatchEditScreen 
                resetAddState={logic.resetAddState} saveBatchEdit={logic.saveBatchEditWithSuccess}
                batchEditIds={logic.batchEditIds} formState={logic.formState} updateForm={logic.updateForm}
                batchIsHiddenApplied={logic.batchIsHiddenApplied} setBatchIsHiddenApplied={logic.setBatchIsHiddenApplied}
                showOtherFields={logic.showOtherFields} setShowOtherFields={logic.setShowOtherFields}
                quickAddManufacturer={logic.quickAddManufacturer} quickAddTag={logic.quickAddTag}
                updateTag={logic.updateTag} deleteTag={logic.deleteTag} addTag={logic.addTag}
                onDelete={logic.handleDeletePhoto}
              />
            )}
            
            <GroupDetailView
              activeGroupId={logic.activeGroupId} setActiveGroupId={logic.setActiveGroupId}
              photos={logic.photos} displayPhotos={logic.groupPhotos} initialPhotoId={logic.initialPhotoId}
              setLightboxIndex={logic.setLightboxIndex} isStaffMode={true}
              onLongPressStart={(p: Photo) => logic.onLongPressStart(p.id)} onLongPressEnd={logic.onLongPressEnd}
            />
          </React.Suspense>

          <main className="flex-1 relative overflow-hidden">
            {/* We keep MainAdminScreen and PublicGallery mounted to preserve scroll position and avoid flickering */}
            <div 
              className={`absolute inset-0 transition-opacity duration-200 ease-out ${logic.activeScreen === 'home' || logic.activeScreen === 'gallery' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
            >
              <div className={`absolute inset-0 transition-opacity duration-300 ${logic.adminPreviewMode === 'private' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                <MainAdminScreen 
                  {...logic} isAdmin={isAdminMode} isFetchingNextPage={!!infinitePhotosQuery.isFetchingNextPage}
                  isLoading={infinitePhotosQuery.isLoading}
                  onManageClick={logic.handleManageClick} onRefresh={logic.onRefresh}
                  onLoadMore={logic.handleLoadMoreCallback} hasNextPage={!!infinitePhotosQuery.hasNextPage}
                  onImport={logic.handleImport}
                />
              </div>
              <div className={`absolute inset-0 transition-opacity duration-300 ${logic.adminPreviewMode === 'public' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                <div className="flex flex-col h-full bg-brand-bg">
                  <PublicGallery 
                    photos={logic.photos}
                    isRefreshing={logic.loadingType === 'sync-pull' || logic.loadingType === 'sync-push'} isFetchingNextPage={infinitePhotosQuery.isFetchingNextPage}
                    onExit={handleExitPublic} showExit={true} onRefresh={handleRefreshPublic}
                    totalCount={logic.cloudCount}
                    user={user} loginWithGoogle={logic.loginWithGoogle} onLoadMore={logic.handleLoadMoreCallback} hasMore={infinitePhotosQuery.hasNextPage}
                  />
                </div>
              </div>
            </div>

            {(logic.activeScreen === 'manage' || logic.activeScreen === 'settings') && (
              <div className="absolute inset-0 z-20 bg-brand-bg">
                <SettingsScreen 
                  setActiveScreen={logic.setActiveScreen} saveSettings={logic.saveSettings} handleLogoUpload={logic.handleLogoUpload}
                  performPushSync={logic.performPushSync} performPullSync={logic.performPullSync} 
                  refreshCloudData={async () => logic.onRefresh()} cloudCount={logic.cloudCount} lastSyncTime={lastSyncTime}
                  isSyncing={logic.loadingType === 'sync-pull' || logic.loadingType === 'sync-push'}
                  onRunMaintenance={handleRunMaintenance}
                  isMaintenanceRunning={isMaintenanceRunning}
                />
              </div>
            )}
          </main>

          <AnimatePresence>
            {(logic.editPhotoId || logic.newPhotoData) && (
              <PhotoEditDrawer />
            )}
          </AnimatePresence>
        </div>
      </div>
      </DataLoadingContainer>
    </ErrorBoundary>
  );
};
