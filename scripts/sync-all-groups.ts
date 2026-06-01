import { supabase } from '../src/lib/supabase';

async function syncAllGroups() {
  console.log('Fetching all groups...');
  const { data: groups, error: groupsError } = await supabase.from('groups').select('id, name');
  
  if (groupsError) {
    console.error('Failed to fetch groups:', groupsError);
    return;
  }

  console.log(`Found ${groups.length} groups. Starting sync...`);

  for (const group of groups) {
    const { count, error: countError } = await supabase
      .from('furniture_items')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', group.id);

    if (countError) {
      console.error(`Failed to count for group ${group.name} (${group.id}):`, countError);
      continue;
    }

    const { error: updateError } = await supabase
      .from('groups')
      .update({ member_count: count || 0 })
      .eq('id', group.id);

    if (updateError) {
      console.error(`Failed to update group ${group.name}:`, updateError);
    } else {
      console.log(`Synced group ${group.name}: ${count} photos`);
    }
  }

  console.log('Sync complete!');
}

syncAllGroups().catch(console.error);
