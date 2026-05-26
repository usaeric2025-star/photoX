export const photoKeys = {
  all: ['photos'] as const,
  lists: () => [...photoKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...photoKeys.lists(), filters] as const,
  infinite: (filters: Record<string, any>) => [...photoKeys.all, 'infinite', filters] as const,
  group: (groupId: string) => [...photoKeys.all, 'group', groupId] as const,
};

export const groupKeys = {
  all: ['groups'] as const,
  list: () => [...groupKeys.all, 'list'] as const,
  detail: (groupId: string) => [...groupKeys.all, 'detail', groupId] as const,
};

export const settingsKeys = {
  all: ['settings'] as const,
};

export type PhotoQueryKey = ReturnType<typeof photoKeys.list>;
export type GroupQueryKey = ReturnType<typeof groupKeys.detail>;
