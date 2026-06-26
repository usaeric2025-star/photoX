import { api } from '@/lib/api';
import { logger } from '@/lib/logger';
import { AppSettings } from '@/types';

export async function fetchPublicSettings(): Promise<AppSettings> {
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
}
