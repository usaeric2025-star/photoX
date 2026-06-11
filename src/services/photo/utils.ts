import { supabase } from '../../lib/supabase';
import { Tag } from '../../types';
import { safeArray } from '../../lib/utils';

const NEVER_ALLOWED = ['isAnalyzing', 'exif_data', 'is_hidden', 'tempId', 'isSelected', 'isDragging', 'rawResponse'];

export const cleanObject = <T extends Record<string, unknown>>(obj: T): T => {
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
 * Get a fresh UUID
 */
export const getDatabaseUUID = async (): Promise<string> => {
  return crypto.randomUUID(); 
};

// Tag management utils to unify conversion
export const getTagIds = (tags: Tag[] | undefined) => safeArray<Tag>(tags).map(t => String(t.id));

export const getTagsFromIds = (ids: string[], allAvailableTags: Tag[]) => 
  ids.map(id => allAvailableTags.find(t => String(t.id) === id)).filter(Boolean) as Tag[];
