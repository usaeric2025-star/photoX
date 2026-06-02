import { createMutationHook } from './factory';
import { saveSettings } from '@/services/settingService';
import { AppSettings } from '@/types';
import { settingsKeys } from '@/lib/queryKeys';

export const useSettingsUpdateMutation = createMutationHook({
  entity: 'Settings',
  action: 'Update',
  mutationFn: async (updates: Partial<AppSettings>) => {
    return await saveSettings(updates);
  },
  invalidateKeys: [['settings'], settingsKeys.list()],
  onSuccessMessage: '设置已保存并同步',
});

export const useSettingsMutations = () => {
  const update = useSettingsUpdateMutation();
  return { update };
};
