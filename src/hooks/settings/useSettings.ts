import { useEffect } from 'react';
import { useLocalStorage } from '@/hooks/core/useLocalStorage';
import { createQuery } from '../core/queryFactory';
import { fetchSettings } from '@/services/settings/queries';
import { syncCache } from '@/lib/db/indexedDB';
import { useSettingsUpdateMutation } from './useSettingsMutations';
import { AppSettings } from '@/types';

/**
 * Hook to get app settings using standard query factory.
 */
export const useGetSettings = createQuery<AppSettings, void>({
  queryKey: () => ['settings'],
  queryFn: async () => {
    const data = await fetchSettings();
    if (data) {
      syncCache.saveSettings(data).catch(console.warn);
    }
    return data || {} as AppSettings;
  },
  staleTime: 60 * 1000, // 1 minute stale time for settings
});

let initialSettingsCache: AppSettings | null = null;
const getInitialSettings = (): AppSettings => {
  if (initialSettingsCache) return initialSettingsCache;
  try {
    const item = typeof window !== 'undefined' ? window.localStorage.getItem('photox_cached_settings') : null;
    if (item) {
      initialSettingsCache = JSON.parse(item);
      return initialSettingsCache!;
    }
  } catch (e) {
    // Silent
  }
  return {} as AppSettings;
};

export const useSettings = () => {
  const [cachedSettings, setCachedSettings] = useLocalStorage<AppSettings>({
    key: 'photox_cached_settings',
    defaultValue: getInitialSettings(),
  });

  const { data: qSettings, isLoading } = useGetSettings(undefined);
  const updateMutation = useSettingsUpdateMutation();

  useEffect(() => {
    if (qSettings && Object.keys(qSettings).length > 0) {
      setCachedSettings(qSettings);
    }
  }, [qSettings, setCachedSettings]);

  // Use cachedSettings immediately for a seamless mount/first-render, fallbacks nicely
  const settings = (qSettings && Object.keys(qSettings).length > 0) 
    ? qSettings 
    : (Object.keys(cachedSettings).length > 0 ? cachedSettings : getInitialSettings());

  return {
    settings,
    isLoading,
    updateSettings: updateMutation.mutateAsync,
    agnesApiKey: settings?.agnes_api_key,
    customModel: settings?.custom_model,
    accessPasscode: settings?.access_passcode,
    updateSettingsSync: updateMutation.mutate,
  };
};
