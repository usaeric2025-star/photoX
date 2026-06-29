import { AppSettings } from '@/types';
import { useAppMutation, appQuery } from '@/lib/query';
import { saveSettings, uploadLogo } from '@/services/settings/commands';

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
