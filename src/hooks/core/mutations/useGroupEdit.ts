import { createMutationHook } from './factory';
import { groupPhotos, removePhotosFromGroup } from '@/services/photo/commands';
import { ungroupPhotos } from '@/services/photo/photoMaintenanceService';
import { QueryClient } from '@tanstack/react-query';

export const useGroupEdit = createMutationHook({
  entity: 'Group',
  action: 'Edit',
  mutationFn: ({ photoIds, groupId }: { photoIds: string[]; groupId: string }) => 
    removePhotosFromGroup(photoIds, groupId),
  invalidateKeys: [['groups'], ['photos']],
  onSuccessMessage: '已移出群组',
  optimisticUpdate: async ({ photoIds }: { photoIds: string[]; groupId: string }, queryClient: QueryClient) => {
    await queryClient.cancelQueries({ queryKey: ['photos'] });
    await queryClient.cancelQueries({ queryKey: ['groups'] });

    const previousQueries = queryClient.getQueriesData({ queryKey: ['photos'] });

    queryClient.setQueriesData({ queryKey: ['photos'] }, (old: any) => {
      if (!old) return old;
      if (old.pages) {
        return {
          ...old,
          pages: old.pages.map((page: any) => {
            if (!page || !page.photos) return page;
            return {
              ...page,
              photos: page.photos.map((photo: any) => {
                if (photoIds.includes(photo.id)) {
                  return { ...photo, group_id: null, is_group_cover: false };
                }
                return photo;
              }),
            };
          }),
        };
      }
      if (Array.isArray(old)) {
        return old.map((photo: any) => {
          if (photoIds.includes(photo.id)) {
            return { ...photo, group_id: null, is_group_cover: false };
          }
          return photo;
        });
      }
      return old;
    });

    return { previousQueries };
  },
  rollback: (err, variables, context: any, queryClient: QueryClient) => {
    if (context && context.previousQueries) {
      context.previousQueries.forEach(([queryKey, value]: any) => {
        queryClient.setQueryData(queryKey, value);
      });
    }
  },
});

export const useGroupPhotosMutation = createMutationHook({
  entity: 'Group',
  action: 'GroupPhotos',
  mutationFn: async ({ photoIds, targetGroupId, expandGroups }: { photoIds: string[], targetGroupId?: string, expandGroups?: boolean }) => {
    const finalGroupId = targetGroupId || crypto.randomUUID();
    const result = await groupPhotos(photoIds, finalGroupId, expandGroups);
    return { photoIds: result.finalPhotoIds || photoIds, newGroupId: finalGroupId };
  },
  invalidateKeys: [['photos'], ['groups']],
  onSuccessMessage: '合组成功',
  optimisticUpdate: async ({ photoIds, targetGroupId }: { photoIds: string[], targetGroupId?: string }, queryClient: QueryClient) => {
    await queryClient.cancelQueries({ queryKey: ['photos'] });
    await queryClient.cancelQueries({ queryKey: ['groups'] });

    const finalGroupId = targetGroupId || 'temp-' + crypto.randomUUID();

    const previousQueries = queryClient.getQueriesData({ queryKey: ['photos'] });
    const previousGroups = queryClient.getQueriesData({ queryKey: ['groups'] });

    // Gather all existing group IDs of the selected photoIds
    const affectedGroupIds = new Set<string>();
    previousQueries.forEach(([_, old]: any) => {
      if (!old) return;
      const list = old.pages ? old.pages.flatMap((p: any) => p?.photos || []) : (Array.isArray(old) ? old : []);
      list.forEach((photo: any) => {
        if (photo && photoIds.includes(photo.id) && photo.group_id) {
          affectedGroupIds.add(photo.group_id);
        }
      });
    });

    const expandedPhotoIds = new Set<string>(photoIds);
    if (affectedGroupIds.size > 0) {
      previousQueries.forEach(([_, old]: any) => {
        if (!old) return;
        const list = old.pages ? old.pages.flatMap((p: any) => p?.photos || []) : (Array.isArray(old) ? old : []);
        list.forEach((photo: any) => {
          if (photo && photo.group_id && affectedGroupIds.has(photo.group_id)) {
            expandedPhotoIds.add(photo.id);
          }
        });
      });
    }
    const finalPhotoIdsList = Array.from(expandedPhotoIds);

    queryClient.setQueriesData({ queryKey: ['photos'] }, (old: any) => {
      if (!old) return old;
      if (old.pages) {
        return {
          ...old,
          pages: old.pages.map((page: any) => {
            if (!page || !page.photos) return page;
            return {
              ...page,
              photos: page.photos.map((photo: any) => {
                if (finalPhotoIdsList.includes(photo.id)) {
                  return { ...photo, group_id: finalGroupId, is_group_cover: false };
                }
                return photo;
              }),
            };
          }),
        };
      }
      if (Array.isArray(old)) {
        return old.map((photo: any) => {
          if (finalPhotoIdsList.includes(photo.id)) {
            return { ...photo, group_id: finalGroupId, is_group_cover: false };
          }
          return photo;
        });
      }
      return old;
    });

    queryClient.setQueriesData({ queryKey: ['groups'] }, (old: any) => {
      if (!old) return old;
      if (old.pages) {
        return {
          ...old,
          pages: old.pages.map((page: any) => {
            if (!page || !page.groups) return page;
            const existingGroupIdx = page.groups.findIndex((g: any) => g.id === finalGroupId);
            if (existingGroupIdx > -1) {
              const updatedGroups = [...page.groups];
              updatedGroups[existingGroupIdx] = {
                ...updatedGroups[existingGroupIdx],
                member_count: photoIds.length,
              };
              return { ...page, groups: updatedGroups };
            }
            return {
              ...page,
              groups: [
                {
                  id: finalGroupId,
                  name: '新合并群组',
                  description: '',
                  member_count: photoIds.length,
                  is_hidden: false,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                ...page.groups,
              ],
            };
          }),
        };
      }
      if (Array.isArray(old)) {
        const existingGroupIdx = old.findIndex((g: any) => g.id === finalGroupId);
        if (existingGroupIdx > -1) {
          const updated = [...old];
          updated[existingGroupIdx] = {
            ...updated[existingGroupIdx],
            member_count: photoIds.length,
          };
          return updated;
        }
        return [
          {
            id: finalGroupId,
            name: '新合并群组',
            description: '',
            member_count: photoIds.length,
            is_hidden: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          ...old,
        ];
      }
      return old;
    });

    return { previousQueries, previousGroups };
  },
  rollback: (err, variables, context: any, queryClient: QueryClient) => {
    if (context) {
      if (context.previousQueries) {
        context.previousQueries.forEach(([queryKey, value]: any) => {
          queryClient.setQueryData(queryKey, value);
        });
      }
      if (context.previousGroups) {
        context.previousGroups.forEach(([queryKey, value]: any) => {
          queryClient.setQueryData(queryKey, value);
        });
      }
    }
  },
});

export const useRemoveFromGroupMutation = useGroupEdit;

export const useUngroupMutation = createMutationHook({
  entity: 'Group',
  action: 'Ungroup',
  mutationFn: (groupId: string) => ungroupPhotos(groupId),
  invalidateKeys: [['groups']],
  onSuccessMessage: '群组已解散',
});

export const useDeleteGroupFromCloudMutation = createMutationHook({
  entity: 'Group',
  action: 'Delete',
  mutationFn: (groupId: string) => ungroupPhotos(groupId),
  invalidateKeys: [['groups']],
  onSuccessMessage: '群组已删除',
});
