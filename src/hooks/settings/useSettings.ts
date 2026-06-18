import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { AppSettings } from '@/types';
import { useSettingsUpdateMutation } from './useSettingsMutations';
import { api } from '@/lib/api';

const DEFAULT_SETTINGS: AppSettings = {} as AppSettings;

export function useSettings() {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === `photox_${STORAGE_KEYS.SETTINGS}`) {
        queryClient.invalidateQueries({ queryKey: ['settings'] });
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [queryClient]);

  const { data: qSettings, isPending } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await api.admin.settings.get.$get();
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      const data = result.data;
      if (data) {
        storage.set(STORAGE_KEYS.SETTINGS, data);
      }
      return data || storage.get(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    },
    staleTime: 60 * 1000,
    initialData: () => {
      const cached = storage.get<AppSettings | null>(STORAGE_KEYS.SETTINGS, null);
      if (cached && Object.keys(cached).length > 0) {
        return cached;
      }
      return undefined;
    },
  });

  const updateMutation = useSettingsUpdateMutation();

  const settings = qSettings || DEFAULT_SETTINGS;

  return React.useMemo(() => ({
    settings,
    isPending,
    updateSettings: updateMutation.mutateAsync,
    agnesApiKey: settings?.agnes_api_key,
    customModel: settings?.custom_model,
    accessPasscode: settings?.access_passcode,
    updateSettingsSync: updateMutation.mutate,
  }), [settings, isPending, updateMutation.mutateAsync, updateMutation.mutate]);
}

export function usePublicSettings() {
  return useQuery({
    queryKey: ['settings', 'public'],
    queryFn: async () => {
      const response = await api.public.settings.$get();
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      return result.data as AppSettings;
    },
    staleTime: 5 * 60 * 1000,
  });
}
