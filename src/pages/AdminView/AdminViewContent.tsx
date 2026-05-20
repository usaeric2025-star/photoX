import React, { useState, useEffect, useCallback } from 'react';
import { useFeedback, useAdminMode } from '../../hooks';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { AdminGlobalModals } from '../../components/admin/AdminGlobalModals';
import { ErrorLogViewer } from '../../components/admin/ErrorLogViewer';
import { BatchEditScreen } from '../../components/admin/BatchEditScreen';
import { SettingsScreen } from '../../components/SettingsScreen';
import { PublicGallery } from '../../components/PublicGallery';
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
  errorContent: React.ReactNode;
  t: TranslationType;
  lang: LanguageCode;
  sessionValue: any;
  photoValue: any;
  uiValue: any;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
}

export const AdminViewContent: React.FC<Props> = ({ 
  user, errorContent, t, lang, sessionValue, photoValue, uiValue, hasNextPage, isFetchingNextPage 
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
  const handleEditPhoto = useCallback((id) => logic.setEditPhotoId(id as string), [logic.setEditPhotoId]);
  const handleDeletePhotos = useCallback((ids) => {
      if (logic.checkSyncLock()) return;
      logic.handleDeletePhoto(ids);
      logic.setSelectedIds([]);
      logic.setIsMultiSelect(false);
  }, [logic.checkSyncLock, logic.handleDeletePhoto, logic.setSelectedIds, logic.setIsMultiSelect]);
  const handleGroupPhotos = useCallback(async (ids) => {
      if (logic.checkSyncLock()) return;
      await logic.handleGroupPhotos(ids);
      logic.setSelectedIds([]);
      logic.setIsMultiSelect(false);
  }, [logic.checkSyncLock, logic.handleGroupPhotos, logic.setSelectedIds, logic.setIsMultiSelect]);
  const handleBatchEdit = useCallback((ids) => {
      if (logic.checkSyncLock()) return;
      logic.setBatchEditIds(ids);
  }, [logic.checkSyncLock, logic.setBatchEditIds]);
  const handleImport = useCallback(() => {
    if (logic.checkSyncLock()) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => logic.handlePhotoImport(e as unknown as React.ChangeEvent<HTMLInputElement>, false).catch(()=>{});
    input.click();
  }, [logic.checkSyncLock, logic.handlePhotoImport]);

  const handleExitPublic = useCallback(() => logic.setViewMode('private'), [logic.setViewMode]);
  const handleRefreshPublic = useCallback(() => {
      if (logic.checkSyncLock()) return;
      logic.performPullSync(true);
    }, [logic.checkSyncLock, logic.performPullSync]);
  const handleOpenSettingsPublic = useCallback(() => logic.setActiveScreen('manage'), [logic.setActiveScreen]);

  const lastSyncTimeStr = localStorage.getItem('lastSyncTime');
  const lastSyncTime = lastSyncTimeStr ? new Date(lastSyncTimeStr).getTime() : null;

  return (
    <ErrorBoundary key="admin-main">
      <AdminGlobalModals />
      {errorContent}
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
            saveBatchEdit={async (batchIsHiddenApplied) => {
              if (logic.checkSyncLock()) return;
              try {
                await logic.saveBatchEdit(batchIsHiddenApplied);
                showSuccess('批量更新成功');
              } catch (e) {
                showError(e, '批量编辑照片失败');
              }
            }}
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
            onDelete={async (ids) => {
              if (logic.checkSyncLock()) return;
              await logic.handleDeletePhoto(ids);
            }}
          />
        )}
        
        {logic.activeGroupId && (
          <GroupDetailView
            activeGroupId={logic.activeGroupId}
            setActiveGroupId={logic.setActiveGroupId}
            setAlertDialog={logic.setAlertDialog}
            photos={logic.photos}
            displayPhotos={logic.photos.filter((p: Photo) => p.groupId === logic.activeGroupId)}
            setLightboxIndex={() => {}}
            isStaffMode={true}
            onEditPhoto={(p) => logic.setEditPhotoId(p.id)}
            onLongPressStart={() => {}}
            onLongPressEnd={() => {}}
            onBatchEdit={(ids) => { logic.setBatchEditIds(ids); }}
            onUngroup={async (groupId) => { 
              if (logic.checkSyncLock()) return;
              await logic.handleUngroup(groupId); 
            }}
            onAddPhotoToGroup={() => {
              console.log("Add photo button clicked");
              // if (logic.checkSyncLock()) return;
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.multiple = true;
              input.onchange = (e) => logic.handlePhotoImport(e as unknown as React.ChangeEvent<HTMLInputElement>, false).catch(()=>{});
              input.click();
            }}
            lang={lang}
            t={t}
            categories={logic.categories}
            manufacturers={logic.manufacturers}
            allTags={logic.tags}
            tagMap={logic.tagIdToNameMap}
            onBatchAiAnalyze={(photos) => logic.withLoading('analyzing', () => logic.handleGroupAiIdentify(photos)).catch((e: Error) => { console.error('Batch AI Analyze failed', e); showError(e, '识别失败'); })}
            onAiAnalyze={(p) => {
                console.log('AI Analyze called for photo:', p.id, p);
                return logic.withLoading('analyzing', () => logic.handleSingleAiAnalyze(p.uri || p.image_url, p.categoryId || undefined, p.id)).catch((e: Error) => { console.error('AI Analyze failed', e); showError(e, '识别失败'); })
            }}
            onToggleHidden={async (photo) => {
              if (logic.checkSyncLock()) {
                showError(new Error('系统正在同步，请稍后再操作'), '系统忙碌');
                return;
              }
              try {
                await logic.toggleHidden(photo);
                showSuccess('已更新隐藏状态');
              } catch (e) {
                showError(e, '切换照片隐藏状态失败');
              }
            }}
            updatePhoto={async (id, updates) => {
              if (logic.checkSyncLock()) return;
              await logic.updatePhoto(id, updates);
            }}
          />
        )}
  
        {logic.activeScreen === 'manage' && (
          <SettingsScreen 
            setActiveScreen={logic.setActiveScreen}
            saveSettings={async (s) => {
              if (logic.checkSyncLock()) return { success: false };
              return await logic.saveSettings(s);
            }}
            handleLogoUpload={async (e) => {
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
            }}
            performPushSync={async () => { 
              await logic.withLoading('sync-push', async () => { 
                await logic.performPushSync(true); 
              }); 
              return { success: true } as any; 
            }}
            performPullSync={async () => { 
              await logic.performPullSync(true); 
              return { success: true } as any; 
            }}
            refreshCloudData={async (user, force) => {
              await logic.onRefresh();
            }}
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
                saveNewPhoto={async () => {
                  if (logic.checkSyncLock()) return;
                  try {
                    await logic.saveNewPhoto();
                    showSuccess('照片已保存');
                  } catch (e) {
                    showError(e, '保存照片失败');
                  }
                }}
                formState={logic.formState}
                updateForm={logic.updateForm}
                showOtherFields={logic.showOtherFields} 
                setShowOtherFields={logic.setShowOtherFields}
                newPhotoData={logic.newPhotoData} 
                setNewPhotoData={logic.setNewPhotoData}
                onDelete={async (id) => {
                  if (logic.checkSyncLock()) return;
                  await logic.handleDeletePhoto(id);
                }}
                editPhotoPreview={logic.editPhotoId ? logic.photos.find((p: Photo) => p.id === logic.editPhotoId)?.image_url || logic.photos.find((p: Photo) => p.id === logic.editPhotoId)?.uri : null}
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
          onAiAnalyze={logic.handleSingleAiAnalyze}
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
                   isStaffMode={true}
                   onTogglePinned={logic.togglePinned}
                   settings={logic.settings}
                   isRefreshing={logic.loadingType === 'sync-pull' || logic.loadingType === 'sync-push'}
                   isFetchingNextPage={isFetchingNextPage}
                   onExit={handleExitPublic}
                   showExit={true}
                   onRefresh={handleRefreshPublic}
                   onOpenSettings={handleOpenSettingsPublic}
                   hideHeader={false}
                   columns={logic.columns}
                   setColumns={logic.setColumns}
                   totalCount={logic.cloudCount}
                   user={user}
                   loginWithGoogle={logic.loginWithGoogle}
                   onLoadMore={handleLoadMoreCallback}
                   hasMore={hasNextPage}
                   onAiAnalyze={(p) => logic.withLoading('analyzing', () => logic.handleSingleAiAnalyze(p.uri || p.image_url, p.categoryId || undefined, p.id)).catch(()=>{})}
                   onCancelAnalyze={logic.abortAnalysis}
                   isAnalyzing={logic.loadingType === 'analyzing'}
                />
           </div>
        </div>
      )}
    </ErrorBoundary>
  );
};
