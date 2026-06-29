import { api } from '@/lib/api';
import { logger } from '@/lib/logger';
import { AppSettings } from '@/types';
import { withTimeout } from '@/lib/utils';

export async function fetchPublicSettings(): Promise<AppSettings> {
  try {
    const settingsPromise = api.public.settings.$get();
    const authPromise = api.public.auth.$get();
    
    const pAll = Promise.all([settingsPromise, authPromise]);
    
    const [settingsResponse, authResponse] = await withTimeout(pAll, 25000, 'Initialize Settings & Auth APIs');
    
    const [settingsResult, authResult] = await Promise.all([
        settingsResponse.json(),
        authResponse.json()
    ]);
    
    if (!settingsResult.success || !authResult.success) {
      return {
        app_name: 'photoX',
        passcode_enabled: false,
        manufacturers: [],
        tags: []
      } as AppSettings;
    }
    
    return { 
      app_name: 'photoX',
      ...settingsResult.data, 
      ...authResult.data 
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
