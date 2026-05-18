import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useErrorHandler } from '../../utils/errorHandler';
import { saveSettings } from '../../services/settingService';
import { QUERY_KEYS } from '../queries/keys';

export const useSettingsMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  return useMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.settings });
    },
    onError: (err: any) => {
      handleError(err, '保存设置失败');
    }
  });
};
