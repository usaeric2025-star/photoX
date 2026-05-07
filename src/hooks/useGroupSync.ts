import { useCallback } from 'react';
import { useAdminPhoto, useAdminUI } from '../context/AdminContexts';
import { updatePhotosGroupInCloud } from '../services/photoSyncService';

export function useGroupSync(activeGroupId: string | null) {
  const { photos, setPhotos } = useAdminPhoto();
  const { setAlertDialog, showToast, withLoading } = useAdminUI();

  const setCover = useCallback(async (photoId: string) => {
    if (!activeGroupId) return;
    const groupPhotos = photos.filter(p => p.groupId === activeGroupId);
    
    setAlertDialog({
      title: '设为封面',
      message: '确定要将这张照片设为群组封面吗？',
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
            showToast('已设为封面', 'success');
          } catch (err: any) {
            showToast(`设为封面失败: ${err.message}`, 'error');
          }
        });
      }
    });
  }, [activeGroupId, photos, setPhotos, setAlertDialog, showToast, withLoading]);

  return { setCover };
}
