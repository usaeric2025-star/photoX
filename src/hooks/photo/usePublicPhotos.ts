import { useUrlFilters, useCategories, useTags } from '@/hooks';
import { usePhotoGallery } from '@/hooks/photo/usePhotoGallery';
import { processPhotos } from '@/services/photo/processing';
import { EMPTY_ARRAY } from '@/constants/config';

/**
 * usePublicPhotos
 * Encapsulated hook for public photo data processing.
 * Handles fetching, normalization, and filters.
 * React Compiler handles auto-memoization of this component/hook.
 */
export const usePublicPhotos = () => {
    const { filters: urlFilters } = useUrlFilters();
    const { data: categories = EMPTY_ARRAY as any[] } = useCategories();
    const { data: tags = EMPTY_ARRAY as any[] } = useTags();
    const { photos: rawPhotos, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = usePhotoGallery();

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

    const processedResult = processPhotos(
        rawPhotos,
        categories,
        tags,
        urlFilters as any,
        urlFilters,
        {
            showGroupsCollapsed: urlFilters.showGroupsCollapsed,
            isAdminModeOverride: false,
            tagMap,
            catMap
        }
    );

    return {
        gridPhotos: processedResult?.gridPhotos || EMPTY_ARRAY,
        photos: rawPhotos,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
        categories,
        tags
    };
};

