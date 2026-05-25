import { createMutationHook } from '@/hooks/_factory/createMutationHook';
import { saveSettings } from '@/services/settingService';
import { QUERY_KEYS } from '@/hooks/queries/keys';

export const useSettingsMutation = createMutationHook({
  entity: 'Settings',
  action: 'Update',
  mutationFn: saveSettings,
  invalidateKeys: [QUERY_KEYS.settings],
  onSuccessMessage: '设置已保存',
});
