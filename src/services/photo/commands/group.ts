import { withErrorHandling } from '@/lib/error/wrapper';
import { api } from '@/lib/api';
import { ErrorFactory, success } from '@/lib/error/ErrorFactory';
import { AppResult } from '@/types/api';

export const movePhotosToGroup = async (photoIds: string[], targetGroupId: string | null): Promise<AppResult<void>> => {
  return withErrorHandling(async () => {
    const res = await api.groups['move-photos'].$post({
        json: { photoIds, targetGroupId }
    });
    if (!res.ok) throw ErrorFactory.wrap(new Error('Move photos failed'), 'commands');
    return success(undefined);
  }, 'photo.moveToGroup')
}

export const setGroupCover = async (photoId: string | null, groupId: string): Promise<AppResult<void>> => {
  return withErrorHandling(async () => {
    if (!groupId) throw ErrorFactory.wrap(new Error('GroupId is required'), 'commands');
    const res = await api.groups['set-cover'].$post({
        json: { photoId, groupId }
    });
    if (!res.ok) throw ErrorFactory.wrap(new Error('Set photo cover failed'), 'commands');
    return success(undefined);
  }, 'photo.setGroupCover')
}
