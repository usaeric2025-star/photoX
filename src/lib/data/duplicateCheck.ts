import { supabase } from '@/lib/supabase';
import { DB_CONFIG } from '@/constants/config';
import { Photo } from '@/types';

export class DuplicatePhotoError extends Error {
  constructor(message: string = '已存在相同照片') {
    super(message);
    this.name = 'DuplicatePhotoError';
  }
}

const memoryPseudoHashes = new Set<string>();
const memoryImageHashes = new Set<string>();

/**
 * Unified Deduplication Check
 */
export const checkDuplicate = async (
  userId: string,
  imageHash: string,
  fileSize?: number,
  fileName?: string,
  lastModified?: number,
  photoId?: string // <-- Added parameter for update case
): Promise<boolean> => {
  // 1. Check Memory Cache (fast pseudo hash)
  if (fileName && fileSize && lastModified) {
    const pseudoHash = `${fileName}_${fileSize}_${lastModified}`;
    // If not matching my own ID (skip for now since memory hash doesn't store ID)
    if (memoryPseudoHashes.has(pseudoHash) && !photoId) {
      return true;
    }
  }

  // Check Memory Cache (MD5 hash)
  if (memoryImageHashes.has(imageHash) && !photoId) {
    return true;
  }

  // 2. Check Database for MD5 (strongest guarantee)
  try {
    const { data, error } = await supabase
      .from(DB_CONFIG.TABLE_NAME)
      .select('id')
      .eq('image_hash', imageHash)
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (data && data.id) {
      // If we are updating an existing photo, and the mathing ID is the same, it's NOT a duplicate upload
      if (photoId && data.id === photoId) {
        return false;
      }
      
      if (fileName && fileSize && lastModified) {
        memoryPseudoHashes.add(`${fileName}_${fileSize}_${lastModified}`);
      }
      memoryImageHashes.add(imageHash);
      return true;
    }
  } catch (error) {
    console.warn('DB check timeout or error, proceeding with caution', error);
  }

  // Mark as processing / exists in local cache so concurrent requests get blocked
  if (fileName && fileSize && lastModified) {
    memoryPseudoHashes.add(`${fileName}_${fileSize}_${lastModified}`);
  }
  memoryImageHashes.add(imageHash);

  return false;
};
