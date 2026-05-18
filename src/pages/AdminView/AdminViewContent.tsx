import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { withFeedback } from '../../utils/uiFeedback';
import { useErrorHandler } from '../../utils/errorHandler';
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
import { UploadProgress } from '../../components/ui/UploadProgress';

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
  const { handleError } = useErrorHandler();
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

  const lastSyncTimeStr = localStorage.getItem('lastSyncTime');
  const lastSyncTime = lastSyncTimeStr ? new Date(lastSyncTimeStr).getTime() : null;

  return (
    <ErrorBoundary key="admin-main">
      <AdminGlobalModals />
      {logic.importTotal > 0 && (
         <div className="fixed bottom-6 right-6 z-50 w-72 p-4 bg-white rounded-xl shadow-lg border">
            <UploadProgress 
                progress={(logic.importProgress / logic.importTotal) * 100} 
                fileName={`上传中 (${logic.importProgress}/${logic.importTotal})`} 
                status="uploading"
            />
         </div>
      )}
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
            saveBatchEdit={async () => {
              if (logic.checkSyncLock()) return;
              await logic.saveBatchEdit();
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
            isAdminMode={true}
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
              if (logic.checkSyncLock()) return;
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
            onBatchAiAnalyze={(photos) => logic.withLoading('analyzing', () => logic.handleGroupAiIdentify(photos)).catch(()=>{})}
            onAiAnalyze={(p) => logic.withLoading('analyzing', () => logic.handleSingleAiAnalyze(p.uri || p.image_url, p.categoryId || undefined, p.id)).catch(()=>{})}
            onToggleHidden={async (photo) => {
              if (logic.checkSyncLock()) return;
              await withFeedback(() => logic.toggleHidden(photo), '已更新隐藏状态');
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
                    toast.success('Logo 更新成功！');
                  }
                } catch (err: any) {
                  console.error(err);
                  handleError(err, 'Logo 上传失败');
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
                  await logic.saveNewPhoto();
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
          lang={lang}
          t={t}
          isFetchingNextPage={isFetchingNextPage}
          onManageClick={() => logic.setActiveScreen('manage')}
          onRefresh={() => {
            if (logic.checkSyncLock()) return;
            logic.performPullSync(true);
          }}
          onTogglePinned={logic.togglePinned}
          onToggleHidden={logic.toggleHidden}
          onSetGroupCover={logic.setGroupCover}
          onEditPhoto={(id) => logic.setEditPhotoId(id as string)}
          onLoadMore={handleLoadMoreCallback}
          hasNextPage={!!hasNextPage}
          onDeletePhotos={(ids) => {
             if (logic.checkSyncLock()) return;
             logic.handleDeletePhoto(ids);
             logic.setSelectedIds([]);
             logic.setIsMultiSelect(false);
          }}
          onGroupPhotos={async (ids) => {
             if (logic.checkSyncLock()) return;
             await logic.handleGroupPhotos(ids);
             logic.setSelectedIds([]);
             logic.setIsMultiSelect(false);
          }}
          onBatchEdit={(ids) => {
             if (logic.checkSyncLock()) return;
             logic.setBatchEditIds(ids);
          }}
          onAiAnalyze={logic.handleSingleAiAnalyze}
          onBatchAiAnalyze={logic.handleBatchAiIdentifyTrigger}
          onCancelAnalyze={logic.abortAnalysis}
          isAnalyzing={logic.loadingType === 'analyzing'}
          onImport={() => {
            if (logic.checkSyncLock()) return;
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = true;
            input.onchange = (e) => logic.handlePhotoImport(e as unknown as React.ChangeEvent<HTMLInputElement>, false).catch(()=>{});
            input.click();
          }}
        />
      )}

      {logic.activeScreen === 'home' && logic.viewMode === 'public' && (
        <div className="flex flex-col fixed inset-0 bg-brand-bg overflow-hidden">
           <div className="flex-1 min-h-0 relative bg-bg">
                <PublicGallery 
                   photos={logic.photos}
                   categories={logic.categories}
                   tags={logic.tags}
                   isAdminMode={false}
                   isStaffMode={true}
                   onTogglePinned={logic.togglePinned}
                   settings={logic.settings}
                   isRefreshing={logic.loadingType === 'sync-pull' || logic.loadingType === 'sync-push'}
                   isFetchingNextPage={isFetchingNextPage}
                   onExit={() => logic.setViewMode('private')}
                   showExit={true}
                   onRefresh={() => {
                     if (logic.checkSyncLock()) return;
                     logic.performPullSync(true);
                   }}
                   onOpenSettings={() => logic.setActiveScreen('manage')}
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
