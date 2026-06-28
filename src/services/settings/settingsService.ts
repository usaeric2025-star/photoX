import useSWR, { useSWRConfig } from 'swr';
import { useState } from 'react';
import { fetchPublicSettings } from './queries';
import { saveSettings, uploadLogo } from './commands';
import { AppSettings } from '@/types';
import { queryKeys } from '@/lib/query/keys';
import { errorService } from '@/services/error';

export function useSettings() {
  const { data, error, isLoading, mutate } = useSWR<AppSettings, any>(
    queryKeys.settings.all,
    fetchPublicSettings,
    {}
  );

  return {
    settings: data || ({} as AppSettings),
    isLoading,
    error,
    mutate,
  };
}

export function useSettingsMutations() {
  const { mutate } = useSWRConfig();
  const [isMutating, setIsMutating] = useState(false);

  const update = async (updates: Partial<AppSettings>) => {
    setIsMutating(true);
    try {
      await saveSettings(updates);
      mutate(queryKeys.settings.all);
    } catch (e) {
      errorService.handle(e, { context: 'settings.update' });
      throw e;
    } finally {
      setIsMutating(false);
    }
  };

  const upload = async (file: File) => {
    setIsMutating(true);
    try {
      const url = await uploadLogo(file);
      mutate(queryKeys.settings.all);
      return url;
    } catch (e) {
      errorService.handle(e, { context: 'settings.uploadLogo' });
      throw e;
    } finally {
      setIsMutating(false);
    }
  };

  return {
    update,
    upload,
    isMutating,
  };
}
