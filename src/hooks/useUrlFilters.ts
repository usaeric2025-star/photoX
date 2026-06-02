import { useSearch, useNavigate } from '@tanstack/react-router';
import { GallerySearchParams } from '../router';

export function useUrlFilters() {
  const search = useSearch({ from: '__root__' }) as GallerySearchParams;
  const navigate = useNavigate();

  const filters = {
    categoryId: search.category ?? null,
    searchQuery: search.q ?? '',
    sortOrder: search.sort ?? 'newest',
    groupId: search.groupId ?? null,
    photoId: search.photoId ?? null,
    showGroupsCollapsed: search.showGroupsCollapsed !== 'false',
  };

  const setCategory = (categoryId: string | null) => {
    navigate({ search: (prev) => ({ ...prev, category: categoryId || undefined }) });
  };

  const setSearchQuery = (q: string) => {
    navigate({ search: (prev) => ({ ...prev, q: q || undefined }) });
  };

  const setSortOrder = (sort: 'newest' | 'oldest' | 'name') => {
    navigate({ search: (prev) => ({ ...prev, sort }) });
  };
  
  const setGroupId = (groupId: string | null) => {
    navigate({ search: (prev) => ({ ...prev, groupId: groupId || undefined }) });
  };
  
  const setPhotoId = (photoId: string | null) => {
    navigate({ search: (prev) => ({ ...prev, photoId: photoId || undefined }) });
  };

  const setShowGroupsCollapsed = (collapsed: boolean) => {
    navigate({ search: (prev) => ({ ...prev, showGroupsCollapsed: collapsed ? undefined : 'false' }) });
  };

  return { filters, setCategory, setSearchQuery, setSortOrder, setGroupId, setPhotoId, setShowGroupsCollapsed };
}
