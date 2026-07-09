import { PhotoListItem } from '#src/types/api.js';
import { getPhotoThumb } from '#src/lib/image/thumbnailConfig.js';
import type { LightboxSlide } from './types.js';

export function photosToLightboxSlides(photos: PhotoListItem[]): LightboxSlide[] {
  return photos.map(photo => ({
    id: photo.id,
    src: getPhotoThumb(photo.imageUrl, 'LG', photo.imageHash),
    title: photo.name,
    description: (typeof photo.description === 'object' && photo.description !== null) 
      ? (photo.description as any).zh || (photo.description as any).en || '' 
      : (photo.description as string) || '',
    groupName: photo.groupName || undefined,
    original: photo,
    type: 'image',
    alt: photo.name
  }));
}
