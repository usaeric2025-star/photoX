import { toast } from 'sonner';
import React, { useState, useEffect, useCallback } from 'react';
import { loginWithGoogle } from '../services/supabaseService';
import { ErrorBoundary } from '../components/ErrorBoundary';

import { AdminHeader } from '../components/admin/AdminHeader';
import { FloatingActionButton } from '../components/admin/FloatingActionButton';
import { PublicGallery } from '../components/PublicGallery';
import { GroupDetailView } from '../components/GroupDetailView';
import { AdminGlobalModals } from '../components/admin/AdminGlobalModals';
import { ErrorLogViewer } from '../components/admin/ErrorLogViewer';
import { BatchEditScreen } from '../components/admin/BatchEditScreen';
import { SettingsScreen } from '../components/SettingsScreen';
import { 
  useDeletePhoto,
  useUpdatePhoto,
  useGroupPhotosMutation,
  useUngroupMutation,
  useAddTagMutation,
  useUpdateTagMutation,
  useDeleteTagMutation,
  useAddCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useAddManufacturerMutation,
  useUpdateManufacturerMutation,
  useDeleteManufacturerMutation,
  useSettingsMutation,
  useBatchEditMutation,
  useSyncMutation,
  useCategoriesQuery,
  useTagsQuery,
  useManufacturersQuery,
  useGroupsQuery,
  useAdminCategory,
  useAdminCore,
  usePhotoManagement,
  useErrorHandler,
  useAdminDialogs,
  useLoading
} from '../hooks';

import { PhotoEditDrawer } from '../components/admin/PhotoEditDrawer';

import { usePermission } from '../hooks/usePermission';
import { Photo, Category, Tag, Manufacturer, User } from '../types';
import { LanguageCode } from '../lib/translations';
import { useGalleryStore } from '../store';
import { PAGINATION } from '../constants/config';


