import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { api } from '@/lib/api';

export const ungroupPhotos = async (groupId: string): Promise<void> => {
  const res = await api.groups.ungroup.$post({
    json: { groupId }
  });
  if (!res.ok) throw ErrorFactory.fatal('Ungroup failed', { context: 'groupUtils' });
};

export const syncGroupMemberCount = async (groupId: string): Promise<void> => {
  if (!groupId) return;
  const res = await api.groups['sync-count'].$post({
    json: { groupId }
  });
  if (!res.ok) throw ErrorFactory.fatal('Sync count failed', { context: 'groupUtils' });
};
