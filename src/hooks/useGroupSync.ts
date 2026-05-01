import { useCallback } from 'react';
import { useAdminPhoto, useAdminUI } from '../context/AdminContexts';
import { updatePhotosGroupInCloud } from '../services/photoService';

export function useGroupSync(activeGroupId: string | null) {
  const { photos, setPhotos } = useAdminPhoto();
  const { setAlertDialog, showToast, withLoading } = useAdminUI();

  const syncCategory = useCallback(async (categoryId: string) => {
    if (!activeGroupId) return;
    const groupPhotos = photos.filter(p => p.groupId === activeGroupId);
    if (!groupPhotos.some(p => p.categoryId !== categoryId)) return;
    
    setAlertDialog({
      title: '同步分類',
      message: '這將把該群組內所有照片的分類都設為與這張相同。確定要執行嗎？',
      onConfirm: async () => {
        setAlertDialog(null);
        await withLoading('saving', async () => {
          try {
            await updatePhotosGroupInCloud(groupPhotos.map(p => p.id), { category_id: categoryId });
            setPhotos(prev => prev.map(p => p.groupId === activeGroupId ? { ...p, categoryId } : p));
            showToast('同步分類成功', 'success');
          } catch (err: any) {
            showToast(`同步分類失敗: ${err.message}`, 'error');
          }
        });
      }
    });
  }, [activeGroupId, photos, setPhotos, setAlertDialog, showToast, withLoading]);

  const syncTags = useCallback(async () => {
    if (!activeGroupId) return;
    const groupPhotos = photos.filter(p => p.groupId === activeGroupId);
    const coverPhoto = groupPhotos.find(p => p.isGroupCover) || groupPhotos[0];
    if (!coverPhoto) return;
    
    setAlertDialog({
      title: '同步標籤',
      message: '這將把該群組內所有照片的標籤都設為與封面照片相同。確定要執行嗎？',
      onConfirm: async () => {
        setAlertDialog(null);
        await withLoading('saving', async () => {
          try {
            const others = groupPhotos.filter(p => p.id !== coverPhoto.id);
            if (others.length > 0) {
              await updatePhotosGroupInCloud(others.map(p => p.id), { tags: coverPhoto.tagIds });
              setPhotos(prev => prev.map(p => p.groupId === activeGroupId ? { ...p, tagIds: coverPhoto.tagIds } : p));
            }
            showToast('同步標籤成功', 'success');
          } catch (err: any) {
            showToast(`同步標籤失敗: ${err.message}`, 'error');
          }
        });
      }
    });
  }, [activeGroupId, photos, setPhotos, setAlertDialog, showToast, withLoading]);

  const setCover = useCallback(async (photoId: string) => {
    if (!activeGroupId) return;
    const groupPhotos = photos.filter(p => p.groupId === activeGroupId);
    
    setAlertDialog({
      title: '設為封面',
      message: '確定要將這張照片設為群組封面嗎？',
      onConfirm: async () => {
        setAlertDialog(null);
        await withLoading('saving', async () => {
          try {
            const others = groupPhotos.filter(p => p.id !== photoId);
            if (others.length > 0) {
              await updatePhotosGroupInCloud(others.map(p => p.id), { is_group_cover: false });
            }
            await updatePhotosGroupInCloud([photoId], { is_group_cover: true });
            
            setPhotos(prev => prev.map(p => p.groupId === activeGroupId ? { ...p, isGroupCover: p.id === photoId } : p));
            showToast('已設為封面', 'success');
          } catch (err: any) {
            showToast(`設為封面失敗: ${err.message}`, 'error');
          }
        });
      }
    });
  }, [activeGroupId, photos, setPhotos, setAlertDialog, showToast, withLoading]);

  return { syncCategory, syncTags, setCover };
}
