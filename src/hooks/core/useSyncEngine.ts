import { useCallback, useEffect } from 'react';
import { useGalleryStore, useShallow } from '@/store';
import { User } from '@/types';
import { fetchSettings } from '@/services/settingService';
import { getPhotoCount } from '@/services/photoService';
import { useQueryClient } from '@tanstack/react-query';
import { useInvalidatePhotos, useAuth, useTaskExecutor, useSyncMutation } from '@/hooks';
import { setupOfflineSyncListener } from '@/utils/offlineSync';

export const useSyncEngine = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const invalidatePhotos = useInvalidatePhotos();
  const { runTask } = useTaskExecutor();
  
  const { settings, setSettings } = useGalleryStore(useShallow(s => ({
    settings: s.settings,
    setSettings: s.setSettings
  })));

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
        
        if (newSettings) setSettings(newSettings as any);
        setCloudCount(count);
        
        invalidatePhotos();
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['categories'] }),
          queryClient.invalidateQueries({ queryKey: ['tags'] }),
          queryClient.invalidateQueries({ queryKey: ['manufacturers'] }),
          queryClient.invalidateQueries({ queryKey: ['settings'] }),
        ]);
    }, { showSuccessToast: true, silent: true });
  }, [setSettings, queryClient, invalidatePhotos, runTask]);

  return {
    settings,
    setSettings,
    refreshCloudData,
    performPush: () => syncMut('push')
  };
};
