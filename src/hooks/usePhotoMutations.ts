import { Photo, User } from '../types';
import { formatDate } from '../utils/dateFormat';
import { saveData } from '../utils/indexedDB';

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

  const updatePhoto = async (id: string, updates: Partial<Photo>) => {
    const updatedAt = formatDate(new Date());
    const finalUpdates = { ...updates, updatedAt };
    
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, ...finalUpdates } : p));
    
    const nextPhotos = photosRef.current.map(p => p.id === id ? { ...p, ...finalUpdates } : p);
    photosRef.current = nextPhotos;
    saveData('product_photos', nextPhotos);
    
    if (user) {
       // Import the service dynamically or use injected if preferred, 
       // but here we use the one from photoMutationService.
       const m = await import('../services/photoMutationService');
       await m.updatePhoto(id, finalUpdates).catch(e => console.error("Update photo cloud sync failed:", e));
    }
  };

  return { deletePhoto, updatePhoto };
};
