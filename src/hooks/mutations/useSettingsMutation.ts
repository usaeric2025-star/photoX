import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveSettings } from '../../services/settingService';

export const useSettingsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
};
