import { PhotoListItem } from '@/types/api';
import type { LightboxSlide } from './types';
import { getThumbnailUrl } from '@/services/mappers/utils';

export function photosToLightboxSlides(photos: PhotoListItem[]): LightboxSlide[] {
  return photos.map(photo => ({
    id: photo.id,
    src: getThumbnailUrl(photo.imageUrl, 1200) || photo.imageUrl,
    description: photo.name,
    type: 'image',
    alt: photo.name
  }));
}
