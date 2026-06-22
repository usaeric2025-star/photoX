import type { Photo } from '@/types/photo';
import type { LightboxSlide } from './types';

/**
 * 將 Photo 轉換為燈箱所需的 Slide 格式
 * 處理多語系物件及欄位不一致 (image_url vs imageUrl)
 */
export function photoToLightboxSlide(photo: any): LightboxSlide {
  // 優先使用原始 URL
  const src = photo.imageUrl || photo.image_url;
  
  // 處理多語系名稱
  const title = typeof photo.name === 'object' && photo.name !== null 
    ? photo.name.zh || photo.name.en || ''
    : (photo.name as string) || '';

  // 處理多語系描述
  const description = typeof photo.description === 'object' && photo.description !== null
    ? photo.description.zh || photo.description.en || ''
    : (photo.description as string) || photo.note || '';

  return {
    id: photo.id,
    src: src || '', 
    alt: title,
    title: title,
    description: description,
    groupName: photo.groupName as string | undefined,
    price: photo.price,
    itemCode: photo.item_code || photo.itemCode,
  };
}

export function photosToLightboxSlides(photos: any[]): LightboxSlide[] {
  return (photos || [])
    .map(photoToLightboxSlide)
    .filter(slide => !!slide.src);
}
