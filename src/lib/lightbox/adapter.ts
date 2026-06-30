import { PhotoListItem } from '@/types/api';
import type { LightboxSlide } from './types';
import { getThumbnailUrl } from '@/services/mappers/utils';

export function photosToLightboxSlides(photos: PhotoListItem[]): LightboxSlide[] {
  return photos.map(photo => ({
    id: photo.id,
    src: getThumbnailUrl(photo.imageUrl, 800) || photo.imageUrl,
    title: photo.name,
    description: photo.description || '',
    groupName: photo.groupName || undefined,
    original: photo,
    type: 'image',
    alt: photo.name
  }));
}
