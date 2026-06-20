import { useAuthStore } from '@/store/useAuthStore';
import { useCallback, useEffect } from 'react';
import { useUIStore, useShallow } from '@/store/useUIStore';
import { User } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import { useInvalidatePhotos } from '@/hooks/photo/useInvalidatePhotos';
import { useTaskExecutor } from '@/hooks/core/useTaskExecutor';
import { useSettings } from '@/hooks/settings/useSettings';
import { logger } from '@/lib/logger';
import { api } from '@/lib/api';

export const useSyncEngine = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const invalidatePhotos = useInvalidatePhotos();
  const { runTask } = useTaskExecutor();
  
  const { settings, updateSettings, isPending: isSettingsPending } = useSettings();

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
          if (result && result.count > 0) {
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
    
    await runTask('同步云端數據', async () => {
        const [settingsRes, countRes] = await Promise.all([
          api.admin.settings.get.$get(),
          api.photos.count.$post({ json: {} })
        ]);
        
        const settingsResult = await settingsRes.json();
        const countResult = await countRes.json();
        
        if (settingsResult.success) await updateSettings(settingsResult.data);
        if (countResult.success) setCloudCount(countResult.data);
        
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
    refreshCloudData
  };
};
