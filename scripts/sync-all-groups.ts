import { getSupabaseAdmin } from '../api/_lib/supabase.js';
import { syncGroupCoversAndCount } from '../api/_lib/groups.js';

async function syncAllGroups() {
  console.log('Fetching all groups...');
  const supabase = await getSupabaseAdmin();
  const { data: groups, error: groupsError } = await supabase.from('groups').select('id, name');
  
  if (groupsError) {
    console.error('Failed to fetch groups:', groupsError);
    return;
  }

  const groupIds = (groups || []).map(g => g.id);
  console.log(`Found ${groupIds.length} groups. Starting robust reconciliation sync...`);

  await syncGroupCoversAndCount(supabase, groupIds);

  console.log('Sync complete!');
}

syncAllGroups().catch(console.error);
