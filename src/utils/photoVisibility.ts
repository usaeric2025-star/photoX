import { Photo } from '../types';

export const filterPhotosByMode = (
  photos: Photo[],
  isAdminMode: boolean
): Photo[] => {
  if (!photos) return [];
  if (isAdminMode) return photos;
  return photos.filter((p) => !p.is_hidden || p.isGroupCover);
};
