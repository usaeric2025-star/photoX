import useSWR, { useSWRConfig } from 'swr';
import { loadGroupsFromCloud, getGroupById } from './queries';
import { api } from '@/lib/api';
import { ProductGroup } from '@/types';
import { queryKeys } from '@/lib/query/keys';
import { errorService } from '@/services/error';

export function useGroups(userId: string, isAdmin: boolean = false) {
  const { data, error, isLoading, mutate } = useSWR<ProductGroup[], any>(
    [queryKeys.groups.all, userId, isAdmin],
    () => loadGroupsFromCloud(userId, isAdmin),
    {}
  );

  return {
    groups: data || [],
    isLoading,
    error,
    mutate,
  };
}

export function useGroupDetail(groupId: string | null, isAdmin: boolean = false) {
  const { data, error, isLoading, mutate } = useSWR<ProductGroup | undefined, any>(
    groupId ? [queryKeys.groups.detail(groupId, isAdmin), isAdmin] : null,
    async () => {
      const group = await getGroupById(groupId!, isAdmin ? 'admin' : 'public');
      return group || undefined;
    },
    {}
  );

  return {
    group: data,
    isLoading,
    error,
    mutate,
  };
}

export function useGroupMutations() {
  const { mutate } = useSWRConfig();

  const create = async (name: string, userId: string) => {
    try {
      await api.groups.$post({ json: { groupData: { name, user_id: userId } } });
      mutate(queryKeys.groups.all);
    } catch (e) {
      errorService.handle(e, { context: 'group.create' });
      throw e;
    }
  };

  const update = async (id: string, name: string) => {
    try {
      await api.groups[':id'].$put({ param: { id }, json: { updates: { name } } });
      mutate(queryKeys.groups.all);
      mutate(queryKeys.groups.detail(id, false));
    } catch (e) {
      errorService.handle(e, { context: 'group.update' });
      throw e;
    }
  };

  const remove = async (id: string) => {
    try {
      await api.groups[':id'].$delete({ param: { id } });
      mutate(queryKeys.groups.all);
    } catch (e) {
      errorService.handle(e, { context: 'group.delete' });
      throw e;
    }
  };

  const setCover = async (groupId: string, photoId: string) => {
    try {
      await api.groups['set-cover'].$post({ json: { photoId, groupId } });
      mutate(queryKeys.groups.detail(groupId, false));
    } catch (e) {
      errorService.handle(e, { context: 'group.setCover' });
      throw e;
    }
  };

  const combine = async (photoIds: string[], targetGroupId: string) => {
    try {
      await api.groups['group-photos'].$post({ json: { photoIds, targetGroupId } });
      mutate(queryKeys.groups.all);
    } catch (e) {
      errorService.handle(e, { context: 'group.combine' });
      throw e;
    }
  };

  const movePhotos = async (groupId: string, photoIds: string[]) => {
    try {
      await api.groups['move-photos'].$post({ json: { photoIds, targetGroupId: groupId } });
      mutate(queryKeys.groups.all);
      mutate(queryKeys.groups.detail(groupId, false));
    } catch (e) {
      errorService.handle(e, { context: 'group.movePhotos' });
      throw e;
    }
  };

  const dissolve = async (groupId: string) => {
    try {
      await api.groups[':id']['ungroup'].$post({ param: { id: groupId } });
      mutate(queryKeys.groups.all);
    } catch (e) {
      errorService.handle(e, { context: 'group.dissolve' });
      throw e;
    }
  };

  return {
    create,
    update,
    remove,
    setCover,
    combine,
    movePhotos,
    dissolve,
  };
}
