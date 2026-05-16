export const QUERY_KEYS = {
  photos: (filters: any) => ['photos', filters] as const,
  infinitePhotos: (filters: any) => ['photos', 'infinite', filters] as const,
  tags: ['tags'] as const,
  categories: ['categories'] as const,
  manufacturers: ['manufacturers'] as const,
  photoCount: (filters: any) => ['photos', 'count', filters] as const,
  groupPhotos: (groupId: string) => ['photos', 'group', groupId] as const,
};
