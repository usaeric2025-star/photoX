import { createMutationHook } from './factory';
import { saveSettings } from '@/services/settingService';
import { AppSettings } from '@/types';

/**
 * Hook for updating application settings.
 */
export const useSettingsUpdate = createMutationHook({
  entity: 'Settings',
  action: 'Update',
  mutationFn: async (updates: Partial<AppSettings>) => {
    return await saveSettings(updates);
  },
  invalidateKeys: [['settings']],
  onSuccessMessage: '配置已同步到全端',
});
