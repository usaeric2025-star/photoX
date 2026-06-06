import { createMutationHook } from './core/mutationFactory';
import { saveSettings } from '@/services/settings/commands';
import { AppSettings } from '@/types';
import { settingsKeys } from '@/lib/queryKeys';

export const useSettingsUpdateMutation = createMutationHook({
  entity: 'Settings',
  action: 'Update',
  mutationFn: async (updates: Partial<AppSettings>) => {
    return await saveSettings(updates);
  },
  queryKey: ['settings'],
  optimisticUpdate: (old: AppSettings | undefined, variables: Partial<AppSettings>) => {
    return { ...(old || {}), ...variables } as AppSettings;
  },
  invalidateKeys: [['settings'], settingsKeys.list()],
  onSuccessMessage: '设置已保存并同步',
});

export const useSettingsMutations = () => {
  const update = useSettingsUpdateMutation();
  return { update };
};
