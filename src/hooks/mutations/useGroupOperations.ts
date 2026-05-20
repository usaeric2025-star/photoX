import { useMutation, useQueryClient } from '@tanstack/react-query';
import { groupPhotos, ungroupPhotos, removePhotosFromGroup } from '../../services/photoMutationService';
import { useFeedback, useInvalidatePhotos } from '../';

export const useGroupPhotosMutation = () => {
  const queryClient = useQueryClient();
  const { showError } = useFeedback();
  const invalidatePhotos = useInvalidatePhotos();

  return useMutation({
    mutationFn: async (photoIds: string[]) => {
      const newGroupId = crypto.randomUUID();
      await groupPhotos(photoIds, newGroupId);
      return { photoIds, newGroupId };
    },
    onMutate: async (photoIds) => {
      await queryClient.cancelQueries({ queryKey: ['photos'] });
      await queryClient.cancelQueries({ queryKey: ['groups'] });

      const tempGroupId = crypto.randomUUID();
      const previousInfinite = queryClient.getQueriesData({ queryKey: ['photos', 'infinite'] });

      const idSet = new Set(photoIds);
      queryClient.setQueriesData({ queryKey: ['photos', 'infinite'] }, (old: any) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            photos: page.photos.map((photo: any) => {
              if (idSet.has(photo.id)) {
                return {
                  ...photo,
                  groupId: tempGroupId,
                  group_id: tempGroupId,
                  isGroupCover: false,
                  is_group_cover: false
                };
              }
              return photo;
            })
          }))
        };
      });

      return { previousInfinite, tempGroupId };
    },
    onSuccess: (data, variables, context) => {
      const finalGroupId = data.newGroupId;
      queryClient.setQueriesData({ queryKey: ['photos', 'infinite'] }, (old: any) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            photos: page.photos.map((photo: any) => {
              if (photo.groupId === context?.tempGroupId || photo.group_id === context?.tempGroupId) {
                return {
                  ...photo,
                  groupId: finalGroupId,
                  group_id: finalGroupId
                };
              }
              return photo;
            })
          }))
        };
      });

      invalidatePhotos();
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (error: any, photoIds, context) => {
      if (context?.previousInfinite) {
        context.previousInfinite.forEach(([queryKey, value]) => {
          queryClient.setQueryData(queryKey, value);
        });
      }
      showError(error, '群组创建失败');
    }
  });
};

export const useRemoveFromGroupMutation = () => {
  const queryClient = useQueryClient();
  const { showError } = useFeedback();
  const invalidatePhotos = useInvalidatePhotos();

  return useMutation({
    mutationFn: ({ photoIds, groupId }: { photoIds: string[]; groupId: string }) => 
      removePhotosFromGroup(photoIds, groupId),
    onMutate: async ({ photoIds, groupId }) => {
      await queryClient.cancelQueries({ queryKey: ['photos'] });
      await queryClient.cancelQueries({ queryKey: ['groups'] });

      const previousInfinite = queryClient.getQueriesData({ queryKey: ['photos', 'infinite'] });
      const idSet = new Set(photoIds);

      let remainingSameGroupCount = 0;
      previousInfinite.forEach(([_, value]: any) => {
        if (value?.pages) {
          value.pages.forEach((page: any) => {
            page.photos.forEach((photo: any) => {
              if ((photo.groupId === groupId || photo.group_id === groupId) && !idSet.has(photo.id)) {
                remainingSameGroupCount++;
              }
            });
          });
        }
      });

      const shouldDissolveEntireGroup = remainingSameGroupCount <= 1;

      queryClient.setQueriesData({ queryKey: ['photos', 'infinite'] }, (old: any) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            photos: page.photos.map((photo: any) => {
              if (idSet.has(photo.id)) {
                return {
                  ...photo,
                  groupId: null,
                  group_id: null,
                  isGroupCover: false,
                  is_group_cover: false,
                  isPinned: false,
                  is_pinned: false
                };
              }
              if (shouldDissolveEntireGroup && (photo.groupId === groupId || photo.group_id === groupId)) {
                return {
                  ...photo,
                  groupId: null,
                  group_id: null,
                  isGroupCover: false,
                  is_group_cover: false,
                  isPinned: false,
                  is_pinned: false
                };
              }
              return photo;
            })
          }))
        };
      });

      return { previousInfinite };
    },
    onSuccess: () => {
      invalidatePhotos();
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (error: any, variables, context) => {
      if (context?.previousInfinite) {
        context.previousInfinite.forEach(([queryKey, value]) => {
          queryClient.setQueryData(queryKey, value);
        });
      }
      showError(error, '移出群组失败');
    }
  });
};

export const useUngroupMutation = () => {
  const queryClient = useQueryClient();
  const { showError } = useFeedback();
  const invalidatePhotos = useInvalidatePhotos();

  return useMutation({
    mutationFn: (groupId: string) => ungroupPhotos(groupId),
    onMutate: async (groupId) => {
      await queryClient.cancelQueries({ queryKey: ['photos'] });
      await queryClient.cancelQueries({ queryKey: ['groups'] });

      const previousInfinite = queryClient.getQueriesData({ queryKey: ['photos', 'infinite'] });

      queryClient.setQueriesData({ queryKey: ['photos', 'infinite'] }, (old: any) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            photos: page.photos.map((photo: any) => {
              if (photo.groupId === groupId || photo.group_id === groupId) {
                return {
                  ...photo,
                  groupId: null,
                  group_id: null,
                  isGroupCover: false,
                  is_group_cover: false,
                  isPinned: false,
                  is_pinned: false
                };
              }
              return photo;
            })
          }))
        };
      });

      return { previousInfinite };
    },
    onSuccess: () => {
      invalidatePhotos();
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (error: any, variables, context) => {
      if (context?.previousInfinite) {
        context.previousInfinite.forEach(([queryKey, value]) => {
          queryClient.setQueryData(queryKey, value);
        });
      }
      showError(error, '取消群组失败');
    }
  });
};

export const useDeleteGroupFromCloudMutation = () => {
  const queryClient = useQueryClient();
  const { showError } = useFeedback();
  const invalidatePhotos = useInvalidatePhotos();

  return useMutation({
    mutationFn: (groupId: string) => ungroupPhotos(groupId),
    onMutate: async (groupId) => {
      await queryClient.cancelQueries({ queryKey: ['photos'] });
      await queryClient.cancelQueries({ queryKey: ['groups'] });

      const previousInfinite = queryClient.getQueriesData({ queryKey: ['photos', 'infinite'] });

      queryClient.setQueriesData({ queryKey: ['photos', 'infinite'] }, (old: any) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            photos: page.photos.map((photo: any) => {
              if (photo.groupId === groupId || photo.group_id === groupId) {
                return {
                  ...photo,
                  groupId: null,
                  group_id: null,
                  isGroupCover: false,
                  is_group_cover: false,
                  isPinned: false,
                  is_pinned: false
                };
              }
              return photo;
            })
          }))
        };
      });

      return { previousInfinite };
    },
    onSuccess: () => {
      invalidatePhotos();
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (error: any, variables, context) => {
      if (context?.previousInfinite) {
        context.previousInfinite.forEach(([queryKey, value]) => {
          queryClient.setQueryData(queryKey, value);
        });
      }
      showError(error, '删除群组失败');
    }
  });
};
