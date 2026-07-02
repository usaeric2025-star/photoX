import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { ProductGroup } from '#src/types/index.js';
import { getSafeText } from '#src/features/ai/safeText.js';
import { api } from '#lib/api.js';

const TABLE_NAME = 'groups';

const mapGroup = (item: Record<string, unknown>): ProductGroup => ({
  id: item.id as string,
  name: getSafeText((item.name || item.nameZh || item.nameEn) as unknown),
  description: getSafeText(item.description as unknown),
  coverPhotoId: (item.coverPhotoId || item.cover_photo_id) as string,
  isHidden: (item.isHidden ?? item.is_hidden ?? false) as boolean,
  createdAt: (item.createdAt || item.created_at) as string,
  updatedAt: (item.updatedAt || item.updated_at) as string,
  userId: (item.userId || item.user_id) as string,
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
  } catch (error: unknown) {
    throw ErrorFactory.fatal(error instanceof Error ? error.message : String(error), { context: 'loadGroupsFromCloud' });
  }
};

export const getGroupById = async (id: string, _mode: 'public' | 'admin' = 'public'): Promise<ProductGroup | null> => {
  try {
    const res = await api.groups[':id'].$get({ param: { id } });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !json.data) return null;
    return mapGroup(json.data);
  } catch (error: unknown) {
    throw ErrorFactory.fatal(error instanceof Error ? error.message : String(error), { context: 'getGroupById' });
  }
};
