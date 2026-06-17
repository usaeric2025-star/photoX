import React from 'react';
import { useCategories } from '../photo/useCategories';
import { useTags } from '../photo/useTags';
import { usePhotos } from '../photo/usePhotos';
import { useAdminMode } from '../core/auth/useAdminMode';
import { useUIStore } from '@/store/useUIStore';
import { useFilters } from '@/hooks/useFilters';
import { Photo, Category, Tag } from '@/types';
import { EMPTY_ARRAY } from '@/constants/config';
import { processPhotos } from '@/services/photo/processing';

/**
 * Encapsulated hook for admin photo data processing.
 */
export const useAdminPhotos = () => {
    const isManagement = window.location.pathname.startsWith('/admin');
    const isAdminMode = useAdminMode() && isManagement;
    const filters = useFilters({ enableStatus: true });
    const processingIds = useUIStore(s => s.processingIds);
    
    const { data: categories = EMPTY_ARRAY as Category[] } = useCategories();
    const { data: tags = EMPTY_ARRAY as Tag[] } = useTags();

    const tagsString = Array.isArray(filters.tags) ? filters.tags.join(',') : '';

    const photoFilters = ({
      category_id: filters.category || undefined,
      tag_id: filters.tags && filters.tags.length > 0 ? filters.tags[0] : undefined,
      searchQuery: filters.search || undefined,
      sortOrder: filters.sort || 'newest',
      isAdminMode: isAdminMode,
      status: filters.status || 'all'
    });

    const infinitePhotosQuery = usePhotos(photoFilters as any);


    const rawPhotos = (infinitePhotosQuery.data as any)?.photos || [];

    const tagMap = React.useMemo(() => {
        const map = new Map<string, string[]>();
        tags.forEach((t: Tag) => {
            const nameStr = t.name || '';
            const terms = [nameStr.toLowerCase()];
            if (Array.isArray(t.aliases)) {
                t.aliases.forEach((a: string) => terms.push((a || '').toLowerCase()));
            }
            map.set(String(t.id), terms);
        });
        return map;
    }, [tags]);

    const catMap = React.useMemo(() => {
        const map = new Map<string, string[]>();
        categories.forEach((c: Category) => {
            const terms = [(c.name || '').toLowerCase()];
            if (Array.isArray(c.aliases)) {
                c.aliases.forEach((a: string) => terms.push((a || '').toLowerCase()));
            }
            map.set(String(c.id), terms);
        });
        return map;
    }, [categories]);

    const photos = React.useMemo(() => {
        return (!processingIds || processingIds.length === 0) 
            ? rawPhotos 
            : rawPhotos.filter((p: Photo) => !processingIds.includes(p.id));
    }, [rawPhotos, processingIds]);

    const result = React.useMemo(() => {
        return processPhotos(
            photos,
            categories,
            tags,
            {
                showGroupsCollapsed: filters.showGroupsCollapsed,
                searchQuery: filters.search,
                categoryId: filters.category,
                tagId: filters.tags && filters.tags.length > 0 ? filters.tags[0] : null,
            },
            {
                sortOrder: filters.sort,
            },
            {
                showGroupsCollapsed: filters.showGroupsCollapsed,
                isAdminModeOverride: isAdminMode,
                tagMap,
                catMap
            }
        );
    }, [photos, categories, tags, filters.showGroupsCollapsed, filters.search, filters.category, filters.tags, filters.sort, isAdminMode, tagMap, catMap]);

    const displayPhotos = result?.displayPhotos || [];
    const gridPhotos = result?.gridPhotos || [];

    return {
        photos,
        displayPhotos,
        gridPhotos,
        isPending: infinitePhotosQuery.isPending || (infinitePhotosQuery.isFetching && !rawPhotos.length),
        isFetchingNextPage: infinitePhotosQuery.isFetchingNextPage,
        hasNextPage: !!infinitePhotosQuery.hasNextPage,
        fetchNextPage: infinitePhotosQuery.fetchNextPage,
        infiniteQuery: infinitePhotosQuery,
        filters,
        isAdminMode
    };
};

