import { useMemo, useEffect } from 'react';
import { useUrlFilters, useCategories, useTags, useAdminMode, useProcessedPhotos } from '@/hooks';
import { useUIStore } from '@/store/useUIStore';
import { usePhotoGallery } from '@/hooks/photo/usePhotoGallery';
import { Photo } from '@/types';
import { EMPTY_ARRAY } from '@/constants/config';

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

    const { process, result, isProcessing: isWorkerProcessing } = useProcessedPhotos();

    const photos = useMemo(() => {
        if (!processingIds || processingIds.length === 0) return rawPhotos;
        return rawPhotos.filter((p: any) => !processingIds.includes(p.id));
    }, [rawPhotos, processingIds]);

    useEffect(() => {
        process(
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
    }, [photos, categories, tags, urlFilters, isAdminMode, process]);

    const displayPhotos = result?.displayPhotos || [];
    const gridPhotos = result?.gridPhotos || [];

    return {
        photos,
        displayPhotos,
        gridPhotos,
        isLoading: infinitePhotosQuery.isLoading || (isWorkerProcessing && !result),
        isFetchingNextPage: infinitePhotosQuery.isFetchingNextPage,
        hasNextPage: !!infinitePhotosQuery.hasNextPage,
        fetchNextPage: infinitePhotosQuery.fetchNextPage,
        infiniteQuery: infinitePhotosQuery,
        urlFilters,
        isAdminMode
    };
};
