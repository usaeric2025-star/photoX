import { Photo, User } from '@/types';
import { checkImageHashExists } from '@/services/photoService';

export const useDuplicateCheck = (
  photosRef: React.MutableRefObject<Photo[]>,
  sessionHashes: Set<string>,
  user: User | null
) => {
  const isDuplicate = async (hash: string): Promise<boolean> => {
    // Check locally in current UI ref
    const isLocalDuplicate = photosRef.current.some(p => p.image_hash === hash);
    if (isLocalDuplicate) return true;

    // Check in current session upload list
    if (sessionHashes.has(hash)) return true;

    // Check in cloud database
    const isStaff = !!user || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('isStaffMode') === 'true');
    if (isStaff) {
      const existsInCloud = await checkImageHashExists(hash);
      if (existsInCloud) return true;
    }

    return false;
  };

  return { isDuplicate };
};
