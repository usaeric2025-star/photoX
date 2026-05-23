import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useFeedback } from '@/hooks';
import { saveSettings } from '@/services/settingService';
import { QUERY_KEYS } from '@/hooks/queries/keys';

export const useSettingsMutation = () => {
  const queryClient = useQueryClient();
  const { showError } = useFeedback();
  return useMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.settings });
    },
    onError: (err: any) => {
      showError(err, '保存设置失败');
    }
  });
};
