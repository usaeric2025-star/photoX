import { PhotoListItemSchema } from '@/types/api/photos';
import { logger } from '@/lib/logger';

const validatedIds = new Set<string>();

export const assertPhotoListItem = (data: unknown) => {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    // DEV: Full check
    const result = PhotoListItemSchema.array().assert(data);
    return result;
  }
  
  // PROD: First check only (per data item)
  if (Array.isArray(data)) {
    data.forEach((item: any) => {
      if (!validatedIds.has(item.id)) {
        PhotoListItemSchema.assert(item);
        validatedIds.add(item.id);
      }
    });
  }
  return data;
};
