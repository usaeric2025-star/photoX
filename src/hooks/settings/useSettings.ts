import { STALE_TIMES } from '@/lib/query/config';
import React, { useEffect } from 'react';
import { useAppQuery, useAppMutation, appQuery } from '@/lib/query';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { AppSettings } from '@/types';
import { useSettingsUpdateMutation } from './useSettingsMutations';
import { api } from '@/lib/api';
import { logger } from '@/lib/logger';

const DEFAULT_SETTINGS: AppSettings = {} as AppSettings;

export function useSettings() {
  
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === `photox_${STORAGE_KEYS.SETTINGS}`) {
        appQuery.mutate(['settings']);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const { data: qSettings, isLoading: isPending } = useAppQuery(
    'settings',
    async () => {
      const response = await api.admin.settings.get.$get();
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      const data = result.data;
      if (data) {
        storage.set(STORAGE_KEYS.SETTINGS, data);
      }
      return data || storage.get(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    },
    {
      dedupingInterval: STALE_TIMES.SHORT,
      fallbackData: storage.get<AppSettings | null>(STORAGE_KEYS.SETTINGS, null) || undefined,
    }
  );

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
  return useAppQuery(
    ['settings', 'public'],
    async () => {
      try {
        const fetchPromise = api.public.settings.$get();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Public Settings fetch timeout (10s)')), 10000);
        });
        
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        const result = await response.json();
        if (!result.success) return {} as AppSettings;
        return result.data as AppSettings;
      } catch (e) {
        logger.error('Failed to fetch public settings, returning default', e);
        return {} as AppSettings;
      }
    },
    {
      dedupingInterval: STALE_TIMES.MEDIUM,
      revalidateOnFocus: false,
    }
  );
}
