import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { saveSettings } from '../../services/settingService';
import { QUERY_KEYS } from '../queries/keys';

export const useSettingsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.settings });
    },
    onError: (err: any) => {
      toast.error(`保存设置失败: ${err.message}`);
    }
  });
};
