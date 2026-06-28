import { useSettings as useSettingsService } from '@/services/settings/settingsService';
import { AppSettings } from '@/types';
import React from 'react';
import { useAppQuery } from '@/lib/query';
import { fetchPublicSettings } from '@/services/settings/queries';
import { STALE_TIMES } from '@/lib/query/config';

export function useSettings() {
  const { settings, isLoading, mutate } = useSettingsService();

  return React.useMemo(() => ({
    settings: settings || ({} as AppSettings),
    isPending: isLoading,
    updateSettings: mutate,
    agnesApiKey: settings?.agnes_api_key,
    accessPasscode: settings?.access_passcode,
    updateSettingsSync: mutate,
  }), [settings, isLoading, mutate]);
}

export function usePublicSettings() {
  return useAppQuery(
    ['settings', 'public'],
    fetchPublicSettings,
    {
      dedupingInterval: STALE_TIMES.MEDIUM,
      revalidateOnFocus: false,
    }
  );
}