export function AdminViewContent({ user, logout, errorContent, t, lang, sessionValue, photoValue, uiValue, hasNextPage, isFetchingNextPage }: { 
  user: User | null, 
  authChecked: boolean, 
  logout: () => void, 
  errorContent: React.ReactNode,
  t: any,
  lang: LanguageCode,
  sessionValue: any,
  photoValue: any,
  uiValue: any,
  hasNextPage?: boolean,
  isFetchingNextPage?: boolean
}) {
  const { 
    gridPhotos, displayPhotos, isMultiSelect, setIsMultiSelect, selectedIds, setSelectedIds,
    setUser, setIsAdminMode,
    tagIdToNameMap, clearSelection
  } = useGalleryStore();
  
  const { 
    activeScreen, setActiveScreen, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds, 
    loadingType, setLoadingType, withLoading, cloudCount, setCloudCount,
    alertDialog, setAlertDialog, promptDialog, setPromptDialog,
    batchProgress, aiDebugInfo, setAiDebugInfo, abortAnalysis
  } = uiValue;

  const {
    settings, setSettings, viewMode, setViewMode, onRefresh, isSyncing, setIsSyncing,
    geminiApiKey, setGeminiApiKey, customModel, setCustomModel, accessPasscode, setAccessPasscode,
    performPushSync, performPullSync, saveSettings
  } = sessionValue;

  const {
    photos, categories, tags, manufacturers,
    handleSingleAiAnalyze, handleTranslate, handleBatchAiIdentify, handleGroupAiIdentify, handlePhotoImport,
    deletePhoto, handleGroupPhotos, handleUngroup, saveNewPhoto, saveBatchEdit,
    updateTag, deleteTag, updateCategory, deleteCategory, addCategory,
    addManufacturer, updateManufacturer, deleteManufacturer,
    addTag, removeTagFromPhoto, quickAddTag, quickAddManufacturer,
    deleteGroup, updatePhoto, updatePhotosBulk
  } = photoValue;

  const { handleError } = useErrorHandler();
  const { isAdmin } = usePermission();

  useEffect(() => {
    setUser(user);
    setIsAdminMode(isAdmin);
  }, [user, setUser, setIsAdminMode, isAdmin]);

  useEffect(() => {
    // @ts-ignore
    window.__debug_photos = photos;
  }, [photos]);
  
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [columns, setColumns] = useState<2 | 3 | 5>(3);
  
  const checkSyncLock = useCallback(() => {
    if (loadingType === 'sync-pull' || loadingType === 'sync-push') {
       toast.error('同步中，请稍后再试 / Syncing, please try later');
       return true;
    }
    return false;
  }, [loadingType]);

    const lastSyncTimeStr = localStorage.getItem('lastSyncTime');
  const lastSyncTime = lastSyncTimeStr ? new Date(lastSyncTimeStr).getTime() : null;

  const { formState, updateForm, showOtherFields, setShowOtherFields, resetAddState, newPhotoData, setNewPhotoData } = usePhotoManagement(user, { setAlertDialog, setPromptDialog, setActiveScreen, setLoadingType, loadingType, withLoading, setCloudCount, cloudCount, editPhotoId, setEditPhotoId, batchEditIds, setBatchEditIds, abortAnalysis: () => {} }, { settings, setSettings, setIsSyncing });

  // Clear stale AI errors when entering edit mode, unless we are currently analyzing
  useEffect(() => {
    if (editPhotoId && loadingType !== 'analyzing') {
       setAiDebugInfo(null);
    }
  }, [editPhotoId, loadingType, setAiDebugInfo]);

  const handleBatchAiIdentifyTrigger = async () => {
    if (checkSyncLock()) return;
    if (loadingType === 'analyzing') {
      abortAnalysis();
    } else {
      try {
        await withLoading('analyzing', () => handleBatchAiIdentify(displayPhotos));
      } catch (err) {
        handleError(err, 'ai-analyze');
      }
    }
  };
  
  const handleLoadMoreCallback = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
       performPullSync(true); // Pass true to fetch next page
    }
  }, [hasNextPage, isFetchingNextPage, performPullSync]);

  const [batchIsHiddenApplied, setBatchIsHiddenApplied] = useState(false);
  
  const handleDeletePhoto = useCallback(async (id: string) => {
     try {
         await deletePhoto(id);
         toast.success('照片已成功删除');
         setEditPhotoId(null);
     } catch (error) {
         console.error('删除照片失败', error);
     }
  }, [deletePhoto, setEditPhotoId]);

  return (
    <ErrorBoundary key="admin-main">
        <AdminGlobalModals />

            {errorContent}
            <div className="px-6 pb-6">
               <ErrorLogViewer />
            </div>
      
            <React.Suspense fallback={<div className="flex items-center justify-center h-screen bg-brand-bg"><div className="w-12 h-12 border-4 border-brand-gold/20 border-t-brand-gold rounded-full animate-spin" /></div>}>
              {batchEditIds && (
                <BatchEditScreen 
                  resetAddState={() => { resetAddState(); }}
                  saveBatchEdit={async () => {
                    if (checkSyncLock()) return;
                    await saveBatchEdit();
                  }}
                  batchEditIds={batchEditIds}
                  formState={formState}
                  updateForm={updateForm}
                  batchIsHiddenApplied={batchIsHiddenApplied}
                  setBatchIsHiddenApplied={setBatchIsHiddenApplied}
                  showOtherFields={showOtherFields}
                  setShowOtherFields={setShowOtherFields}
                  quickAddManufacturer={quickAddManufacturer}
                  quickAddTag={quickAddTag}
                  updateTag={updateTag}
                  deleteTag={deleteTag}
                  onDelete={async (ids) => {
                    if (checkSyncLock()) return;
                    try {
                      await deletePhoto(ids);
                      toast.success(`已成功删除 ${ids.length} 张照片`);
                      resetAddState();
                    } catch (error) {
                      console.error('批量删除失败', error);
                    }
                  }}
                />
              )}
              
              {activeGroupId && (
                <GroupDetailView
                  activeGroupId={activeGroupId}
                  setActiveGroupId={setActiveGroupId}
                  setAlertDialog={setAlertDialog}
                  photos={photos}
                  displayPhotos={photos.filter(p => p.groupId === activeGroupId)}
                  setLightboxIndex={() => {}}
                  isAdminMode={true}
                  isStaffMode={true}
                  onEditPhoto={(p) => { setEditPhotoId(p.id); }}
                  onLongPressStart={() => {}}
                  onLongPressEnd={() => {}}
                  onBatchEdit={(ids) => { setBatchEditIds(ids); }}
                  onUngroup={async (groupId) => { 
                    if (checkSyncLock()) return;
                    await handleUngroup(groupId); 
                  }}
                  onAddPhotoToGroup={() => {
                    if (checkSyncLock()) return;
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.multiple = true;
                    input.onchange = (e) => handlePhotoImport(e as unknown as React.ChangeEvent<HTMLInputElement>, false);
                    input.click();
                  }}
                  lang={lang}
                  t={t}
                  categories={categories}
                  manufacturers={manufacturers}
                  allTags={tags}
                  tagMap={tagIdToNameMap}
                  onBatchAiAnalyze={(photos) => withLoading('analyzing', () => handleGroupAiIdentify(photos))}
                  onAiAnalyze={(p) => withLoading('analyzing', () => handleSingleAiAnalyze(p.uri || p.image_url, p.categoryId || undefined, p.id))}
                  onToggleHidden={async (photo) => {
                    if (checkSyncLock()) return;
                    const newStatus = !photo.isHidden;
                    try {
                      await updatePhoto(photo.id, { isHidden: newStatus });
                    } catch (e) {
                      console.error('切换隐藏状态失败', e);
                    }
                  }}
                  updatePhoto={async (id, updates) => {
                    if (checkSyncLock()) return;
                    await updatePhoto(id, updates);
                  }}
                />
              )}
        
              {activeScreen === 'manage' && (
                <SettingsScreen 
                  setActiveScreen={setActiveScreen}
                  saveSettings={async (s) => {
                    if (checkSyncLock()) return { success: false };
                    return await saveSettings(s);
                  }}
                  handleLogoUpload={async (e, c, t, m) => {
                    // Logic moved or using placeholder
                  }}
                  performPushSync={async () => { await withLoading('sync-push', async () => { await performPushSync(onRefresh); }); return { success: true } as any; }}
                  performPullSync={async () => { await performPullSync(onRefresh); return { success: true } as any; }}
                  refreshCloudData={onRefresh}
                  cloudCount={cloudCount}
                  lastSyncTime={lastSyncTime}
                  isSyncing={loadingType === 'sync-pull' || loadingType === 'sync-push'}
                />
              )}
        
              {(editPhotoId || newPhotoData) && (
                  <PhotoEditDrawer 
                      photos={photos}
                      editPhotoId={editPhotoId} 
                      resetAddState={resetAddState} 
                      saveNewPhoto={async () => {
                        if (checkSyncLock()) return;
                        await saveNewPhoto();
                      }}
                      formState={formState}
                      updateForm={updateForm}
                      showOtherFields={showOtherFields} 
                      setShowOtherFields={setShowOtherFields}
                      newPhotoData={newPhotoData} 
                      setNewPhotoData={setNewPhotoData}
                      onDelete={async (id) => {
                        if (checkSyncLock()) return;
                        await handleDeletePhoto(id);
                      }}
                      editPhotoPreview={editPhotoId ? photos.find(p => p.id === editPhotoId)?.image_url || photos.find(p => p.id === editPhotoId)?.uri : null}
                      abortAnalysis={abortAnalysis}
                      handleSingleAiAnalyze={handleSingleAiAnalyze}
                      handleTranslate={handleTranslate}
                  />
              )}
            </React.Suspense>
            
            {activeScreen === 'home' && viewMode === 'private' && (
              <div className="flex flex-col fixed inset-0 bg-brand-bg overflow-hidden">
                      <AdminHeader 
                          isMultiSelect={isMultiSelect}
                          selectedIds={selectedIds}
                          filteredPhotos={photos} // Using photos directly
                          setSelectedIds={setSelectedIds}
                          setIsMultiSelect={setIsMultiSelect}
                          handleBatchAiIdentifyTrigger={handleBatchAiIdentifyTrigger}
                          handleManageClick={() => setActiveScreen('manage')}
                          loginWithGoogle={loginWithGoogle}
                          onRefresh={() => {
                            if (checkSyncLock()) return;
                            performPullSync(onRefresh);
                          }}
                          photosCount={photos.length}
                          totalPhotosCount={photos.length}
                          cloudCount={cloudCount}
                          appLang={lang}
                          isAnalyzing={loadingType === 'analyzing'}
                          batchProgress={batchProgress}
                       />
                       <div className="flex-1 min-h-0 relative">
                          <PublicGallery 
                             photos={photos}
                             categories={categories}
                             tags={tags}
                             isAdminMode={true}
                             isStaffMode={true}
                             onTogglePinned={async (photo) => {
                               if (checkSyncLock()) return;
                               const newStatus = !photo.isPinned;
                               const affectedPhotos = photo.groupId 
                                 ? photos.filter(p => p.groupId === photo.groupId)
                                 : [photo];
                               import('../services/photoMutationService').then(async (m) => {
                                 try {
                                   await Promise.all(
                                     affectedPhotos.map(p => 
                                       m.updatePhoto(p.id, { isPinned: newStatus })
                                     )
                                   );
                                 } catch (e: any) {
                                   console.error('置顶状态切换失败', e);
                                 }
                               });
                             }}
                             settings={settings}
                             isRefreshing={loadingType === 'sync-pull' || loadingType === 'sync-push' || isFetchingNextPage}
                             hideHeader={true}
                             columns={columns}
                             setColumns={setColumns}
                             totalCount={cloudCount}
                             user={user}
                             loginWithGoogle={loginWithGoogle}
                             onEditPhoto={(id) => setEditPhotoId(id as string)}
                             onLoadMore={handleLoadMoreCallback}
                             hasMore={hasNextPage}
                          />
                          <FloatingActionButton 
                            onClick={() => {
                              if (checkSyncLock()) return;
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.multiple = true;
                              input.onchange = (e) => handlePhotoImport(e as unknown as React.ChangeEvent<HTMLInputElement>, false);
                              input.click();
                            }}
                            title={t.addPhoto}
                          />
                       </div>
                    </div>
            )}

            {activeScreen === 'home' && viewMode === 'public' && (
              <div className="flex flex-col fixed inset-0 bg-brand-bg overflow-hidden">
                 <div className="flex-1 min-h-0 relative bg-bg">
                      <PublicGallery 
                         photos={photos}
                         categories={categories}
                         tags={tags}
                         isAdminMode={false}
                         isStaffMode={true}
                         onTogglePinned={async (photo) => {
                           if (checkSyncLock()) return;
                           const newStatus = !photo.isPinned;
                           const affectedPhotos = photo.groupId 
                             ? photos.filter(p => p.groupId === photo.groupId)
                             : [photo];
                           import('../services/photoMutationService').then(async (m) => {
                             try {
                               await Promise.all(
                                 affectedPhotos.map(p => 
                                   m.updatePhoto(p.id, { isPinned: newStatus })
                                 )
                               );
                             } catch (e: any) {
                               console.error('置顶状态切换失败', e);
                             }
                           });
                         }}
                         settings={settings}
                         isRefreshing={loadingType === 'sync-pull' || loadingType === 'sync-push' || isFetchingNextPage}
                         onExit={() => setViewMode('private')}
                         showExit={true}
                         onRefresh={() => {
                           if (checkSyncLock()) return;
                           performPullSync(onRefresh);
                         }}
                         hideHeader={false}
                         columns={columns}
                         setColumns={setColumns}
                         totalCount={cloudCount}
                         user={user}
                         loginWithGoogle={loginWithGoogle}
                         onLoadMore={handleLoadMoreCallback}
                         hasMore={hasNextPage}
                      />
                 </div>
              </div>
            )}
    </ErrorBoundary>
  );
}
