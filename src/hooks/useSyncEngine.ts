import { useCallback, useEffect } from 'react';
import { useGalleryStore, useShallow } from '../store';
import { User } from '../types';
import { fetchSettings } from '../services/settingService';
import { getPhotoCount } from '../services/photoService';
import { useQueryClient } from '@tanstack/react-query';
import { useInvalidatePhotos, useAuth, useTaskExecutor } from './';
import { setupOfflineSyncListener } from '../utils/offlineSync';

export const useSyncEngine = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const invalidatePhotos = useInvalidatePhotos();
  const { runTask } = useTaskExecutor();
  
  const { 
    isSyncing, setIsSyncing, 
    settings, setSettings,
    adminPreviewMode, setAdminPreviewMode 
  } = useGalleryStore(useShallow(s => ({
    isSyncing: (s.loadingType as string) === 'sync-pull' || (s.loadingType as string) === 'sync-push',
    setIsSyncing: s.setIsSyncing,
    settings: s.settings,
    setSettings: s.setSettings,
    adminPreviewMode: s.adminPreviewMode,
    setAdminPreviewMode: s.setAdminPreviewMode
  })));

  useEffect(() => {
    if (user?.id) {
      const cleanup = setupOfflineSyncListener(user.id);
      return cleanup;
    }
  }, [user?.id]);

  const refreshCloudData = useCallback(async (userAccount: User | null, setCloudCount: (c: number | null) => void) => {
    if (!userAccount) return;
    
    await runTask('同步云端数据', async () => {
        setIsSyncing(true);
        const [newSettings, count] = await Promise.all([
          fetchSettings(),
          getPhotoCount()
        ]);
        
        if (newSettings) setSettings(newSettings as any);
        setCloudCount(count);
        
        invalidatePhotos();
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['categories'] }),
          queryClient.invalidateQueries({ queryKey: ['tags'] }),
          queryClient.invalidateQueries({ queryKey: ['manufacturers'] }),
          queryClient.invalidateQueries({ queryKey: ['settings'] }),
        ]);
        setIsSyncing(false);
    }, { showSuccessToast: true });
  }, [setSettings, queryClient, invalidatePhotos, runTask, setIsSyncing]);

  return {
    adminPreviewMode,
    setAdminPreviewMode,
    settings,
    setSettings,
    refreshCloudData,
    isSyncing,
    setIsSyncing
  };
};
