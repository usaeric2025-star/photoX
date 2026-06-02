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
  };

  const setCategory = (categoryId: string | null) => {
    navigate({ search: ((prev: any) => ({ ...prev, category: categoryId || undefined })) as any });
  };

  const setSearchQuery = (q: string) => {
    navigate({ search: ((prev: any) => ({ ...prev, q: q || undefined })) as any });
  };

  const setSortOrder = (sort: 'newest' | 'oldest' | 'name') => {
    navigate({ search: ((prev: any) => ({ ...prev, sort })) as any });
  };
  
  const setGroupId = (groupId: string | null) => {
    navigate({ search: ((prev: any) => ({ ...prev, groupId: groupId || undefined })) as any });
  };
  
  const setPhotoId = (photoId: string | null) => {
    navigate({ search: ((prev: any) => ({ ...prev, photoId: photoId || undefined })) as any });
  };

  return { filters, setCategory, setSearchQuery, setSortOrder, setGroupId, setPhotoId };
}
