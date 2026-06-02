import { supabase } from '../lib/supabase';

const NEVER_ALLOWED = ['isAnalyzing', 'exif_data', 'is_hidden', 'tempId', 'isSelected', 'isDragging', 'rawResponse'];

export const cleanObject = <T extends Record<string, any>>(obj: T): T => {
    const cleaned = { ...obj };
    for (const key of NEVER_ALLOWED) {
        delete cleaned[key];
    }
    return cleaned;
};

export const generateItemCode = (): string => {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let random = '';
  for (let i = 0; i < 6; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `FUR-${date}-${random}`;
};

/**
 * Get a fresh UUID from the database
 */
export const getDatabaseUUID = async (): Promise<string> => {
  const { data, error } = await supabase.rpc('get_uuid_v4');
  if (!error && data) return data;
  return crypto.randomUUID(); 
};
