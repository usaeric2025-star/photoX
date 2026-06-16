import { getSupabaseAdmin } from '../api/_lib/supabase.js';
import crypto from 'crypto';

const run = async () => {
    const supabase = await getSupabaseAdmin();
    // 1. Fetch valid photo
    const { data: testPhoto } = await supabase.from('furniture_items').select('id, user_id').limit(1).maybeSingle();
    
    // 2. Mock handler logic directly
    const targetGroupId = crypto.randomUUID();
    const userId = 'staff';
    const photoIds = [testPhoto.id];
    const groupData = { name: {zh: "Test Group"} };
    
    console.log("targetGroupId", targetGroupId);
    
    const { data: checkData } = await supabase.from('groups').select('id').eq('id', targetGroupId).maybeSingle();
    let err;
    if (!checkData) {
      const insertData: any = {
        id: targetGroupId,
        is_hidden: false,
        created_at: new Date().toISOString(),
        ...groupData
      };
      
      let finalUserId = (userId !== 'staff' && userId) ? userId : testPhoto.user_id;
      insertData.user_id = finalUserId;
      console.log("insertData", insertData);
      
      const { error } = await supabase.from('groups').insert(insertData);
      err = error;
    } else {
      err = new Error("Group already exists??");
    }
    
    if (err) {
       console.log("Group insert error", err);
       return;
    }
    
    console.log("Group inserted successfully");
    
    // update photos
    const { error: photoErr } = await supabase
      .from('furniture_items')
      .update({ group_id: targetGroupId, is_group_cover: false })
      .in('id', photoIds);
      
    if (photoErr) {
       console.log("Photo update error", photoErr);
    } else {
       console.log("Photo update success");
    }
};
run();
