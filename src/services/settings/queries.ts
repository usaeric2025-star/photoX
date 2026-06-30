import { api } from '@/lib/api';
import { logger } from '@/lib/logger';
import { AppSettings } from '@/types';
import { withTimeout } from '@/lib/utils';

export async function fetchPublicSettings(): Promise<AppSettings> {
  try {
    const settingsPromise = api.public.settings.$get();
    
    const [settingsResponse] = await withTimeout(Promise.all([settingsPromise]), 25000, 'Initialize Settings & Auth API');
    
    const settingsResult = await settingsResponse.json();
    
    if (!settingsResult.success) {
      return {
        app_name: 'photoX',
        passcode_enabled: false,
        manufacturers: [],
        tags: []
      } as AppSettings;
    }
    
    return { 
      app_name: 'photoX',
      ...settingsResult.data
    } as AppSettings;
  } catch (e) {
    logger.error('Failed to fetch public settings, returning default', e instanceof Error ? e.message : String(e), e);
    return {
      app_name: 'photoX',
      passcode_enabled: false,
      manufacturers: [],
      tags: []
    } as AppSettings;
  }
}
