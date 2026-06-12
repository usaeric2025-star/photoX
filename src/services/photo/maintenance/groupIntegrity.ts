import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { supabase } from '@/lib/supabase';
import { DB_CONFIG } from '@/constants/config';
import { logger } from '@/lib/logger';
import { safeArray } from '@/lib/utils';
import { api } from '@/lib/api';

export const repairGroupIntegrity = async (): Promise<{ dissolved: number, synced: number, deleted: number }> => {
  logger.info('[Maintenance] Starting Group Integrity Repair...');
  
  const res = await api.groups['repair-integrity'].$post();
  if (!res.ok) throw ErrorFactory.wrap(new Error('Failed to repair group integrity'), 'groupIntegrity');
  const { data } = await res.json();
  
  return data;
};
