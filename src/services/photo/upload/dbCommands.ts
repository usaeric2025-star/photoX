import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { withErrorHandling } from '@/lib/error/wrapper';
import { AppResult, success } from '@/lib/error/ErrorFactory';
import { Photo } from '../../../types';

export const upsertPhotoRecord = async (payload: any): Promise<AppResult<unknown>> => {
    return withErrorHandling(async () => {
        const { api } = await import('@/lib/api');
        const res = await api.photos.upsert.$post({
            json: { payload }
        });
        if (!res.ok) throw ErrorFactory.wrap(new Error('Upsert photo failed'), 'dbCommands');
        const { data } = await res.json();
        return data;
    }, 'upsertPhotoRecord');
};

export const syncPhotoTagsInDB = async (photoId: string, tagIds: string[]): Promise<AppResult<void>> => {
    return withErrorHandling(async () => {
      const { api } = await import('@/lib/api');
      const res = await api.tags['sync-photo-tags'].$post({
          json: { photoId, tagIds }
      });
      if (!res.ok) throw ErrorFactory.wrap(new Error('Sync photo tags failed'), 'dbCommands');
    }, 'syncPhotoTagsInDB');
};
