import { useMemo } from 'react';
import { useUrlFilters, useCategories, useTags, useAdminMode } from '@/hooks';
import { useUIStore } from '@/store/useUIStore';
import { usePhotoGallery } from '@/hooks/photo/usePhotoGallery';
import { Photo } from '@/types';
import { EMPTY_ARRAY } from '@/constants/config';
import { processPhotos } from '@/services/photo/processing';

/**
 * Encapsulated hook for admin photo data processing.
 * Handles fetching, normalization, processing IDs (hidden while processing), and filters.
 */
export const useAdminPhotos = () => {
    const isManagement = window.location.pathname.startsWith('/admin');
    const isAdminMode = useAdminMode() && isManagement;
    const { filters: urlFilters } = useUrlFilters();
    const processingIds = useUIStore(s => s.processingIds);
    
    const { data: categories = EMPTY_ARRAY as any[] } = useCategories();
    const { data: tags = EMPTY_ARRAY as any[] } = useTags();
    const { photos: rawPhotos, infinitePhotosQuery } = usePhotoGallery();

    const tagMap = useMemo(() => {
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

    const catMap = useMemo(() => {
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

    const photos = useMemo(() => {
        if (!processingIds || processingIds.length === 0) return rawPhotos;
        return rawPhotos.filter((p: any) => !processingIds.includes(p.id));
    }, [rawPhotos, processingIds]);

    const result = useMemo(() => {
        return processPhotos(
            photos,
            categories,
            tags,
            urlFilters as any,
            urlFilters,
            {
                showGroupsCollapsed: urlFilters.showGroupsCollapsed,
                isAdminModeOverride: isAdminMode,
                tagMap,
                catMap
            }
        );
    }, [photos, categories, tags, urlFilters, isAdminMode, tagMap, catMap]);

    const displayPhotos = result?.displayPhotos || [];
    const gridPhotos = result?.gridPhotos || [];

    return {
        photos,
        displayPhotos,
        gridPhotos,
        isLoading: infinitePhotosQuery.isLoading,
        isFetchingNextPage: infinitePhotosQuery.isFetchingNextPage,
        hasNextPage: !!infinitePhotosQuery.hasNextPage,
        fetchNextPage: infinitePhotosQuery.fetchNextPage,
        infiniteQuery: infinitePhotosQuery,
        urlFilters,
        isAdminMode
    };
};
