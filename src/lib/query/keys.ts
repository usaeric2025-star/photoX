export const queryKeys = {
  photos: {
    all: ['photos'] as const,
    lists: () => [...queryKeys.photos.all, 'list'] as const,
    list: (filters: unknown) => [...queryKeys.photos.lists(), { filters }] as const,
    details: () => [...queryKeys.photos.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.photos.details(), id] as const,
  },
  categories: {
    all: ['categories'] as const,
    list: () => [...queryKeys.categories.all, 'list'] as const,
  },
  tags: {
    all: ['tags'] as const,
    list: () => [...queryKeys.tags.all, 'list'] as const,
    search: (keyword: string) => [...queryKeys.tags.all, 'search', { keyword }] as const,
  },
  groups: {
    all: ['groups'] as const,
    lists: () => [...queryKeys.groups.all, 'list'] as const,
    details: () => [...queryKeys.groups.all, 'detail'] as const,
    detail: (id: string, includePhotos?: boolean) => [...queryKeys.groups.details(), id, { includePhotos }] as const,
  },
  manufacturers: {
    all: ['manufacturers'] as const,
    list: () => [...queryKeys.manufacturers.all, 'list'] as const,
  },
  settings: {
    all: ['settings'] as const,
    public: () => [...queryKeys.settings.all, 'public'] as const,
    admin: () => [...queryKeys.settings.all, 'admin'] as const,
  },
  diagnostics: {
    all: ['diagnostics'] as const,
  },
  maintenance: {
    all: ['maintenance'] as const,
    stats: () => [...queryKeys.maintenance.all, 'stats'] as const,
    jobs: () => [...queryKeys.maintenance.all, 'jobs'] as const,
  }
};

export const photoKeys = queryKeys.photos;
