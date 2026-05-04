import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vbpnlkeweqkjufijtdph.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_mXZxsfqH-fATbT2g9fiX7A_-VfzOwa8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const BUCKET_NAME = 'furniture_images';
export const TABLE_NAME = 'furniture_items';
