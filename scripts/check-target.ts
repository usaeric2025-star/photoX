import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

async function run() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) return;
  const supabase = createClient(url, key);

  const { data: item } = await supabase.from('furniture_items').select('*').eq('id', '2b96665d-bb1a-455d-a235-34d412176dca').maybeSingle();
  if (item) {
    console.log("Found as furniture item:", JSON.stringify(item, null, 2));
    const { data: siblingPhotos } = await supabase.from('furniture_items').select('*').eq('group_id', item.group_id);
    console.log("Sibling photos in the group:", JSON.stringify(siblingPhotos, null, 2));
    const { data: group } = await supabase.from('groups').select('*').eq('id', item.group_id).maybeSingle();
    console.log("Group info:", JSON.stringify(group, null, 2));
  } else {
    const { data: group } = await supabase.from('groups').select('*').eq('id', '2b96665d-bb1a-455d-a235-34d412176dca').maybeSingle();
    if (group) {
        console.log("Found as group:", JSON.stringify(group, null, 2));
        const { data: photos } = await supabase.from('furniture_items').select('*').eq('group_id', group.id);
        console.log("Photos in this group:", JSON.stringify(photos, null, 2));
    } else {
        console.log("Not found as group or furniture item.");
    }
  }
}
run();
