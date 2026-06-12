import { saveSettings } from '@/services/settings/commands';
import { AppSettings } from '@/types';
import { defineMutation } from '@/lib/mutations/defineMutation';
import { useAppMutation } from '@/lib/mutations/useAppMutation';

const settingsUpdateConfig = defineMutation<AppSettings, Partial<AppSettings>>({
  service: async (updates) => {
    return await saveSettings(updates);
  },
  invalidate: () => [['settings'] as any],
  successMessage: '设置已保存并同步',
});

export const useSettingsUpdateMutation = () => useAppMutation(settingsUpdateConfig);

export const useSettingsMutations = () => {
  const update = useSettingsUpdateMutation();
  return { update };
};
