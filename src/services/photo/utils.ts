import { supabase } from '../../lib/supabase';

const NEVER_ALLOWED = ['isAnalyzing', 'exif_data', 'is_hidden', 'tempId', 'isSelected', 'isDragging', 'rawResponse'];

export const cleanObject = <T extends Record<string, any>>(obj: T): T => {
    const cleaned = { ...obj };
    for (const key of NEVER_ALLOWED) {
        delete cleaned[key];
    }
    return cleaned;
};

export const generateItemCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed O, I, 1, 0
  let random = '';
  // Increased to 8 characters for much lower collision probability (approx 1 in 2.8 trillion)
  for (let i = 0; i < 8; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `X-${random}`; // e.g. X-A8B9C2D4
};

/**
 * Derives a short, human-readable code from a UUID for display purposes.
 * This ensures consistency when talking to AI or searching manually.
 */
export const getDisplayGroupCode = (groupId?: string | null): string => {
  if (!groupId) return '';
  // Use the last 6 characters of the UUID, prefixed with G-
  const short = groupId.split('-').pop()?.slice(-6).toUpperCase() || '';
  return `G-${short}`;
};

/**
 * Get a fresh UUID from the database
 */
export const getDatabaseUUID = async (): Promise<string> => {
  const { data, error } = await supabase.rpc('get_uuid_v4');
  if (!error && data) return data;
  return crypto.randomUUID(); 
};
