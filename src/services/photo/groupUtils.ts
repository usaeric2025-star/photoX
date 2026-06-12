import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { supabase } from '@/lib/supabase';
import { DB_CONFIG } from '@/constants/config';
import { withErrorHandling } from '@/lib/error/wrapper';
import { AppResult } from '@/types/api';
import { success } from '@/lib/error/ErrorFactory';
import { withSupabase } from '@/lib/error/supabaseWrapper';

import { api } from '@/lib/api';

export const ungroupPhotos = async (groupId: string): Promise<AppResult<void>> => {
  return withErrorHandling(async () => {
    const res = await api.groups.ungroup.$post({
      json: { groupId }
    });
    if (!res.ok) throw ErrorFactory.wrap(new Error('Ungroup failed'), 'groupUtils');
    return success(undefined);
  }, 'ungroupPhotos');
};

export const syncGroupMemberCount = async (groupId: string): Promise<AppResult<void>> => {
  return withErrorHandling(async () => {
    if (!groupId) return success(undefined);
    const res = await api.groups['sync-count'].$post({
      json: { groupId }
    });
    if (!res.ok) throw ErrorFactory.wrap(new Error('Sync count failed'), 'groupUtils');
    return success(undefined);
  }, 'syncGroupMemberCount');
};
