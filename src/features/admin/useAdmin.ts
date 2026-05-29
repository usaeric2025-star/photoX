import { usePhotoGallery } from '@/features/photos/usePhotoGallery';
import { useFilters } from '@/features/filters/useFilters';
import { useAdminActions } from '@/features/admin/useAdminActions';
import { useGroupView } from '@/features/groups/useGroupView';
import { useAuth } from '@/hooks/core/auth/useAuth';
import { useGalleryStore, useShallow } from '@/store';
import { useSyncMutation, useTasks } from '@/hooks';
import { Photo, Category, Tag, Manufacturer } from '@/types';
import { translations } from '@/lib/translations';

export function useAdmin() {
  const { user, isLoading: isLoadingAuth, loginWithGoogle } = useAuth();
  const { photos, isLoading: isLoadingPhotos, loadMore, refetch } = usePhotoGallery();
  const { filters } = useFilters();
  const adminActions = useAdminActions();
  const { groupPhotos } = useGroupView(filters.categoryId || null);
  const { mutateAsync: syncMut } = useSyncMutation();
  const { tasks } = useTasks();

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
    isPhotoPickerOpen: s.isPhotoPickerOpen,
    setIsPhotoPickerOpen: s.setIsPhotoPickerOpen,
    photoPickerGroupId: s.photoPickerGroupId,
    appLang: s.appLang,
  })));

  const isSyncing = tasks.some(t => t.status === 'running' && (t.name.includes('同步') || t.name.includes('Sync')));

  return {
    user,
    isLoadingAuth,
    authChecked: !isLoadingAuth,
    photos,
    isLoading: isLoadingPhotos,
    loadMore,
    refetch,
    filters,
    ...adminActions,
    groupPhotos,
    activeGroupId: store.activeGroupId,
    setActiveGroupId: store.setActiveGroupId,
    activeScreen: store.activeScreen,
    setActiveScreen: store.setActiveScreen,
    adminPreviewMode: store.viewMode,
    setAdminPreviewMode: store.setViewMode,
    loginWithGoogle,
    isSyncing,
    onRefresh: () => syncMut('pull'),
    performPullSync: () => syncMut('pull'),
    cloudCount: 0, // Placeholder
    isLoadingPhotos,
    handleManageClick: () => store.setActiveScreen('manage'),
    handleImport: (...args: any[]) => {}, 
    handlePhotoImport: (...args: any[]) => {},
    editPhotoId: store.editPhotoId,
    newPhotoData: store.newPhotoData,
    batchEditIds: store.batchEditingIds,
    setBatchEditIds: store.setBatchEditingIds,
    setLightboxIndex: store.setLightboxIndex,
    isPhotoPickerOpen: store.isPhotoPickerOpen,
    setIsPhotoPickerOpen: store.setIsPhotoPickerOpen,
    photoPickerGroupId: store.photoPickerGroupId,
    appLang: store.appLang,
    
    checkSyncLock: () => isSyncing,
    togglePinned: async (photo: Photo) => adminActions.updatePhoto(photo.id, { is_pinned: !photo.is_pinned }),
    onTogglePinned: async (photo: Photo) => adminActions.updatePhoto(photo.id, { is_pinned: !photo.is_pinned }),
    handleDeletePhoto: adminActions.deletePhoto,
    onDeletePhoto: adminActions.deletePhoto,
    handleDeletePhotos: adminActions.deletePhoto,
    handleUpdatePhoto: adminActions.updatePhoto,
    onUpdatePhoto: adminActions.updatePhoto,
    handleUpdatePhotosBulk: (ids: string[], updates: Partial<Photo>) => adminActions.batchUpdate.mutateAsync({ ids, updates }),
    onUpdatePhotosBulk: (ids: string[], updates: Partial<Photo>) => adminActions.batchUpdate.mutateAsync({ ids, updates }),
    handleToggleHidden: async (photo: Photo) => adminActions.updatePhoto(photo.id, { is_hidden: !photo.is_hidden }),
    onToggleHidden: async (photo: Photo) => adminActions.updatePhoto(photo.id, { is_hidden: !photo.is_hidden }),
    handleBatchToggleHidden: async (ids: string[]) => adminActions.batchUpdate.mutateAsync({ ids, updates: { is_hidden: true } }), 
    handleGroupPhotos: async (ids: string[]) => { /* impl */ },
    onGroupPhotos: async (ids: string[]) => { /* impl */ },
    handleUngroup: async (groupId: string) => { /* impl */ },
    onUngroup: async (groupId: string) => { /* impl */ },
    handleBatchAiIdentifyTrigger: async (photos: Photo[]) => { /* impl */ },
    onBatchAiAnalyze: async (photos: Photo[]) => { /* impl */ },
    handleBatchEdit: (ids: string[]) => store.setBatchEditingIds(ids),
    onBatchEdit: (ids: string[]) => store.setBatchEditingIds(ids),
    onEditPhotoById: (p: Photo | string) => store.setEditPhotoId(typeof p === 'string' ? p : p.id),
    onEditPhoto: (p: Photo | string) => store.setEditPhotoId(typeof p === 'string' ? p : p.id),
    handleAiAnalyze: async (photo: Photo) => { /* impl */ },
    onAiAnalyze: async (photo: Photo) => { /* impl */ },
    setGroupCover: async (id: string, gid: string) => { /* impl */ },
    onSetGroupCover: async (id: string, gid: string) => { /* impl */ },
    abortAnalysis: () => {},
    onCancelAnalyze: () => {},
    onLongPressStart: (id: string) => {},
    onLongPressEnd: () => {},
    initialPhotoId: null,

    // missing items from Sub-components
    setEditPhotoId: store.setEditPhotoId,
    analyzeGroupById: async (id: string) => {},
    handleAddToGroup: async (ids: string[], groupId: string) => {},
    handleLogoUpload: async (e: React.ChangeEvent<HTMLInputElement>, categories: Category[], tags: Tag[], manufacturers: Manufacturer[]) => {},
    performPushSync: async () => {},
    saveSettings: async (s: any) => {},
    t: translations[store.appLang as keyof typeof translations || 'zh'] || translations.en,
    isMaintenanceRunning: false,
    onRunMaintenance: () => {},

    // Sub-data needed by UnifiedGallery
    categories: [] as Category[], 
    tags: [] as Tag[],
    manufacturers: [] as Manufacturer[],
    settings: {} as any,
    infinitePhotosQuery: {
      data: { pages: [], pageParams: [] },
      isLoading: isLoadingPhotos,
      hasNextPage: false,
      fetchNextPage: loadMore,
      isFetchingNextPage: false,
      refetch
    } as any,
  };
}

export function useOptionalAdmin() {
  return useAdmin();
}

export function usePhotoActions() {
  return useAdmin();
}
