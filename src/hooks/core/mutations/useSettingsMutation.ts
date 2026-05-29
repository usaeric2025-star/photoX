import { createMutationHook } from './factory';
import { saveSettings } from '@/services/settingService';
import { settingsKeys } from '@/lib/queryKeys';

export const useSettingsMutation = createMutationHook({
  entity: 'Settings',
  action: 'Update',
  mutationFn: saveSettings,
  invalidateKeys: [settingsKeys.list()],
  onSuccessMessage: '设置已保存',
});
