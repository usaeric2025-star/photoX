import React from 'react';
import { useCategories } from './useCategories';
import { useManufacturers } from './useManufacturers';
import { useTags } from './useTags';
import { usePhotos } from './usePhotos';
import { useFilters } from '../useFilters';
import { processPhotos } from '@/services/photo/processing';
import { EMPTY_ARRAY } from '@/constants/config';

/**
 * usePublicPhotos
 * Encapsulated hook for public photo data processing.
 * Handles fetching, normalization, and filters.
 */
export const usePublicPhotos = () => {
    const filters = useFilters();
    const { data: categories = EMPTY_ARRAY as any[] } = useCategories();
    const { data: tags = EMPTY_ARRAY as any[] } = useTags();

    const { data: manufacturers = EMPTY_ARRAY as any[] } = useManufacturers();

    const infinitePhotosQuery = usePhotos({
      category_id: filters.category || undefined,
      tag_id: filters.tags && filters.tags.length > 0 ? filters.tags[0] : undefined,
      searchQuery: filters.search || undefined,
      sortOrder: filters.sort || 'newest',
      isAdminMode: false
    });

    const rawPhotosBase = (infinitePhotosQuery.data as any)?.photos || [];
    
    const rawPhotos = React.useMemo(() => {
        return rawPhotosBase.map((p: any) => {
            const cat = categories.find((c: any) => String(c.id) === String(p.category_id));
            const man = manufacturers.find((m: any) => String(m.id) === String(p.manufacturer_id));
            return {
                ...p,
                categoryName: cat ? (typeof cat.name === 'object' ? (cat.name.zh || cat.name.en || '') : cat.name) : '',
                manufacturerName: man ? (typeof man.name === 'object' ? (man.name.zh || man.name.en || '') : man.name) : ''
            };
        });
    }, [rawPhotosBase, categories, manufacturers]);

    console.log("[usePublicPhotos] Debug:", {
        status: infinitePhotosQuery.status,
        isFetching: infinitePhotosQuery.isFetching,
        isPending: infinitePhotosQuery.isPending,
        error: infinitePhotosQuery.error,
        hasData: !!infinitePhotosQuery.data,
        rawPhotosCount: rawPhotos.length
    });

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

    const processedResult = React.useMemo(() => {
        if (!rawPhotos.length) return null;
        return processPhotos(
            rawPhotos,
            categories,
            tags,
            {
              searchQuery: filters.search,
              categoryId: filters.category,
              tagId: filters.tags?.[0],
              sortOrder: filters.sort as any,
            },
            {
              sortOrder: filters.sort as any,
              showGroupsCollapsed: filters.showGroupsCollapsed,
            },
            {
                showGroupsCollapsed: filters.showGroupsCollapsed,
                isAdminModeOverride: false,
                tagMap,
                catMap
            }
        );
    }, [rawPhotos, categories, tags, filters, tagMap, catMap]);

    return {
        gridPhotos: processedResult?.gridPhotos || EMPTY_ARRAY,
        photos: rawPhotos,
        isLoading: infinitePhotosQuery.isLoading || (infinitePhotosQuery.isFetching && !rawPhotos.length),
        isFetchingNextPage: infinitePhotosQuery.isFetchingNextPage,
        hasNextPage: !!infinitePhotosQuery.hasNextPage,
        fetchNextPage: infinitePhotosQuery.fetchNextPage,
        refetch: () => infinitePhotosQuery.refetch(),
        isRefreshing: infinitePhotosQuery.isRefetching,
        categories,
        tags,
        filters
    };
};

