import { getSupabaseAdmin } from '../api/_lib/supabase.js';
import crypto from 'crypto';

const run = async () => {
    const supabase = await getSupabaseAdmin();
    // 1. Fetch valid photo
    const { data: testPhotos } = await supabase.from('furniture_items').select('id, user_id').limit(2);
    if (testPhotos.length < 2) return;
    
    // 2. Put photo 1 in group A
    const groupAId = crypto.randomUUID();
    await supabase.from('groups').insert({
        id: groupAId,
        user_id: testPhotos[0].user_id,
        name: {zh: "Group A"},
        status: 'confirmed'
    });
    await supabase.from('furniture_items').update({group_id: groupAId}).eq('id', testPhotos[0].id);
    
    // 3. Put photo 2 in group B (target)
    const targetGroupId = crypto.randomUUID();
    await supabase.from('groups').insert({
        id: targetGroupId,
        user_id: testPhotos[1].user_id,
        name: {zh: "Target Group"},
        status: 'confirmed'
    });
    
    // Wait for a ms to ensure commits
    await new Promise(r => setTimeout(r, 100));
    
    console.log("Calling merge_groups...");
    const { error: mergeErr } = await supabase.rpc('merge_groups', {
        source_group_ids: [groupAId],
        target_group_id: targetGroupId
    });
    
    if (mergeErr) {
        console.log("Merge error", mergeErr);
    } else {
        console.log("Merge success");
    }
    
    // clean up
    await supabase.from('furniture_items').update({group_id: null}).in('id', testPhotos.map(p => p.id));
    await supabase.from('groups').delete().in('id', [groupAId, targetGroupId]);
};
run();
