import { createQuery } from './core/queryFactory';
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

export const useSettings = () => {
  const { data: settings = {} as AppSettings, isLoading } = useGetSettings(undefined);
  const updateMutation = useSettingsUpdateMutation();

  return {
    settings,
    isLoading,
    updateSettings: updateMutation.mutateAsync,
    geminiApiKey: settings?.gemini_api_key,
    customModel: settings?.custom_model,
    accessPasscode: settings?.access_passcode,
    updateSettingsSync: updateMutation.mutate,
  };
};
