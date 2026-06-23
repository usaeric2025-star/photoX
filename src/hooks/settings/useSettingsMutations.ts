import { saveSettings } from '@/services/settings/commands';
import { AppSettings } from '@/types';
import { defineMutation } from '@/lib/mutations/defineMutation';
import { useOptimisticMutation } from '@/lib/mutations/useOptimisticMutation';

const settingsUpdateConfig = defineMutation<boolean, Partial<AppSettings>, readonly unknown[]>({
  name: 'settingsUpdate',
  service: async (updates) => {
    return await saveSettings(updates);
  },
  invalidate: () => [['settings']],
  successMessage: '设置已保存并同步',
});

export const useSettingsUpdateMutation = () => useOptimisticMutation(settingsUpdateConfig);

export const useSettingsMutations = () => {
  const update = useSettingsUpdateMutation();
  return { update };
};
