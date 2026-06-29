import type { Photo } from '@/types/photo';
import type { LightboxSlide } from './types';
import { getThumbnailUrl } from '@/services/mappers/utils';

/**
 * 將 Photo 轉換為燈箱所需的 Slide 格式
 * 處理多語系物件及欄位不一致 (image_url vs imageUrl)
 */
export function photoToLightboxSlide(photo: Record<string, unknown> | Photo): LightboxSlide {
  // 優先使用原始 URL
  const src = (photo.imageUrl || photo.image_url) as string | undefined;

  // Generate srcSet for responsive loading only if worker is available
  let srcSet: string | undefined;
  const env = import.meta.env;
  const workerUrl = env?.VITE_IMAGE_WORKER_URL;
  if (src && workerUrl) {
    const hash = (photo.image_hash || photo.imageHash) as string | undefined;
    const w400 = getThumbnailUrl(src, 400, undefined, hash);
    const w800 = getThumbnailUrl(src, 800, undefined, hash);
    const w1200 = getThumbnailUrl(src, 1200, undefined, hash);
    srcSet = `${w400} 400w, ${w800} 800w, ${w1200} 1200w`;
  }
  
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
    srcSet,
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
