import { AppSettings } from '#src/types/index.js';
import React, { useMemo } from 'react';
import { useAppQuery, useAppMutation, queryClient } from '#lib/query/index.js';
import { STALE_TIMES } from '#lib/query/config.js';
import { queryKeys } from '#lib/query/keys.js';
import { api } from '#lib/api.js';
import { withTimeout } from '#lib/utils.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { supabase } from '#lib/supabase.js';
import { DB_CONFIG } from '#src/constants/config.js';

const SETTINGS_COLUMNS = [
    'id', 'logo_url', 'openrouter_model',
    'access_passcode', 'whatsapp_1', 'whatsapp_1_name', 
    'whatsapp_2', 'whatsapp_2_name', 'tags_json', 'updated_at'
];

/**
 * SettingsService: 處理設置相關的 API 邏輯。
 */
const SettingsService = {
  fetchPublic: async (): Promise<AppSettings> => {
    try {
      const settingsPromise = api.public.settings.$get();
      const [settingsResponse] = await withTimeout(Promise.all([settingsPromise]), 10000, 'Initialize Settings & Auth APIs');
            
      const settingsData = await ErrorFactory.unwrap<Partial<AppSettings>>(
        settingsResponse,
        'Initialize Settings & Auth APIs failed'
      );
      return { 
         app_name: 'photoX',
        ...settingsData
      } as AppSettings;
    } catch (e) {
      ErrorFactory.handle(e, { context: 'fetchPublicSettings' });
      return {
        passcode_enabled: false,
        manufacturers: [],
        tags: []
      } as unknown as AppSettings;
    }
  },

  save: async (settings: Partial<AppSettings> & Record<string, unknown>) => {
    try {
      const rawPayload = { ...settings };
      const payload: Record<string, unknown> = { id: 1 };
            
      if (rawPayload.agnes_api_key === "••••••••••••••••") delete rawPayload.agnes_api_key;
      if (rawPayload.api_key) delete rawPayload.api_key;
            
      Object.entries(rawPayload).forEach(([key, value]) => {
        if (key === 'ai_provider') return;
        if (SETTINGS_COLUMNS.includes(key)) {
          payload[key] = value;
        }
      });
            
      if (rawPayload.provider) {
        void api.admin.settings['save-provider'].$post({
          json: { provider: rawPayload.provider }
        });
      }
            
      if (rawPayload.pinned_tags || rawPayload.hot_tags_count !== undefined) {
        payload.tags_json = JSON.stringify({
          pinned_tags: rawPayload.pinned_tags || [],
          hot_tags_count: rawPayload.hot_tags_count ?? 9,
          hot_tag_threshold: rawPayload.hot_tag_threshold ?? 1,
        });
      }
      payload.updated_at = new Date().toISOString();
            
      await ErrorFactory.unwrap<unknown>(
        api.admin.settings['save-settings'].$post({
          json: { settingsPayload: payload as Record<string, unknown> }
        }),
        '保存设置失败'
      );
      return true;
    } catch (err) {
      throw ErrorFactory.wrap(err instanceof Error ? err : new Error(String(err)), 'saveSettings');
    }
  },

  uploadLogo: async (file: File) => {
    const bucketName = DB_CONFIG.BUCKET_NAME; 
    const fileName = `app/logo-${Date.now()}.webp`;
        
    try {
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, { upsert: true });
              
      if (uploadError) {
        throw ErrorFactory.wrap(uploadError, 'uploadLogo', fileName);
      }
            
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);
              
      await ErrorFactory.unwrap<unknown>(
        api.admin.settings['upsert-logo'].$post({
          json: { url: publicUrl }
        }),
        '更新Logo设置失败'
      );
      return publicUrl;
    } catch (err: unknown) {
      throw ErrorFactory.wrap(err instanceof Error ? err : new Error(String(err)), 'uploadLogo');
    }
  }
};

const useSettingsMutations = () => {
  const updateMutation = useAppMutation({
    mutationFn: SettingsService.save,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
    }
  });

  const uploadMutation = useAppMutation({
    mutationFn: SettingsService.uploadLogo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
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

  return useMemo(() => ({
    settings: settings || ({} as AppSettings),
    isPending,
    updateSettings,
    agnesApiKey: settings?.agnes_api_key,
    accessPasscode: (settings as Record<string, unknown> | undefined)?.access_passcode as string | undefined || settings?.accessPasscode,
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
