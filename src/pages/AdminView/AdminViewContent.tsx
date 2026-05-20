import React, { useState, useEffect, useCallback } from 'react';
import { useFeedback, useAdminMode, useTasks } from '../../hooks';
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: { error: any, resetErrorBoundary: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <p className="text-red-500">页面出错了: {error.message}</p>
      <button onClick={resetErrorBoundary} className="mt-4 px-4 py-2 bg-slate-900 text-white rounded">重试</button>
    </div>
  );
}
import { AdminGlobalModals } from '../../components/admin/AdminGlobalModals';
import { ErrorLogViewer } from '../../components/admin/ErrorLogViewer';
import { BatchEditScreen } from '../../components/admin/BatchEditScreen';
import { SettingsScreen } from '../../components/SettingsScreen';
import { AdminGallery } from '../../components/admin/AdminGallery';
import { PhotoEditDrawer } from '../../components/admin/PhotoEditDrawer';
import { GroupDetailView } from '../../components/GroupDetailView';
import { MainAdminScreen } from './MainAdminScreen';
import { useAdminViewLogic } from './useAdminViewLogic';
import { User, Photo } from '../../types';
import { TranslationType } from '../../lib/ui-helpers';
import { LanguageCode } from '../../lib/translations';

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
    performPullSync: sessionValue.performPullSync
  });

  const handleLoadMoreCallback = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
       logic.performPullSync(true);
    }
  }, [hasNextPage, isFetchingNextPage, logic.performPullSync]);

  const handleManageClick = useCallback(() => logic.setActiveScreen('manage'), [logic.setActiveScreen]);
  const handleRefresh = useCallback(() => {
    if (logic.checkSyncLock()) return;
    logic.performPullSync(true);
  }, [logic.checkSyncLock, logic.performPullSync]);
  const handleToggleHidden = useCallback(async (photo) => {
    if (logic.checkSyncLock()) {
      showError(new Error('系统正在同步，请稍后再操作'), '系统忙碌');
      return;
    }
    try {
      await logic.toggleHidden(photo);
      showSuccess('已更新隐藏状态');
    } catch (e) {
      showError(e, '自动更新成功');
    }
  }, [logic.checkSyncLock, logic.toggleHidden, showSuccess, showError]);
  const handleBatchToggleHidden = useCallback(async (ids: string[]) => {
    if (logic.checkSyncLock()) return;
    const targetPhotos = logic.photos.filter(p => ids.includes(p.id));
    const allHidden = targetPhotos.every(p => p.is_hidden);
    await logic.updatePhotosBulk(ids, { is_hidden: !allHidden }, '批量更新隐藏状态');
    logic.setSelectedIds([]);
    logic.setIsMultiSelect(false);
  }, [logic.checkSyncLock, logic.photos, logic.updatePhotosBulk, logic.setSelectedIds, logic.setIsMultiSelect]);

  const handleLongPressStart = useCallback((p: Photo) => logic.onLongPressStart(p.id), [logic.onLongPressStart]);
  const handleDeleteDrawer = useCallback((id: string) => logic.handleDeletePhoto(id), [logic.handleDeletePhoto]);
  const handleEditPhoto = useCallback((id) => logic.setEditPhotoId(id as string), [logic.setEditPhotoId]);

  const handleDeletePhotos = useCallback((ids) => {
      if (logic.checkSyncLock()) return;
      logic.handleDeletePhoto(ids);
      logic.setSelectedIds([]);
      logic.setIsMultiSelect(false);
  }, [logic.checkSyncLock, logic.handleDeletePhoto, logic.setSelectedIds, logic.setIsMultiSelect]);
  const handleGroupPhotos = useCallback(async (ids) => {
      if (logic.checkSyncLock()) return;
      try {
        await logic.handleGroupPhotos(ids);
        logic.setSelectedIds([]);
        logic.setIsMultiSelect(false);
      } catch (e: any) {
        showError(e, '合组失败');
      }
  }, [logic.checkSyncLock, logic.handleGroupPhotos, logic.setSelectedIds, logic.setIsMultiSelect, showError]);
  const handleBatchEdit = useCallback((ids) => {
      if (logic.checkSyncLock()) return;
      logic.setBatchEditIds(ids);
  }, [logic.checkSyncLock, logic.setBatchEditIds]);

  const handleUngroup = useCallback(async (groupId) => { 
    if (logic.checkSyncLock()) return;
    try {
      await logic.handleUngroup(groupId); 
    } catch (e: any) {
      showError(e, '拆组失败');
    }
  }, [logic.checkSyncLock, logic.handleUngroup, showError]);

  const handleBatchAiAnalyze = useCallback((photos) => {
    logic.withLoading('analyzing', () => logic.handleGroupAiIdentify(photos))
      .catch((e: Error) => { 
        console.error('Batch AI Analyze failed', e); 
        showError(e, '识别失败'); 
      });
  }, [logic.withLoading, logic.handleGroupAiIdentify, showError]);

  const handleAiAnalyze = useCallback((p) => {
    console.log('AI Analyze called. Photo:', p.id);
    return logic.handleSingleAiAnalyze(p.uri || p.image_url, p.categoryId || undefined, p.id)
      .catch((e: Error) => showError(e, '识别失败'));
  }, [logic.handleSingleAiAnalyze, showError]);

  const handleUpdatePhoto = useCallback(async (id, updates) => {
    if (logic.checkSyncLock()) return;
    try {
      await logic.updatePhoto(id, updates);
    } catch (e: any) {
      showError(e, '更新照片属性失败');
    }
  }, [logic.checkSyncLock, logic.updatePhoto, showError]);

  const handleSaveSettings = useCallback(async (s) => {
    if (logic.checkSyncLock()) return { success: false };
    return await logic.saveSettings(s);
  }, [logic.checkSyncLock, logic.saveSettings]);

  const handleLogoUpload = useCallback(async (e) => {
    if (logic.checkSyncLock()) return;
    const file = e.target.files?.[0];
    if (!file) return;

    await logic.withLoading('global', async () => {
      try {
        const { uploadLogo } = await import('../../services/settingService');
        const url = await uploadLogo(file);
        if (url && logic.settings) {
          const newSettings = { ...logic.settings, logo_url: url };
          await logic.saveSettings(newSettings);
          showSuccess('Logo 更新成功！');
        }
      } catch (err: any) {
        showError(err, 'Logo 上传失败');
      }
    });
  }, [logic.checkSyncLock, logic.withLoading, logic.settings, logic.saveSettings, showSuccess, showError]);

  const handlePerformPushSync = useCallback(async () => { 
    try {
      await logic.withLoading('sync-push', async () => { 
        await logic.performPushSync(true); 
      }); 
      showSuccess('成功备份至云端！');
      return { success: true } as any; 
    } catch (err: any) {
      showError(err, '同步备份失败');
      throw err;
    }
  }, [logic.withLoading, logic.performPushSync, showSuccess, showError]);

  const handlePerformPullSync = useCallback(async () => { 
    try {
      await logic.performPullSync(true); 
      showSuccess('成功自云端恢复！');
      return { success: true } as any; 
    } catch (err: any) {
      showError(err, '云端恢复失败');
      throw err;
    }
  }, [logic.performPullSync, showSuccess, showError]);

  const handleRefreshCloudData = useCallback(async (user, force) => {
    await logic.onRefresh();
  }, [logic.onRefresh]);

  const handleSaveNewPhoto = useCallback(async () => {
    if (logic.checkSyncLock()) return;
    try {
      await logic.saveNewPhoto();
      showSuccess('照片已保存');
    } catch (e) {
      showError(e, '保存照片失败');
    }
  }, [logic.checkSyncLock, logic.saveNewPhoto, showSuccess, showError]);

  const handleDeletePhotoSingle = useCallback(async (photo: Photo) => {
    if (logic.checkSyncLock()) return;
    await logic.handleDeletePhoto(photo.id);
  }, [logic.checkSyncLock, logic.handleDeletePhoto]);
  const handleImport = useCallback(() => {
    if (logic.checkSyncLock()) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => logic.handlePhotoImport(e as unknown as React.ChangeEvent<HTMLInputElement>, false).catch((err: Error) => showError(err, '导入图片失败'));
    input.click();
  }, [logic.checkSyncLock, logic.handlePhotoImport]);

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
    }, [logic.checkSyncLock, logic.performPullSync]);
  const handleOpenSettingsPublic = useCallback(() => logic.setActiveScreen('manage'), [logic.setActiveScreen]);

  const lastSyncTimeStr = localStorage.getItem('lastSyncTime');
  const lastSyncTime = lastSyncTimeStr ? new Date(lastSyncTimeStr).getTime() : null;

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} key="admin-main">
      <AdminGlobalModals />
      <div className="px-6 pb-6">
         <ErrorLogViewer />
      </div>

      <React.Suspense fallback={
        <div className="flex flex-col items-center justify-center h-screen bg-brand-bg gap-4">
          <div className="w-8 h-8 border-[1px] border-brand-navy/10 border-t-brand-gold rounded-full animate-spin" />
          <span className="text-[10px] font-bold text-brand-navy/30 uppercase tracking-widest">Loading Component</span>
        </div>
      }>
        {logic.batchEditIds && (
          <BatchEditScreen 
            resetAddState={logic.resetAddState}
            saveBatchEdit={logic.saveBatchEditWithSuccess}
            batchEditIds={logic.batchEditIds}
            formState={logic.formState}
            updateForm={logic.updateForm}
            batchIsHiddenApplied={logic.batchIsHiddenApplied}
            setBatchIsHiddenApplied={logic.setBatchIsHiddenApplied}
            showOtherFields={logic.showOtherFields}
            setShowOtherFields={logic.setShowOtherFields}
            quickAddManufacturer={logic.quickAddManufacturer}
            quickAddTag={logic.quickAddTag}
            updateTag={logic.updateTag}
            deleteTag={logic.deleteTag}
            addTag={logic.addTag}
            onDelete={logic.handleDeletePhoto}
          />
        )}
        
        {logic.activeGroupId && (
          <GroupDetailView
            activeGroupId={logic.activeGroupId}
            setActiveGroupId={logic.setActiveGroupId}
            setAlertDialog={logic.setAlertDialog}
            photos={logic.photos}
            displayPhotos={logic.photos.filter((p: Photo) => p.groupId === logic.activeGroupId)}
            setLightboxIndex={logic.setLightboxIndex}
            isStaffMode={true}
            onEditPhoto={handleEditPhoto}
            onLongPressStart={handleLongPressStart}
            onLongPressEnd={logic.onLongPressEnd}
            onBatchEdit={handleBatchEdit}
            onUngroup={handleUngroup}
            onAddPhotoToGroup={handleImport}
            lang={lang}
            t={t}
            categories={logic.categories}
            manufacturers={logic.manufacturers}
            allTags={logic.tags}
            tagMap={logic.tagIdToNameMap}
            onBatchAiAnalyze={handleBatchAiAnalyze}
            onAiAnalyze={handleAiAnalyze}
            onToggleHidden={handleToggleHidden}
            updatePhoto={handleUpdatePhoto}
          />
        )}
  
        {logic.activeScreen === 'manage' && (
          <SettingsScreen 
            setActiveScreen={logic.setActiveScreen}
            saveSettings={handleSaveSettings}
            handleLogoUpload={handleLogoUpload}
            performPushSync={handlePerformPushSync}
            performPullSync={handlePerformPullSync}
            refreshCloudData={handleRefreshCloudData}
            cloudCount={logic.cloudCount}
            lastSyncTime={lastSyncTime}
            isSyncing={logic.loadingType === 'sync-pull' || logic.loadingType === 'sync-push'}
          />
        )}
  
        {(logic.editPhotoId || logic.newPhotoData) && (
            <PhotoEditDrawer 
                photos={logic.photos}
                editPhotoId={logic.editPhotoId} 
                resetAddState={logic.resetAddState} 
                saveNewPhoto={handleSaveNewPhoto}
                formState={logic.formState}
                updateForm={logic.updateForm}
                showOtherFields={logic.showOtherFields} 
                setShowOtherFields={logic.setShowOtherFields}
                newPhotoData={logic.newPhotoData} 
                setNewPhotoData={logic.setNewPhotoData}
                onDelete={handleDeleteDrawer}                editPhotoPreview={logic.editPhotoId ? logic.photos.find((p: Photo) => p.id === logic.editPhotoId)?.image_url || logic.photos.find((p: Photo) => p.id === logic.editPhotoId)?.uri : null}
                abortAnalysis={logic.abortAnalysis}
                handleSingleAiAnalyze={logic.handleSingleAiAnalyze}
                handleTranslate={logic.handleTranslate}
                t={t}
            />
        )}
      </React.Suspense>
      
      {logic.activeScreen === 'home' && logic.viewMode === 'private' && (
        <MainAdminScreen 
          {...logic}
          user={user}
          isAdmin={isAdminMode}
          lang={lang}
          t={t}
          isFetchingNextPage={isFetchingNextPage}
          onManageClick={handleManageClick}
          onRefresh={handleRefresh}
          onTogglePinned={logic.togglePinned}
          onToggleHidden={handleToggleHidden}
          onSetGroupCover={logic.setGroupCover}
          onEditPhoto={handleEditPhoto}
          onLoadMore={handleLoadMoreCallback}
          hasNextPage={!!hasNextPage}
          onDeletePhotos={handleDeletePhotos}
          onGroupPhotos={handleGroupPhotos}
          onBatchEdit={handleBatchEdit}
          onBatchToggleHidden={handleBatchToggleHidden}
          onAiAnalyze={handleAiAnalyze}
          onBatchAiAnalyze={logic.handleBatchAiIdentifyTrigger}
          onCancelAnalyze={logic.abortAnalysis}
          isAnalyzing={logic.loadingType === 'analyzing'}
          onImport={handleImport}
        />
      )}

      {logic.activeScreen === 'home' && logic.viewMode === 'public' && (
        <div className="flex flex-col fixed inset-0 bg-brand-bg overflow-hidden">
           <div className="flex-1 min-h-0 relative bg-bg">
                <PublicGallery 
                   photos={logic.photos}
                   categories={logic.categories}
                   tags={logic.tags}
                   settings={logic.settings}
                   isRefreshing={logic.loadingType === 'sync-pull' || logic.loadingType === 'sync-push'}
                   isFetchingNextPage={isFetchingNextPage}
                   onExit={handleExitPublic}
                   showExit={true}
                   onRefresh={handleRefreshPublic}
                   hideHeader={false}
                   columns={logic.columns}
                   setColumns={logic.setColumns}
                   totalCount={logic.cloudCount}
                   user={user}
                   loginWithGoogle={logic.loginWithGoogle}
                   onLoadMore={handleLoadMoreCallback}
                   hasMore={hasNextPage}
                />
           </div>
        </div>
      )}
    </ErrorBoundary>
  );
};
