import { useGalleryStore } from '../store';
import { useMemo } from 'react';
import { filterPhotos, groupPhotos } from '../lib/filters';
import { usePhotosQuery } from './queries/usePhotos';
import { useTagsQuery } from './queries/useTags';
import { useCategoriesQuery } from './queries/useCategories';
import { useManufacturersQuery } from './queries/useManufacturers';

export const useGallery = () => {
    const store = useGalleryStore();
    
    // Server state via React Query
    // Note: page is now managed locally in components or via infinite query
    // For this hook, we'll provide a default or handle it via store if we decide to keep it there.
    // However, store.page was removed, so we'll use a fixed initial range or allow passing it.
    const { data: qPhotos = [] } = usePhotosQuery({ 
        categoryId: store.filterCatId, 
        tagId: store.filterTagIds.length === 1 ? store.filterTagIds[0] : null,
        searchQuery: store.debouncedSearchQuery
    }, 0, store.visibleCount);
    
    const { data: qTags = [] } = useTagsQuery();
    const { data: qCategories = [] } = useCategoriesQuery();
    const { data: qManufacturers = [] } = useManufacturersQuery();

    const photos = qPhotos;
    const tags = qTags;
    const categories = qCategories;
    const manufacturers = qManufacturers;

    const tagNameToIdMap = useMemo(() => {
        const map = new Map<string, string>();
        tags.forEach(tag => map.set(tag.name, tag.id));
        return map;
    }, [tags]);

    const tagIdToNameMap = useMemo(() => {
        const map = new Map<string, string>();
        tags.forEach(tag => map.set(tag.id, tag.name));
        return map;
    }, [tags]);

    const displayPhotos = useMemo(() => {
        const tagMap = new Map<string, string[]>();
        tags.forEach(t => {
          const terms = [t.name.toLowerCase()];
          if (Array.isArray(t.aliases)) {
            t.aliases.forEach(a => terms.push(a.toLowerCase()));
          }
          tagMap.set(String(t.id), terms);
        });
        
        const catMap = new Map<string, string[]>();
        categories.forEach(c => {
          const terms = [(c.zh || c.name || '').toLowerCase()];
          if (Array.isArray(c.aliases)) {
            c.aliases.forEach(a => terms.push(a.toLowerCase()));
          }
          catMap.set(String(c.id), terms);
        });

        return filterPhotos(photos, {
            searchQuery: store.debouncedSearchQuery,
            filterCatId: store.filterCatId,
            filterSubId: store.filterSubId,
            filterTagIds: store.filterTagIds,
            sortOrder: store.sortOrder,
            isAdminMode: store.isAdminMode,
            isStaffMode: store.isStaffMode
        }, tags, categories, tagMap, catMap);
    }, [photos, store.debouncedSearchQuery, store.filterCatId, store.filterSubId, store.filterTagIds, store.sortOrder, store.isAdminMode, store.isStaffMode, tags, categories]);

    const gridPhotos = useMemo(() => {
        return groupPhotos(displayPhotos, store.showGroupsCollapsed, store.sortOrder);
    }, [displayPhotos, store.showGroupsCollapsed, store.sortOrder]);

    const stableTagCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        photos.forEach(p => {
            const ids = p.tagIds || [];
            ids.forEach(id => {
                counts[String(id)] = (counts[String(id)] || 0) + 1;
            });
        });
        return counts;
    }, [photos]);

    const sortedTags = useMemo(() => {
        return [...tags].sort((a, b) => {
            const bCount = stableTagCounts[String(b.id)] || 0;
            const aCount = stableTagCounts[String(a.id)] || 0;
            if (bCount !== aCount) return bCount - aCount;
            return a.name.localeCompare(b.name, undefined, { numeric: true });
        });
    }, [tags, stableTagCounts]);

    return {
        ...store,
        photos,
        tags,
        categories,
        manufacturers,
        tagNameToIdMap,
        tagIdToNameMap,
        displayPhotos,
        gridPhotos,
        totalGridCount: gridPhotos.length,
        sortedTags
    };
};
