import { supabase } from '@/lib/supabase';
import { DB_CONFIG } from '@/constants/config';
import { logger } from '@/lib/logger';
import { safeArray } from '@/lib/utils';

export const repairGroupIntegrity = async (): Promise<{ dissolved: number, synced: number, deleted: number }> => {
  logger.info('[Maintenance] Starting Group Integrity Repair...');
  
  const { data: groups, error: groupsError } = await supabase.from('groups').select('id, name');
  if (groupsError) throw groupsError;

  let dissolved = 0;
  let synced = 0;
  let deleted = 0;

  for (const group of safeArray<any>(groups)) {
    const { count, error: countError } = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .select('id', { count: 'exact', head: true })
      .eq('group_id', group.id);

    if (countError) {
      logger.error(`[Maintenance] Failed to count for group ${group.id}:`, countError);
      continue;
    }

    const actualCount = count || 0;

    if (actualCount <= 1) {
      if (actualCount === 1) {
        await supabase
          .from(DB_CONFIG.TABLE_NAME)
          .update({ group_id: null, is_group_cover: false, is_pinned: false })
          .eq('group_id', group.id);
        dissolved++;
      }
      
      await supabase.from('groups').delete().eq('id', group.id);
      deleted++;
    } else {
      await supabase
        .from('groups')
        .update({ member_count: actualCount })
        .eq('id', group.id);
      synced++;
    }
  }

  return { dissolved, synced, deleted };
};
