import { api } from '#lib/api';
import { AppSettings } from '#src/types';
import { withTimeout } from '#lib/utils';
import { ErrorFactory } from '#lib/error/ErrorFactory';

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
    ErrorFactory.handle(e, { context: 'fetchPublicSettings' });
    return {
      app_name: 'photoX',
      passcode_enabled: false,
      manufacturers: [],
      tags: []
    } as AppSettings;
  }
}
