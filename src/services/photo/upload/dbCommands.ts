import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { Photo } from '../../../types';
import { api } from '@/lib/api';

export const upsertPhotoRecord = async (payload: Record<string, unknown>): Promise<unknown> => {
    const res = await api.photos.upsert.$post({
        json: { payload }
    });
    if (!res.ok) {
        let errorMsg = 'Upsert photo failed';
        try {
            const errJson = await res.json();
            if (errJson && errJson.error) {
                errorMsg = `${errorMsg}: ${errJson.error}`;
            }
        } catch (_) {}
        throw ErrorFactory.fatal(errorMsg, { context: 'dbCommands' });
    }
    const { data } = await res.json();
    return data;
};

export const syncPhotoTagsInDB = async (photoId: string, tagIds: string[]): Promise<void> => {
  const res = await api.tags['sync-photo-tags'].$post({
      json: { photoId, tagIds }
  });
  if (!res.ok) throw ErrorFactory.fatal('Sync photo tags failed', { context: 'dbCommands' });
};
