import { useState, useCallback } from 'react';
import { useGalleryStore } from '../store';
import { User, AppSettings } from '../types';
import { fetchSettings } from '../services/settingService';
import { getPhotoCount } from '../services/photoService';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from './queries/keys';

export const useSyncEngine = (withLoading: <T>(type: string, fn: () => Promise<T>) => Promise<T>) => {
  const queryClient = useQueryClient();
  const settings = useGalleryStore(state => state.settings);
  const setSettings = useGalleryStore(state => state.setSettings);
  const isSyncing = useGalleryStore(state => state.isSyncing);
  const setIsSyncing = useGalleryStore(state => state.setIsSyncing);
  const viewMode = useGalleryStore(state => state.viewMode);
  const setViewMode = useGalleryStore(state => state.setViewMode);

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
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories }),
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags }),
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.manufacturers }),
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.photos }),
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.settings })
        ]);
      } catch (err) {
        console.error('Refresh failed:', err);
      }
    });
  }, [withLoading, setSettings, queryClient]);

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
