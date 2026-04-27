import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL || 'https://vbpnlkeweqkjufijtdph.supabase.co', process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_mXZxsfqH-fATbT2g9fiX7A_-VfzOwa8');
async function run() {
  const { data: settings } = await supabase.from('settings').select('*').eq('id', 1).single();
  const original = settings.tags_json;
  
  const tags = JSON.parse(original || '[]');
  tags.push({ name: 'TEST_TAG', aliases: [] });
  
  await supabase.from('settings').update({ tags_json: JSON.stringify(tags) }).eq('id', 1);
  
  const { data: newSettings } = await supabase.from('settings').select('*').eq('id', 1).single();
  const newTags = JSON.parse(newSettings.tags_json || '[]');
  console.log("Last tag has ID?", newTags[newTags.length - 1].id);
  
  // Cleanup
  await supabase.from('settings').update({ tags_json: original }).eq('id', 1);
}
run();
