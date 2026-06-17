import React from 'react';
import { useCategories } from './useCategories';
import { useManufacturers } from './useManufacturers';
import { useTags } from './useTags';
import { usePhotos } from './usePhotos';
import { useFilters } from '../useFilters';
import { processPhotos } from '@/services/photo/processing';
import { EMPTY_ARRAY } from '@/constants/config';
import { logger } from '@/lib/logger';
import { useTranslation } from '../core/useTranslation';
import { getTranslatedCategoryName } from '@/services/category/utils';
import { Photo, Category, Tag, Manufacturer } from '@/types/photo';

/**
 * usePublicPhotos
 * Encapsulated hook for public photo data processing.
 * Handles fetching, normalization, and filters.
 */
export const usePublicPhotos = () => {
    const filters = useFilters();
    const { data: categories = EMPTY_ARRAY as unknown as Category[] } = useCategories();
    const { data: tags = EMPTY_ARRAY as unknown as Tag[] } = useTags();
    const { data: manufacturers = EMPTY_ARRAY as unknown as Manufacturer[] } = useManufacturers();
    const { lang, uiTranslations: t } = useTranslation();

    const tagsString = Array.isArray(filters.tags) ? filters.tags.join(',') : '';

    const photoFilters = ({
      category_id: filters.category || undefined,
      tag_id: filters.tags && filters.tags.length > 0 ? filters.tags[0] : undefined,
      searchQuery: filters.search || undefined,
      sortOrder: filters.sort || 'newest',
      isAdminMode: false
    });

    const infinitePhotosQuery = usePhotos(photoFilters);

    const rawPhotosBase = (infinitePhotosQuery.data as { photos: Record<string, unknown>[] })?.photos || [];
    
    const rawPhotos = (() => {
        return rawPhotosBase.map((p) => {
        const photo = p as Record<string, unknown>;
        const categoryId = String(photo.category_id);
        const manufacturerId = String(photo.manufacturer_id);
        
        const cat = categories.find((c) => String((c as Category).id) === categoryId) as unknown as Category | undefined;
        const man = manufacturers.find((m) => String((m as Manufacturer).id) === manufacturerId) as unknown as Manufacturer | undefined;
        
        return {
            ...photo,
            categoryName: cat ? getTranslatedCategoryName(categoryId, categories as Category[], lang, t) : '',
            manufacturerName: man ? String(man.name) : ''
        } as Photo;
    });
    })();

    logger.debug("[usePublicPhotos] Debug:", {
        status: infinitePhotosQuery.status,
        isFetching: infinitePhotosQuery.isFetching,
        isPending: infinitePhotosQuery.isPending,
        error: infinitePhotosQuery.error,
        hasData: !!infinitePhotosQuery.data,
        rawPhotosCount: rawPhotos.length
    });

    const tagMap = (() => {
        const map = new Map<string, string[]>();
        tags.forEach((t) => {
            const terms = [(String(t.name)).toLowerCase()];
            if (Array.isArray(t.aliases)) {
                (t.aliases as string[]).forEach((a: string) => terms.push(a.toLowerCase()));
            }
            map.set(String(t.id), terms);
        });
        return map;
    })();

    const catMap = (() => {
        const map = new Map<string, string[]>();
        categories.forEach((c) => {
            const terms = [(String(c.name) || '').toLowerCase()];
            if (Array.isArray(c.aliases)) {
                (c.aliases as string[]).forEach((a: string) => terms.push(a.toLowerCase()));
            }
            map.set(String(c.id), terms);
        });
        return map;
    })();

    const processedResult = (() => {
        if (!rawPhotos.length) return null;
        return processPhotos(
            rawPhotos,
            categories,
            tags,
            {
              showGroupsCollapsed: filters.showGroupsCollapsed,
              searchQuery: filters.search,
              categoryId: filters.category,
              tagId: filters.tags?.[0] ?? null,
            },
            {
              sortOrder: filters.sort,
            },
            {
                showGroupsCollapsed: filters.showGroupsCollapsed,
                isAdminModeOverride: false,
                tagMap,
                catMap
            }
        );
    })();

    return {
        gridPhotos: processedResult?.gridPhotos || EMPTY_ARRAY,
        photos: rawPhotos,
        isPending: infinitePhotosQuery.isPending || (infinitePhotosQuery.isFetching && !rawPhotos.length),
        isFetching: infinitePhotosQuery.isFetching,
        isFetchingNextPage: infinitePhotosQuery.isFetchingNextPage,
        hasNextPage: !!infinitePhotosQuery.hasNextPage,
        fetchNextPage: infinitePhotosQuery.fetchNextPage,
        refetch: () => infinitePhotosQuery.refetch(),
        isRefreshing: infinitePhotosQuery.isRefetching,
        isError: infinitePhotosQuery.isError,
        error: infinitePhotosQuery.error,
        categories,
        tags,
        filters
    };
};

