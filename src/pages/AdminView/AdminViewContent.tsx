import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFeedback, useAdminMode, useTasks } from '@/hooks';
import { ErrorBoundary } from 'react-error-boundary';
import { AdminGlobalModals } from '@/components/admin/AdminGlobalModals';
import { ErrorLogViewer } from '@/components/admin/ErrorLogViewer';
import { BatchEditScreen } from '@/components/admin/BatchEditScreen';
import { SettingsScreen } from '@/components/SettingsScreen';
import { PhotoEditDrawer } from '@/components/admin/PhotoEditDrawer';
import { GroupDetailView } from '@/components/GroupDetailView';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { MainAdminScreen } from './MainAdminScreen';
import { PublicGallery } from '@/components/public/PublicGallery';
import { useAdminViewLogic } from './useAdminViewLogic';
import { useAdminActions } from './useAdminActions';
import { User, Photo } from '@/types';
import { TranslationType } from '@/lib/ui-helpers';
import { LanguageCode } from '@/lib/translations';

function ErrorFallback({ error, resetErrorBoundary }: { error: any, resetErrorBoundary: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <p className="text-red-500">页面出错了: {error.message}</p>
      <button onClick={resetErrorBoundary} className="mt-4 px-4 py-2 bg-slate-900 text-white rounded">重试</button>
    </div>
  );
}

interface Props {
  user: User | null;
  authChecked: boolean;
  logout: () => void;
  t: TranslationType;
  lang: LanguageCode;
  sessionValue: any;
  photoValue: any;
  uiValue: any;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
}

