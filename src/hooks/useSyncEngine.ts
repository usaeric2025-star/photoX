import { useState, useCallback, useEffect } from 'react';
import { useGalleryStore, useShallow } from '../store';
import { User, AppSettings } from '../types';
import { fetchSettings } from '../services/settingService';
import { getPhotoCount } from '../services/photoService';
import { useQueryClient } from '@tanstack/react-query';
import { useFeedback, useInvalidatePhotos, useAuth } from './';
import { setupOfflineSyncListener } from '../utils/offlineSync';

export const useSyncEngine = (withLoading: <T>(type: string, fn: () => Promise<T>) => Promise<T>) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showError: handleError } = useFeedback();
  const invalidatePhotos = useInvalidatePhotos();
  
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

  const refreshCloudData = useCallback(async (userAccount: User | null, force: boolean, setCloudCount: (c: number | null) => void) => {
    if (!userAccount) return;
    
    await withLoading('sync-pull', async () => {
      try {
        const [newSettings, count] = await Promise.all([
          fetchSettings(),
          getPhotoCount()
        ]);
        
        if (newSettings) setSettings(newSettings as any);
        setCloudCount(count);
        
        // Invalidate queries to refresh UI
        invalidatePhotos();
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['categories'] }),
          queryClient.invalidateQueries({ queryKey: ['tags'] }),
          queryClient.invalidateQueries({ queryKey: ['manufacturers'] }),
          queryClient.invalidateQueries({ queryKey: ['settings'] }),
        ]);
      } catch (err) {
        handleError(err, '同步失败');
      }
    });
  }, [withLoading, setSettings, queryClient, handleError, invalidatePhotos]);

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
