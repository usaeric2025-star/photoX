import { useUrlFilters, useCategories, useTags, useAdminMode } from '@/hooks';
import { useUIStore } from '@/store/useUIStore';
import { usePhotoGallery } from '@/hooks/photo/usePhotoGallery';
import { Photo } from '@/types';
import { EMPTY_ARRAY } from '@/constants/config';
import { processPhotos } from '@/services/photo/processing';

/**
 * Encapsulated hook for admin photo data processing.
 * Handles fetching, normalization, processing IDs (hidden while processing), and filters.
 * React Compiler handles auto-memoization of this hook/component.
 */
export const useAdminPhotos = () => {
    const isManagement = window.location.pathname.startsWith('/admin');
    const isAdminMode = useAdminMode() && isManagement;
    const { filters: urlFilters } = useUrlFilters();
    const processingIds = useUIStore(s => s.processingIds);
    
    const { data: categories = EMPTY_ARRAY as any[] } = useCategories();
    const { data: tags = EMPTY_ARRAY as any[] } = useTags();
    const { photos: rawPhotos, infinitePhotosQuery } = usePhotoGallery();

    const tagMap = new Map<string, string[]>();
    tags.forEach((t: any) => {
        const terms = [t.name.toLowerCase()];
        if (Array.isArray(t.aliases)) {
            t.aliases.forEach((a: string) => terms.push(a.toLowerCase()));
        }
        tagMap.set(String(t.id), terms);
    });

    const catMap = new Map<string, string[]>();
    categories.forEach((c: any) => {
        const terms = [(c.name || '').toLowerCase()];
        if (Array.isArray(c.aliases)) {
            c.aliases.forEach((a: string) => terms.push(a.toLowerCase()));
        }
        catMap.set(String(c.id), terms);
    });

    const photos = (!processingIds || processingIds.length === 0) 
        ? rawPhotos 
        : rawPhotos.filter((p: any) => !processingIds.includes(p.id));

    const result = processPhotos(
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

