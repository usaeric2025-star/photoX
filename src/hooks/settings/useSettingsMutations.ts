import { useSettingsMutations as useSettingsMutationsService } from '@/services/settings/settingsService';

export const useSettingsMutations = () => {
  const { update, upload } = useSettingsMutationsService();
  return { update, upload };
};

// Deprecated: Remove in next cleanup
export const useSettingsUpdateMutation = () => {
  const { update } = useSettingsMutationsService();
  return { mutateAsync: update, mutate: update };
};
