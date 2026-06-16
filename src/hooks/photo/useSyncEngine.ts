import { useAuthStore } from '@/store/useAuthStore';
import { useCallback, useEffect } from 'react';
import { useUIStore, useShallow } from '@/store/useUIStore';
import { User } from '@/types';
import { fetchSettings } from '@/services/settings/queries';
import { getPhotoCount } from '@/services/photo/queries/list';
import { useQueryClient } from '@tanstack/react-query';
import { useInvalidatePhotos, useTaskExecutor, useSyncMutation, useSettings } from '@/hooks';
import { logger } from '@/lib/logger';

export const useSyncEngine = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const invalidatePhotos = useInvalidatePhotos();
  const { runTask } = useTaskExecutor();
  
  const { settings, updateSettings, isPending: isSettingsPending } = useSettings();

  const { mutateAsync: syncMut } = useSyncMutation();

  useEffect(() => {
    // Offline sync listener removed
  }, [user?.id]);

  useEffect(() => {
    // Background Self-Healing (Silent)
    // Only triggers if user is authenticated and potentially an admin
    if (user?.id) {
      const healOrphans = async () => {
        try {
          const { cleanUpOrphanRecords } = await import('@/services/photo/maintenance/cleanup');
          const result = await cleanUpOrphanRecords();
          if (result.count > 0) {
            logger.info(`[Self-Healing] Automatically removed ${result.count} orphan records.`);
            invalidatePhotos();
          }
        } catch (e) {
          // Silent failure for background task
          console.debug('[Self-Healing] Background check skipped or failed');
        }
      };

      // Delay execution to not compete with initial load
      const timer = setTimeout(healOrphans, 5000);
      return () => clearTimeout(timer);
    }
  }, [user?.id, invalidatePhotos]);

  const refreshCloudData = useCallback(async (userAccount: User | null, setCloudCount: (c: number | null) => void) => {
    if (!userAccount) return;
    
    await runTask('同步云端数据', async () => {
        const [newSettings, photoCount] = await Promise.all([
          fetchSettings(),
          getPhotoCount()
        ]);
        
        if (newSettings) await updateSettings(newSettings);
        
        setCloudCount(photoCount);
        
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
