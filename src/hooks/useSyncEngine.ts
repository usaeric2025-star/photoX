import { useState, useCallback, useEffect } from 'react';
import { useGalleryStore } from '../store';
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
  const settings = useGalleryStore(state => state.settings);
  const setSettings = useGalleryStore(state => state.setSettings);
  const isSyncing = useGalleryStore(state => state.isSyncing);
  const setIsSyncing = useGalleryStore(state => state.setIsSyncing);
  const viewMode = useGalleryStore(state => state.viewMode);
  const setViewMode = useGalleryStore(state => state.setViewMode);

  useEffect(() => {
    if (user?.id) {
      const cleanup = setupOfflineSyncListener(user.id);
      return cleanup;
    }
  }, [user?.id]);

  const refreshCloudData = useCallback(async (user: User | null, force: boolean, setCloudCount: (c: number | null) => void) => {
    if (!user) return;
    
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
    viewMode,
    setViewMode,
    settings,
    setSettings,
    refreshCloudData,
    isSyncing,
    setIsSyncing
  };
};
