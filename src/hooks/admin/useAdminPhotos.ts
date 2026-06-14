import React from 'react';
import { useCategories } from '../photo/useCategories';
import { useTags } from '../photo/useTags';
import { usePhotos } from '../photo/usePhotos';
import { useAdminMode } from '../core/auth/useAdminMode';
import { useUIStore } from '@/store/useUIStore';
import { useFilters } from '@/hooks/useFilters';
import { Photo } from '@/types';
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
    
    const { data: categories = EMPTY_ARRAY as any[] } = useCategories();
    const { data: tags = EMPTY_ARRAY as any[] } = useTags();

    const infinitePhotosQuery = usePhotos({
      category_id: filters.category || undefined,
      tag_id: filters.tags && filters.tags.length > 0 ? filters.tags[0] : undefined,
      searchQuery: filters.search || undefined,
      sortOrder: filters.sort || 'newest',
      isAdminMode: isAdminMode,
      status: filters.status || 'all'
    } as any);

    const rawPhotos = (infinitePhotosQuery.data as any)?.photos || [];

    const tagMap = React.useMemo(() => {
        const map = new Map<string, string[]>();
        tags.forEach((t: any) => {
            const terms = [t.name.toLowerCase()];
            if (Array.isArray(t.aliases)) {
                t.aliases.forEach((a: string) => terms.push(a.toLowerCase()));
            }
            map.set(String(t.id), terms);
        });
        return map;
    }, [tags]);

    const catMap = React.useMemo(() => {
        const map = new Map<string, string[]>();
        categories.forEach((c: any) => {
            const terms = [(c.name || '').toLowerCase()];
            if (Array.isArray(c.aliases)) {
                c.aliases.forEach((a: string) => terms.push(a.toLowerCase()));
            }
            map.set(String(c.id), terms);
        });
        return map;
    }, [categories]);

    const photos = (!processingIds || processingIds.length === 0) 
        ? rawPhotos 
        : rawPhotos.filter((p: any) => !processingIds.includes(p.id));

    const result = React.useMemo(() => (processPhotos(
        photos as any,
        categories,
        tags,
        filters as any,
        filters as any,
        {
            showGroupsCollapsed: filters.showGroupsCollapsed,
            isAdminModeOverride: isAdminMode,
            tagMap,
            catMap
        }
    )), [photos, categories, tags, filters, isAdminMode, tagMap, catMap]);

    const displayPhotos = result?.displayPhotos || [];
    const gridPhotos = result?.gridPhotos || [];

    return {
        photos,
        displayPhotos,
        gridPhotos,
        isLoading: infinitePhotosQuery.isLoading || (infinitePhotosQuery.isFetching && !rawPhotos.length),
        isFetchingNextPage: infinitePhotosQuery.isFetchingNextPage,
        hasNextPage: !!infinitePhotosQuery.hasNextPage,
        fetchNextPage: infinitePhotosQuery.fetchNextPage,
        infiniteQuery: infinitePhotosQuery,
        filters,
        isAdminMode
    };
};

