import { supabase } from '../src/lib/supabase';
const run = async () => {
    // try to insert with staff
    const { error: e1 } = await supabase.from('groups').insert({ id: 'd9b9b9b9-9b9b-9b9b-9b9b-9b9b9b9b9b9a', user_id: 'staff', name: {zh:'test'} });
    console.log("Error staff:", e1?.message);

    // try to insert with dummy uuid
    const { error: e2 } = await supabase.from('groups').insert({ id: 'd9b9b9b9-9b9b-9b9b-9b9b-9b9b9b9b9b9a', user_id: '00000000-0000-0000-0000-000000000000', name: {zh:'test'} });
    console.log("Error dummy uuid:", e2?.message);
};
run();
