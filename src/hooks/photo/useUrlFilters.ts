import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import React from 'react';
import { useSearch } from '@tanstack/react-router';
import { GallerySearchParams } from '@/types/router';

export function useUrlFilters() {
  const search = useSearch({ from: '__root__' }) as GallerySearchParams;
  const params = useRouterSafe().params;
  const navigate = useRouterSafe().navigate;

  const filters = {
    categoryId: search.category ?? null,
    tagId: search.tag ?? null,
    manufacturerId: search.manufacturer ?? null,
    searchQuery: search.q ?? '',
    sortOrder: search.sort ?? 'newest',
    groupId: params.groupId || search.groupId || null,
    photoId: search.photoId ?? null,
    showGroupsCollapsed: search.showGroupsCollapsed !== 'false',
    is_hidden: search.hidden === 'true',
    onlyUngrouped: search.onlyUngrouped === 'true',
    view: search.view || 'grid' 
  };

  const setView = (view: 'grid' | 'list') => {
    navigate({ search: { ...search, view: view === 'grid' ? undefined : 'list' } as any });
  };

  const setCategory = (categoryId: string | null) => {
    navigate({ search: { ...search, category: categoryId || undefined, tag: undefined, q: undefined } as any });
  };

  const setTagId = (tagId: string | null) => {
    navigate({ search: { ...search, tag: tagId || undefined, category: undefined, q: undefined } as any });
  };

  const setSearchQuery = (q: string) => {
    navigate({ search: { ...search, q: q || undefined, category: undefined, tag: undefined } as any });
  };

  const setSortOrder = (sort: 'newest' | 'oldest' | 'name') => {
    navigate({ search: { ...search, sort: sort === 'newest' ? undefined : sort } as any });
  };
  
  const setGroupId = (groupId: string | null) => {
    navigate({ search: { ...search, groupId: groupId || undefined } as any, resetScroll: false });
  };
  
  const setPhotoId = (photoId: string | null) => {
    navigate({ search: { ...search, photoId: photoId || undefined } as any, resetScroll: false });
  };

  const setShowGroupsCollapsed = (collapsed: boolean) => {
    navigate({ search: { ...search, showGroupsCollapsed: collapsed ? undefined : 'false' } as any });
  };

  return { filters, setCategory, setTagId, setSearchQuery, setSortOrder, setGroupId, setPhotoId, setShowGroupsCollapsed, setView };
}
