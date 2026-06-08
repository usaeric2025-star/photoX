import { supabase } from '@/lib/supabase';
import { DB_CONFIG } from '@/constants/config';
import { withErrorHandling } from '@/lib/error/wrapper';
import { AppResult } from '@/types/api';
import { success } from '@/lib/error/ErrorFactory';
import { withSupabase } from '@/lib/error/supabaseWrapper';

export const ungroupPhotos = async (groupId: string): Promise<AppResult<void>> => {
  return withErrorHandling(async () => {
    const query = supabase.rpc('dissolve_group', { group_id: groupId });
    const res = await withSupabase(query, 'ungroupPhotos', 'high', { allowNull: true });
    if (!res.ok) return res;
    return success(undefined);
  }, 'ungroupPhotos');
};

export const syncGroupMemberCount = async (groupId: string): Promise<AppResult<void>> => {
  return withErrorHandling(async () => {
    if (!groupId) return success(undefined);
    const countQuery = supabase
      .from(DB_CONFIG.TABLE_NAME)
      .select('id', { count: 'exact', head: true })
      .eq('group_id', groupId);

    const countRes = await withSupabase(countQuery, 'syncGroupMemberCount/count', 'high', { allowNull: true }) as any;
    if (!countRes.ok) return countRes;

    const updateQuery = supabase
      .from('groups')
      .update({ member_count: countRes.data?.count || 0 })
      .eq('id', groupId);

    const updateRes = await withSupabase(updateQuery, 'syncGroupMemberCount/update', 'high', { allowNull: true });
    return updateRes;
  }, 'syncGroupMemberCount');
};
