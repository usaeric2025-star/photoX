import { PhotoListItemSchema } from '@/types/api';
import { logger } from '@/lib/logger';

const validatedIds = new Set<string>();

export const assertPhotoListItem = (data: unknown) => {
  const isDev = typeof window !== 'undefined' && (import.meta.env?.DEV || false);
  if (isDev) {
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
