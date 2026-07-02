import { AppSettings } from '#src/types/index.js';
import { useAppMutation, appQuery } from '#lib/query/index.js';
import { saveSettings, uploadLogo } from '#src/services/settings/commands.js';

const SETTINGS_KEY = ['settings', 'public'];

const useSettingsMutations = () => {
  const updateMutation = useAppMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      appQuery.mutate(SETTINGS_KEY);
    }
  });

  const uploadMutation = useAppMutation({
    mutationFn: uploadLogo,
    onSuccess: () => {
      appQuery.mutate(SETTINGS_KEY);
    }
  });

  return { 
    update: updateMutation.mutateAsync, 
    upload: uploadMutation.mutateAsync,
    isMutating: updateMutation.isPending || uploadMutation.isPending
  };
};

// Deprecated: Remove in next cleanup
const useSettingsUpdateMutation = () => {
  const { update } = useSettingsMutations();
  return { mutateAsync: update, mutate: update };
};
