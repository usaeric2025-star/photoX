import { api } from '@/lib/api';

export const movePhotosToGroup = async (photoIds: string[], targetGroupId: string | null): Promise<void> => {
  const res = await api.groups['move-photos'].$post({
      json: { photoIds, targetGroupId }
  });
  if (!res.ok) throw new Error('Move photos failed');
};

export const setGroupCover = async (photoId: string | null, groupId: string): Promise<void> => {
  if (!groupId) throw new Error('GroupId is required');
  const res = await api.groups['set-cover'].$post({
      json: { photoId, groupId }
  });
  if (!res.ok) throw new Error('Set photo cover failed');
};
