import { AppSettings } from '#src/types';
import React from 'react';
import { useAppQuery, useAppMutation, appQuery } from '#lib/query';
import { fetchPublicSettings } from '#src/services/settings/queries';
import { saveSettings } from '#src/services/settings/commands';
import { STALE_TIMES } from '#lib/query/config';
import { queryKeys } from '#lib/query/keys';

const SETTINGS_KEY = ['settings', 'public'];

export function useSettings() {
  const { data: settings, isLoading, mutate } = useAppQuery<AppSettings>(
    SETTINGS_KEY,
    fetchPublicSettings,
    {
      dedupingInterval: STALE_TIMES.LONG,
      revalidateOnFocus: false,
    }
  );

  return React.useMemo(() => ({
    settings: settings || ({} as AppSettings),
    isPending: isLoading,
    updateSettings: mutate,
    agnesApiKey: settings?.agnes_api_key,
    accessPasscode: settings?.accessPasscode,
    updateSettingsSync: mutate,
  }), [settings, isLoading, mutate]);
}

export function usePublicSettings() {
  return useAppQuery<AppSettings>(
    SETTINGS_KEY,
    fetchPublicSettings,
    {
      dedupingInterval: STALE_TIMES.MEDIUM,
      revalidateOnFocus: false,
    }
  );
}
