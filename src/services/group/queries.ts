import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { ProductGroup } from '../../types';
import { getSafeText } from '@/features/ai/safeText';
import { api } from '@/lib/api';

export const TABLE_NAME = 'groups';

const mapGroup = (item: any): ProductGroup => ({
  id: item.id as string,
  name: getSafeText(item.name || item.name_zh || item.name_en),
  description: getSafeText(item.description),
  cover_photo_id: (item.coverPhotoId || item.cover_photo_id) as string,
  is_hidden: (item.isHidden ?? item.is_hidden ?? false) as boolean,
  created_at: (item.createdAt || item.created_at) as string,
  updated_at: (item.updatedAt || item.updated_at) as string,
  user_id: (item.userId || item.user_id) as string,
  status: item.status as 'draft' | 'confirmed',
  metadata: (item.metadata || {}) as Record<string, unknown>,
});

export const loadGroupsFromCloud = async (_userId: string, isAdmin: boolean = false): Promise<ProductGroup[]> => {
  try {
    const res = await api.groups.$get({
      query: { isAdminMode: isAdmin ? 'true' : 'false' }
    });
    if (!res.ok) throw new Error('Fetch groups failed');
    const json = await res.json();
    if (!json.success) return [];
    return (json.data || []).map(mapGroup);
  } catch (error: any) {
    throw ErrorFactory.fatal(error.message, { context: 'loadGroupsFromCloud' });
  }
};

export const getGroupById = async (id: string, _mode: 'public' | 'admin' = 'public'): Promise<ProductGroup | null> => {
  try {
    const res = await api.groups[':id'].$get({ param: { id } });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !json.data) return null;
    return mapGroup(json.data);
  } catch (error: any) {
    throw ErrorFactory.fatal(error.message, { context: 'getGroupById' });
  }
};
