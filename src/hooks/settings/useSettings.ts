import { AppSettings } from '#src/types/index.js';
import React from 'react';
import { useAppQuery } from '#lib/query/index.js';
import { fetchPublicSettings } from '#src/services/settings/queries.js';
import { STALE_TIMES } from '#lib/query/config.js';
import { queryKeys } from '#lib/query/keys.js';
import { useSettingsMutations } from './useSettingsMutations.js';

export function useSettings() {
  const { data: settings, isPending } = useAppQuery<AppSettings>(
    queryKeys.settings.public(),
    fetchPublicSettings,
    {
      staleTime: STALE_TIMES.LONG,
    }
  );

  const { update: updateSettings } = useSettingsMutations();

  return React.useMemo(() => ({
    settings: settings || ({} as AppSettings),
    isPending,
    updateSettings,
    agnesApiKey: settings?.agnes_api_key,
    accessPasscode: settings?.accessPasscode,
    updateSettingsSync: updateSettings,
  }), [settings, isPending, updateSettings]);
}

export function usePublicSettings() {
  return useAppQuery<AppSettings>(
    queryKeys.settings.public(),
    fetchPublicSettings,
    {
      staleTime: STALE_TIMES.MEDIUM,
    }
  );
}
