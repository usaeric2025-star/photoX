import { Photo } from '@/types';

export const filterPhotosByMode = (
  photos: Photo[],
  isAdminMode: boolean
): Photo[] => {
  if (!photos) return [];
  // ✅ 管理模式：显示全部
  if (isAdminMode) return photos;
  // ✅ 公开页：只显示非隐藏照片（不再特殊处理群组封面）
  return photos.filter((p) => !p.is_hidden);
};
