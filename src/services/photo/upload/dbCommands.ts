import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { Photo } from '@/types';
import { api } from '@/lib/api';

export const upsertPhotoRecord = async (payload: Record<string, unknown>): Promise<unknown> => {
    let res;
    try {
        res = await api.photos.upsert.$post({
            json: { payload }
        });
    } catch (err) {
        throw ErrorFactory.wrap(err instanceof Error ? err : new Error('Network error during upsert'), 'dbCommands.upsertPhotoRecord');
    }

    if (!res.ok) {
        let errorMsg = 'Upsert photo failed';
        try {
            const errJson = await res.json() as any;
            if (errJson && errJson.error) {
                const errorDetail = typeof errJson.error === 'object' ? JSON.stringify(errJson.error) : errJson.error;
                errorMsg = `${errorMsg}: ${errorDetail}`;
            }
        } catch (_) {
            // If json parsing fails, try text
            try {
                const errText = await res.text();
                if (errText) errorMsg = `${errorMsg}: ${errText}`;
            } catch (__) {}
        }
        throw ErrorFactory.fatal(errorMsg, { context: 'dbCommands' });
    }
    
    const { data } = await res.json() as any;
    return data;
};

export const syncPhotoTagsInDB = async (photoId: string, tagIds: string[]): Promise<void> => {
  const res = await api.tags['sync-photo-tags'].$post({
      json: { photoId, tagIds }
  });
  if (!res.ok) throw ErrorFactory.fatal('Sync photo tags failed', { context: 'dbCommands' });
};
