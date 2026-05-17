import { useState, useCallback } from 'react';
import { useGalleryStore } from '../store';
import { User, AppSettings } from '../types';

export const useSyncEngine = (withLoading: <T>(type: string, fn: () => Promise<T>) => Promise<T>) => {
  const settings = useGalleryStore(state => state.settings);
  const setSettings = useGalleryStore(state => state.setSettings);
  const isSyncing = useGalleryStore(state => state.isSyncing);
  const setIsSyncing = useGalleryStore(state => state.setIsSyncing);
  const viewMode = useGalleryStore(state => state.viewMode);
  const setViewMode = useGalleryStore(state => state.setViewMode);

  const refreshCloudData = useCallback(async (user: User | null, force: boolean, setCloudCount: (c: number | null) => void) => {
    // Stub for refresh cloud data
    console.log('Refresh cloud data called');
  }, []);

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
