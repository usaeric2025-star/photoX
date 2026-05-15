import { useGalleryStore } from '../store';
import { useMemo } from 'react';
import { filterPhotos, groupPhotos } from '../lib/filters';
import { safeArray } from '../utils/safeAccess';

export const useGallery = () => {
    const store = useGalleryStore();
    
    // Derived computations
    const tagNameToIdMap = useMemo(() => {
        const map = new Map<string, string>();
        store.tags.forEach(tag => map.set(tag.name, tag.id));
        return map;
    }, [store.tags]);

    const tagIdToNameMap = useMemo(() => {
        const map = new Map<string, string>();
        store.tags.forEach(tag => map.set(tag.id, tag.name));
        return map;
    }, [store.tags]);

    const displayPhotos = useMemo(() => {
        return filterPhotos(store.photos, {
            searchQuery: store.debouncedSearchQuery,
            filterCatId: store.filterCatId,
            filterSubId: store.filterSubId,
            filterTagIds: store.filterTagIds,
            sortOrder: store.sortOrder,
            isAdminMode: store.isAdminMode,
            isStaffMode: store.isStaffMode
        }, store.tags);
    }, [store.photos, store.debouncedSearchQuery, store.filterCatId, store.filterSubId, store.filterTagIds, store.sortOrder, store.isAdminMode, store.isStaffMode, store.tags]);

    const gridPhotos = useMemo(() => {
        return groupPhotos(displayPhotos, store.showGroupsCollapsed, store.sortOrder);
    }, [displayPhotos, store.showGroupsCollapsed, store.sortOrder]);

    const stableTagCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        store.photos.forEach(p => {
            const ids = safeArray<string | number>(p.tagIds);
            ids.forEach(id => {
                counts[String(id)] = (counts[String(id)] || 0) + 1;
            });
        });
        return counts;
    }, [store.photos]);

    const sortedTags = useMemo(() => {
        return [...store.tags].sort((a, b) => {
            const bCount = stableTagCounts[String(b.id)] || 0;
            const aCount = stableTagCounts[String(a.id)] || 0;
            if (bCount !== aCount) return bCount - aCount;
            return a.name.localeCompare(b.name, undefined, { numeric: true });
        });
    }, [store.tags, stableTagCounts]);

    return {
        ...store,
        tagNameToIdMap,
        tagIdToNameMap,
        displayPhotos,
        gridPhotos,
        totalGridCount: gridPhotos.length,
        sortedTags
    };
};
