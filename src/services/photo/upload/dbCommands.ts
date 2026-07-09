import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { api } from '#lib/api.js';

export const upsertPhotoRecord = async (payload: Record<string, unknown>): Promise<unknown> => {
  return ErrorFactory.unwrap<unknown>(
    api.photos.upsert.$post({
      json: { payload }
    }),
    'Upsert photo failed'
  );
};

export const syncPhotoTagsInDB = async (photoId: string, tagIds: string[]): Promise<void> => {
  await ErrorFactory.unwrap<void>(
    api.tags['sync-photo-tags'].$post({
      json: { photoId, tagIds }
    }),
    'Sync photo tags failed'
  );
};