export const AdminViewContent: React.FC<Props> = ({ 
  user, t, lang, sessionValue, photoValue, uiValue, hasNextPage, isFetchingNextPage 
}) => {
  const { showError, showSuccess } = useFeedback();
  const isAdminMode = useAdminMode();
  const logic = useAdminViewLogic({
    user, sessionValue, photoValue, uiValue,
    onRefresh: sessionValue.onRefresh,
    performPullSync: sessionValue.performPullSync,
    hasNextPage,
    isFetchingNextPage
  });

  const actions = useAdminActions(logic);
  const { tasks, cancelTask } = useTasks();

  const handleExitPublic = useCallback(() => {
    logic.setSelectedIds([]);
    logic.setIsMultiSelect(false);
    tasks.filter(t => t.status === 'running').forEach(t => cancelTask(t.id));
    logic.setViewMode('private');
  }, [logic, tasks, cancelTask]);

  const handleRefreshPublic = useCallback(() => {
    if (logic.checkSyncLock()) return;
    logic.performPullSync(true);
  }, [logic]);

  const lastSyncTime = localStorage.getItem('lastSyncTime') ? new Date(localStorage.getItem('lastSyncTime')!).getTime() : null;

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} key="admin-main">
      <AdminGlobalModals />
      
      <div className="flex h-screen overflow-hidden bg-brand-bg">
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
          <div className="px-6 pt-4"><ErrorLogViewer /></div>

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
            
            {logic.activeGroupId && (
              <GroupDetailView
                activeGroupId={logic.activeGroupId} setActiveGroupId={logic.setActiveGroupId} setAlertDialog={logic.setAlertDialog}
                photos={logic.photos} displayPhotos={logic.groupPhotos} initialPhotoId={logic.initialPhotoId}
                setLightboxIndex={logic.setLightboxIndex} isStaffMode={true}
                onEditPhoto={(p: Photo) => actions.handleEditPhoto(p.id)} onLongPressStart={(p: Photo) => logic.onLongPressStart(p.id)} onLongPressEnd={logic.onLongPressEnd}
                onBatchEdit={actions.handleBatchEdit} onUngroup={actions.handleUngroup} onAddPhotoToGroup={actions.handleImport}
                lang={lang} t={t} categories={logic.categories} manufacturers={logic.manufacturers} allTags={logic.tags} tagMap={logic.tagIdToNameMap}
                onBatchAiAnalyze={actions.handleBatchAiAnalyze} onAiAnalyze={actions.handleAiAnalyze} onToggleHidden={actions.handleToggleHidden} updatePhoto={actions.handleUpdatePhoto}
              />
            )}
          </React.Suspense>

          <main className="flex-1 relative overflow-hidden">
            {/* We keep MainAdminScreen and PublicGallery mounted to preserve scroll position and avoid flickering */}
            <div 
              className={`absolute inset-0 transition-opacity duration-200 ease-out ${logic.activeScreen === 'home' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
            >
              <div className={`absolute inset-0 transition-opacity duration-300 ${logic.viewMode === 'private' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                <MainAdminScreen 
                  {...logic} user={user} isAdmin={isAdminMode} lang={lang} t={t} isFetchingNextPage={isFetchingNextPage}
                  onManageClick={actions.handleManageClick} onRefresh={actions.handleRefresh} onTogglePinned={logic.togglePinned}
                  onToggleHidden={actions.handleToggleHidden} onSetGroupCover={logic.setGroupCover} onEditPhoto={actions.handleEditPhoto}
                  onLoadMore={actions.handleLoadMoreCallback} hasNextPage={!!hasNextPage}
                  onDeletePhotos={actions.handleDeletePhotos} onGroupPhotos={actions.handleGroupPhotos} onBatchEdit={actions.handleBatchEdit}
                  onBatchToggleHidden={actions.handleBatchToggleHidden} onAiAnalyze={actions.handleAiAnalyze}
                  onBatchAiAnalyze={logic.handleBatchAiIdentifyTrigger} onCancelAnalyze={logic.abortAnalysis} isAnalyzing={logic.loadingType === 'analyzing'} onImport={actions.handleImport}
                />
              </div>
              <div className={`absolute inset-0 transition-opacity duration-300 ${logic.viewMode === 'public' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                <div className="flex flex-col h-full bg-bg">
                  <PublicGallery 
                    photos={logic.photos} categories={logic.categories} tags={logic.tags} settings={logic.settings}
                    isRefreshing={logic.loadingType === 'sync-pull' || logic.loadingType === 'sync-push'} isFetchingNextPage={isFetchingNextPage}
                    onExit={handleExitPublic} showExit={true} onRefresh={handleRefreshPublic}
                    columns={logic.columns} setColumns={logic.setColumns} totalCount={logic.cloudCount}
                    user={user} loginWithGoogle={logic.loginWithGoogle} onLoadMore={actions.handleLoadMoreCallback} hasMore={hasNextPage}
                  />
                </div>
              </div>
            </div>

            {logic.activeScreen === 'manage' && (
              <div className="absolute inset-0 z-20 bg-brand-bg">
                <SettingsScreen 
                  setActiveScreen={logic.setActiveScreen} saveSettings={logic.saveSettings} handleLogoUpload={actions.handleLogoUpload}
                  performPushSync={actions.handlePerformPushSync} performPullSync={actions.handlePerformPullSync} 
                  refreshCloudData={async () => logic.onRefresh()} cloudCount={logic.cloudCount} lastSyncTime={lastSyncTime}
                  isSyncing={logic.loadingType === 'sync-pull' || logic.loadingType === 'sync-push'}
                />
              </div>
            )}
          </main>

          <AnimatePresence>
            {(logic.editPhotoId || logic.newPhotoData) && (
              <PhotoEditDrawer 
                photos={logic.photos} editPhotoId={logic.editPhotoId} resetAddState={logic.resetAddState} 
                saveNewPhoto={actions.handleSaveNewPhoto} formState={logic.formState} updateForm={logic.updateForm}
                showOtherFields={logic.showOtherFields} setShowOtherFields={logic.setShowOtherFields}
                newPhotoData={logic.newPhotoData} setNewPhotoData={logic.setNewPhotoData}
                onDelete={(id) => logic.handleDeletePhoto(id)}
                editPhotoPreview={logic.editPhotoId ? logic.photos.find((p: Photo) => p.id === logic.editPhotoId)?.image_url || logic.photos.find((p: Photo) => p.id === logic.editPhotoId)?.uri : null}
                abortAnalysis={logic.abortAnalysis} handleSingleAiAnalyze={logic.handleSingleAiAnalyze} handleTranslate={logic.handleTranslate} t={t}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </ErrorBoundary>
  );
};
