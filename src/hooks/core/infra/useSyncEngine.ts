import { useCallback, useEffect } from 'react';
import { useUIStore, useShallow } from '@/store/useUIStore';
import { User } from '@/types';
import { fetchSettings } from '@/services/settingService';
import { getPhotoCount } from '@/services/photo/queries';
import { useQueryClient } from '@tanstack/react-query';
import { useInvalidatePhotos, useAuth, useTaskExecutor, useSyncMutation, useSettings } from '@/hooks';
import { setupOfflineSyncListener } from '@/lib/sync/offlineSync';

export const useSyncEngine = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const invalidatePhotos = useInvalidatePhotos();
  const { runTask } = useTaskExecutor();
  
  const { settings, updateSettings, isLoading: isSettingsLoading } = useSettings();

  const { mutateAsync: syncMut } = useSyncMutation();

  useEffect(() => {
    if (user?.id) {
      const cleanup = setupOfflineSyncListener(user.id);
      return cleanup;
    }
  }, [user?.id]);

  const refreshCloudData = useCallback(async (userAccount: User | null, setCloudCount: (c: number | null) => void) => {
    if (!userAccount) return;
    
    await runTask('同步云端数据', async () => {
        const [newSettings, count] = await Promise.all([
          fetchSettings(),
          getPhotoCount()
        ]);
        
        if (newSettings) await updateSettings(newSettings);
        setCloudCount(count);
        
        invalidatePhotos();
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['categories'] }),
          queryClient.invalidateQueries({ queryKey: ['tags'] }),
          queryClient.invalidateQueries({ queryKey: ['manufacturers'] }),
          queryClient.invalidateQueries({ queryKey: ['settings'] }),
        ]);
    }, { showSuccessToast: true, silent: true });
  }, [updateSettings, queryClient, invalidatePhotos, runTask]);

  return {
    settings,
    setSettings: updateSettings,
    refreshCloudData,
    performPush: () => syncMut('push')
  };
};
