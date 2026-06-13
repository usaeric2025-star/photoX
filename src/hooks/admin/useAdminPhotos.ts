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
    const { dataFilters } = useUrlFilters();
    const processingIds = useUIStore(s => s.processingIds);
    
    const { data: categories = EMPTY_ARRAY as any[] } = useCategories();
    const { data: tags = EMPTY_ARRAY as any[] } = useTags();
    const { photos: rawPhotos, infinitePhotosQuery } = usePhotoGallery();

    const tagMap = (() => {
        const map = new Map<string, string[]>();
        tags.forEach((t: any) => {
            const terms = [t.name.toLowerCase()];
            if (Array.isArray(t.aliases)) {
                t.aliases.forEach((a: string) => terms.push(a.toLowerCase()));
            }
            map.set(String(t.id), terms);
        });
        return map;
    })();

    const catMap = (() => {
        const map = new Map<string, string[]>();
        categories.forEach((c: any) => {
            const terms = [(c.name || '').toLowerCase()];
            if (Array.isArray(c.aliases)) {
                c.aliases.forEach((a: string) => terms.push(a.toLowerCase()));
            }
            map.set(String(c.id), terms);
        });
        return map;
    })();

    const photos = (!processingIds || processingIds.length === 0) 
        ? rawPhotos 
        : rawPhotos.filter((p: any) => !processingIds.includes(p.id));

    const result = (processPhotos(
        photos as any,
        categories,
        tags,
        dataFilters as any,
        dataFilters,
        {
            showGroupsCollapsed: dataFilters.showGroupsCollapsed,
            isAdminModeOverride: isAdminMode,
            tagMap,
            catMap
        }
    ));

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
        dataFilters,
        isAdminMode
    };
};

