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
  status: item.status as 'confirmed' | 'active' | 'rejected',
  metadata: (item.metadata || {}) as Record<string, unknown>,
});

const loadGroupsFromCloud = async (_userId: string, isAdmin: boolean = false): Promise<ProductGroup[]> => {
  const data = await ErrorFactory.unwrap<Record<string, unknown>[]>(
    api.groups.$get({
      query: { isAdminMode: isAdmin ? 'true' : 'false' }
    }),
    'Fetch groups failed'
  );
  return (data || []).map(mapGroup);
};

export const getGroupById = async (id: string, _mode: 'public' | 'admin' = 'public'): Promise<ProductGroup | null> => {
  try {
    const data = await ErrorFactory.unwrap<Record<string, unknown> | null>(
      api.groups[':id'].$get({ param: { id } }),
      'Get group by id failed'
    );
    return data ? mapGroup(data) : null;
  } catch (error) {
    // If it's a 404/not found, we can safely return null or let it throw depending on standard expectation, 
    // but the original code returned null on non-ok statuses, so let's preserve that gracefully.
    return null;
  }
};
