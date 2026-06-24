import type { Photo } from '@/types/photo';
import type { LightboxSlide } from './types';

/**
 * 將 Photo 轉換為燈箱所需的 Slide 格式
 * 處理多語系物件及欄位不一致 (image_url vs imageUrl)
 */
export function photoToLightboxSlide(photo: Record<string, unknown> | Photo): LightboxSlide {
  // 優先使用原始 URL
  const src = (photo.imageUrl || photo.image_url) as string | undefined;
  
  // 處理多語系名稱
  let title = '';
  if (photo.name && typeof photo.name === 'object') {
    const nameObj = photo.name as Record<string, string>;
    title = nameObj.zh || nameObj.en || '';
  } else if (typeof photo.name === 'string') {
    title = photo.name;
  }

  // 處理多語系描述
  let description = '';
  if (photo.description && typeof photo.description === 'object') {
    const descObj = photo.description as Record<string, string>;
    description = descObj.zh || descObj.en || '';
  } else if (typeof photo.description === 'string') {
    description = photo.description;
  } else if (typeof photo.note === 'string') {
    description = photo.note;
  }

  return {
    id: (photo.id as string) || '',
    src: src || '', 
    alt: title,
    title: title,
    description: description,
    groupName: photo.groupName as string | undefined,
    price: photo.price as string | undefined,
    itemCode: (photo.item_code || photo.itemCode) as string | undefined,
    original: photo
  };
}

export function photosToLightboxSlides(photos: (Record<string, unknown> | Photo)[]): LightboxSlide[] {
  return (photos || [])
    .map(p => photoToLightboxSlide(p))
    .filter(slide => !!slide.src);
}
