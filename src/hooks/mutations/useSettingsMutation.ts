import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveSettings } from '../../services/settingService';
import { QUERY_KEYS } from '../queries/keys';

export const useSettingsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.settings });
    },
  });
};
