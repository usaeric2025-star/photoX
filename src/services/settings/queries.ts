import { api } from '@/lib/api';
import { logger } from '@/lib/logger';
import { AppSettings } from '@/types';

export async function fetchPublicSettings(): Promise<AppSettings> {
  try {
    const settingsPromise = api.public.settings.$get();
    const authPromise = api.public.auth.$get();
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Public Settings fetch timeout (15s)')), 15000);
    });
    
    const [settingsResponse, authResponse] = await Promise.race([
        Promise.all([settingsPromise, authPromise]),
        timeoutPromise
    ]);
    
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
