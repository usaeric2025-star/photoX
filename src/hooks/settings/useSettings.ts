import { AppSettings } from '#src/types/index.js';
import React from 'react';
import { useAppQuery, useAppMutation, queryClient } from '#lib/query/index.js';
import { SettingsService } from './service.js';
import { STALE_TIMES } from '#lib/query/config.js';
import { queryKeys } from '#lib/query/keys.js';

const useSettingsMutations = () => {
  const updateMutation = useAppMutation({
    mutationFn: SettingsService.save,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.public() });
    }
  });

  const uploadMutation = useAppMutation({
    mutationFn: SettingsService.uploadLogo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.public() });
    }
  });

  return { 
    update: updateMutation.mutateAsync, 
    upload: uploadMutation.mutateAsync,
    isPending: updateMutation.isPending || uploadMutation.isPending
  };
};

export function useSettings() {
  const { data: settings, isPending } = useAppQuery<AppSettings>(
    queryKeys.settings.public(),
    SettingsService.fetchPublic,
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
    SettingsService.fetchPublic,
    {
      staleTime: STALE_TIMES.MEDIUM,
    }
  );
}
