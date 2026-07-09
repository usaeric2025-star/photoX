import { api } from '#lib/api.js';
import { AppSettings } from '#src/types/index.js';
import { withTimeout } from '#lib/utils.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';

export async function fetchPublicSettings(): Promise<AppSettings> {
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
      app_name: 'photoX',
      passcode_enabled: false,
      manufacturers: [],
      tags: []
    } as AppSettings;
  }
}
