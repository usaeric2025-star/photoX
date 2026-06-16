import { getSupabaseAdmin } from '../api/_lib/supabase.js';
import crypto from 'crypto';

const run = async () => {
    const supabase = await getSupabaseAdmin();
    // Simulate endpoint logic

    // 1. generate group it
    const targetGroupId = crypto.randomUUID(); 
    
    // 2. Fetch a valid photo to add
    const { data: testPhoto } = await supabase.from('furniture_items').select('id, user_id').limit(1).maybeSingle();
    if (!testPhoto) {
       console.log("No test photo found");
       return;
    }
    
    // 3. Try to insert group
    const insertData = {
        id: targetGroupId,
        user_id: testPhoto.user_id,
        name: {zh: "test"},
        status: 'confirmed',
        created_at: new Date().toISOString()
    };
    
    console.log("Inserting group...");
    const { error: err1 } = await supabase.from('groups').insert(insertData);
    if (err1) {
        console.error("Group insert error", err1);
    } else {
        console.log("Group insert success");
    }
    
    // 4. Try updating photo
    console.log("Updating photo...");
    const { error: err2 } = await supabase.from('furniture_items').update({group_id: targetGroupId }).eq('id', testPhoto.id);
    if (err2) {
        console.log("Photo update error:", err2);
    } else {
        console.log("Photo update success");
    }
    
    // clean up
    await supabase.from('furniture_items').update({group_id: null}).eq('id', testPhoto.id);
    await supabase.from('groups').delete().eq('id', targetGroupId);
};
run();
