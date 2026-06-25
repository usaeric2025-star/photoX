import { usePublicSettings } from '@/hooks';
import { useAuth } from '@/lib/store';
import { useEffect, useState } from 'react';
import { authStore } from '@/store/authStore';

type InitStatus = 'idle' | 'loading' | 'success' | 'error';

export function useAppInit() {
  const auth = useAuth();
  const { data: settings, error: settingsError, isPending: isSettingsPending } = usePublicSettings();

  const [status, setStatus] = useState<InitStatus>('idle');
  const [error, setError] = useState<Error | null>(null);

  // ✅ 初始化 Auth
  useEffect(() => {
    authStore.getState().init();
  }, []);

  // ✅ 追蹤載入狀態
  useEffect(() => {
    
    if (auth.isLoading || isSettingsPending) {
      setStatus('loading');
      return;
    }

    if (settingsError) {
      setStatus('error');
      setError(settingsError as Error);
      return;
    }

    if (!auth.isLoading && !isSettingsPending) {
      setStatus('success');
    }
  }, [auth.isLoading, isSettingsPending, settingsError]);

  return { status, error, isLoading: status === 'loading', isError: status === 'error', settings };
}
