import { AppSettings } from '#src/types/index.js';
import { useAppMutation, queryClient } from '#lib/query/index.js';
import { saveSettings, uploadLogo } from '#src/services/settings/commands.js';

const SETTINGS_KEY = ['settings', 'public'];

export const useSettingsMutations = () => {
  const updateMutation = useAppMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
    }
  });

  const uploadMutation = useAppMutation({
    mutationFn: uploadLogo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
    }
  });

  return { 
    update: updateMutation.mutateAsync, 
    upload: uploadMutation.mutateAsync,
    isPending: updateMutation.isPending || uploadMutation.isPending
  };
};
