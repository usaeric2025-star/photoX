import { Photo, User } from '../types';
import { cleanObject } from '../services/utils';
import { formatDate } from '../utils/dateFormat';
import { saveData } from '../utils/indexedDB';
import { savePhotoToCloud } from '../services/photoMutationService';

export const usePhotoMutations = (
  user: User | null,
  setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>,
  showToast: (msg: string, type?: any) => void,
  handleError: (error: any, context?: string) => void,
  deletePhotos: (ids: string | string[]) => Promise<{ success: boolean; error?: any }>,
  photosRef: React.MutableRefObject<Photo[]>
) => {
  const deletePhoto = async (idOrIds: string | string[]) => {
    const { success, error } = await deletePhotos(idOrIds);
    if (!success) {
      handleError(error, '删除照片失败');
    } else {
      showToast('照片已成功删除', 'success');
    }
  };

  const updatePhoto = async (updatedPhoto: Photo) => {
    const photoWithTime = { ...updatedPhoto, updatedAt: formatDate(new Date()) };
    setPhotos(prev => prev.map(p => p.id === photoWithTime.id ? photoWithTime : p));
    
    const nextPhotos = photosRef.current.map(p => p.id === photoWithTime.id ? photoWithTime : p);
    photosRef.current = nextPhotos;
    saveData('product_photos', nextPhotos);
    
    if (user) {
       await savePhotoToCloud(user.id, photoWithTime).catch(e => console.error("Update photo cloud sync failed:", e));
    }
  };

  return { deletePhoto, updatePhoto };
};
