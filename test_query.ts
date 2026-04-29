import { supabase, TABLE_NAME } from './src/services/client';

async function test() {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select(`
      *,
      photo_tags(
        *
      )
    `)
    .limit(50);
    
  if (data) {
    const withTags = data.filter(d => d.photo_tags && d.photo_tags.length > 0);
    console.log("Found:", withTags.length);
    if (withTags.length > 0) {
      console.log(JSON.stringify(withTags[0].photo_tags, null, 2));
    }
  }
}

test();
