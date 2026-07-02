import { PhotoListItem } from '#src/types/api.js';
import type { LightboxSlide } from './types.js';
import { getThumbnailUrl } from '#src/services/mappers/utils.js';

export function photosToLightboxSlides(photos: PhotoListItem[]): LightboxSlide[] {
  return photos.map(photo => ({
    id: photo.id,
    src: getThumbnailUrl(photo.imageUrl, 800, 800, photo.imageHash) || photo.imageUrl,
    title: photo.name,
    description: photo.description || '',
    groupName: photo.groupName || undefined,
    original: photo,
    type: 'image',
    alt: photo.name
  }));
}
