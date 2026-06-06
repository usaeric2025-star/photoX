import { useMemo } from 'react';
import { usePhotos, useUrlFilters, useCategories, useTags, useAdminMode, usePermission } from '@/hooks';
import { normalizeAdminPhotos } from '@/lib/selectors/photos';
import { processPhotos } from '@/lib/filters';
import { useUIStore } from '@/store/useUIStore';
import { usePhotoGallery } from '@/features/photos/usePhotoGallery';
import { Photo } from '@/types';

/**
 * Encapsulated hook for admin photo data processing.
 * Handles fetching, normalization, processing IDs (hidden while processing), and filters.
 */
export const useAdminPhotos = (isManagement: boolean) => {
    const isAdminMode = useAdminMode() && isManagement;
    const { filters: urlFilters } = useUrlFilters();
    const processingIds = useUIStore(s => s.processingIds);
    
    const { data: categories = [] } = useCategories();
    const { data: tags = [] } = useTags();
    const { photos: rawPhotos, infinitePhotosQuery } = usePhotoGallery();

    const photos = useMemo(() => {
        const normalized = normalizeAdminPhotos(rawPhotos);
        if (!processingIds || processingIds.length === 0) return normalized;
        return normalized.filter(p => !processingIds.includes(p.id));
    }, [rawPhotos, processingIds]);

    const { displayPhotos, gridPhotos } = useMemo(() => {
        return processPhotos(
            photos,
            categories,
            tags,
            urlFilters as any,
            urlFilters,
            {
                showGroupsCollapsed: urlFilters.showGroupsCollapsed,
                isAdminModeOverride: isAdminMode
            }
        );
    }, [photos, categories, tags, urlFilters, isAdminMode]);

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
