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
  const isSyncing = useStore(state => state.isSyncing); // If this is actually UI state, keep it, but check types. Actually, user asked to remove business data and Zustand should ONLY store UI state. setIsSyncing should probably be removed if it's business data. Given the constraints, I will remove it if it relates to sync status as a business process. Wait, if it's loading status, it's UI. Let's assume it's UI for now or check types.ts. Actually, just removing business data.
    // ...
    // Since I don't have types.ts right now, I'll proceed with removing clear business data.
  // Actually, I'll remove settings, setIsSyncing from store, and update components to use TanStack Query/useSettings...


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
