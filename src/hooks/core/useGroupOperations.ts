import { useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { groupPhotos, ungroupPhotos, removePhotosFromGroup } from '@/services/photoService';
import { useFeedback, useInvalidatePhotos } from '@/hooks';
import { Photo } from '@/types';

interface InfinitePhotosData {
  photos: Photo[];
  nextCursor?: string;
}

export const useGroupPhotosMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useFeedback();
  const invalidatePhotos = useInvalidatePhotos();

  return useMutation({
    mutationFn: async (photoIds: string[]) => {
      console.log('useGroupPhotosMutation mutationFn called with photoIds:', photoIds);
      const newGroupId = crypto.randomUUID();
      await groupPhotos(photoIds, newGroupId);
      return { photoIds, newGroupId };
    },
    onMutate: async (photoIds) => {
      await queryClient.cancelQueries({ queryKey: ['photos'] });
      await queryClient.cancelQueries({ queryKey: ['groups'] });

      const tempGroupId = crypto.randomUUID();
      const previousInfinite = queryClient.getQueriesData<InfiniteData<InfinitePhotosData>>({ queryKey: ['photos', 'infinite'] });

      const idSet = new Set(photoIds);
      queryClient.setQueriesData<InfiniteData<InfinitePhotosData>>({ queryKey: ['photos', 'infinite'] }, (old) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            photos: page.photos.map((photo) => {
              if (idSet.has(photo.id)) {
                return {
                  ...photo,
                  group_id: tempGroupId,
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
      queryClient.setQueriesData<InfiniteData<InfinitePhotosData>>({ queryKey: ['photos', 'infinite'] }, (old) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            photos: page.photos.map((photo) => {
              if (photo.group_id === context?.tempGroupId) {
                return {
                  ...photo,
                  group_id: finalGroupId
                };
              }
              return photo;
            })
          }))
        };
      });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (error: unknown, photoIds, context) => {
      if (context?.previousInfinite) {
        context.previousInfinite.forEach(([queryKey, value]) => {
          queryClient.setQueryData(queryKey, value);
        });
      }
      handleError(error, '群组创建失败');
    }
  });
};

export const useRemoveFromGroupMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useFeedback();
  const invalidatePhotos = useInvalidatePhotos();

  return useMutation({
    mutationFn: ({ photoIds, groupId }: { photoIds: string[]; groupId: string }) => 
      removePhotosFromGroup(photoIds, groupId),
    onMutate: async ({ photoIds, groupId }) => {
      await queryClient.cancelQueries({ queryKey: ['photos'] });
      await queryClient.cancelQueries({ queryKey: ['groups'] });

      const previousInfinite = queryClient.getQueriesData<InfiniteData<InfinitePhotosData>>({ queryKey: ['photos', 'infinite'] });
      const idSet = new Set(photoIds);

      let remainingSameGroupCount = 0;
      previousInfinite.forEach(([_, value]) => {
        if (value?.pages) {
          value.pages.forEach((page) => {
            page.photos.forEach((photo) => {
              if ((photo.group_id === groupId) && !idSet.has(photo.id)) {
                remainingSameGroupCount++;
              }
            });
          });
        }
      });

      const shouldDissolveEntireGroup = remainingSameGroupCount <= 1;

      queryClient.setQueriesData<InfiniteData<InfinitePhotosData>>({ queryKey: ['photos', 'infinite'] }, (old) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            photos: page.photos.map((photo) => {
              if (idSet.has(photo.id)) {
                return {
                  ...photo,
                  group_id: null,
                  is_group_cover: false,
                  is_pinned: false
                };
              }
              if (shouldDissolveEntireGroup && (photo.group_id === groupId)) {
                return {
                  ...photo,
                  group_id: null,
                  is_group_cover: false,
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
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (error: unknown, variables, context) => {
      if (context?.previousInfinite) {
        context.previousInfinite.forEach(([queryKey, value]) => {
          queryClient.setQueryData(queryKey, value);
        });
      }
      handleError(error, '移出群组失败');
    }
  });
};

export const useUngroupMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useFeedback();
  const invalidatePhotos = useInvalidatePhotos();

  return useMutation({
    mutationFn: (groupId: string) => ungroupPhotos(groupId),
    onMutate: async (groupId) => {
      await queryClient.cancelQueries({ queryKey: ['photos'] });
      await queryClient.cancelQueries({ queryKey: ['groups'] });

      const previousInfinite = queryClient.getQueriesData<InfiniteData<InfinitePhotosData>>({ queryKey: ['photos', 'infinite'] });

      queryClient.setQueriesData<InfiniteData<InfinitePhotosData>>({ queryKey: ['photos', 'infinite'] }, (old) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            photos: page.photos.map((photo) => {
              if (photo.group_id === groupId) {
                return {
                  ...photo,
                  group_id: null,
                  is_group_cover: false,
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
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (error: unknown, variables, context) => {
      if (context?.previousInfinite) {
        context.previousInfinite.forEach(([queryKey, value]) => {
          queryClient.setQueryData(queryKey, value);
        });
      }
      handleError(error, '取消群组失败');
    }
  });
};

export const useDeleteGroupFromCloudMutation = () => {
  const queryClient = useQueryClient();
  const { handleError } = useFeedback();
  const invalidatePhotos = useInvalidatePhotos();

  return useMutation({
    mutationFn: (groupId: string) => ungroupPhotos(groupId),
    onMutate: async (groupId) => {
      await queryClient.cancelQueries({ queryKey: ['photos'] });
      await queryClient.cancelQueries({ queryKey: ['groups'] });

      const previousInfinite = queryClient.getQueriesData<InfiniteData<InfinitePhotosData>>({ queryKey: ['photos', 'infinite'] });

      queryClient.setQueriesData<InfiniteData<InfinitePhotosData>>({ queryKey: ['photos', 'infinite'] }, (old) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            photos: page.photos.map((photo) => {
              if (photo.group_id === groupId) {
                return {
                  ...photo,
                  group_id: null,
                  is_group_cover: false,
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
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (error: unknown, variables, context) => {
      if (context?.previousInfinite) {
        context.previousInfinite.forEach(([queryKey, value]) => {
          queryClient.setQueryData(queryKey, value);
        });
      }
      handleError(error, '删除群组失败');
    }
  });
};
