import React from 'react';
import { PhotoWall } from '#src/features/photo-wall/index.js';
import { useFilters } from '#src/hooks/index.js';

export function AdminContainer() {
  const filters = useFilters();
  const isAggregated = filters.showGroupsCollapsed;
  
  const filtersObj = React.useMemo(() => ({
    categoryId: (filters.category && filters.category !== 'all' && filters.category !== '') ? filters.category : undefined,
    tagId: filters.tags?.[0],
    searchQuery: filters.search,
    sortOrder: filters.sort,
    onlyGroupsCover: isAggregated,
    isAdminMode: true
  }), [filters.category, filters.tags, filters.search, filters.sort, isAggregated]);
  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden relative animate-fade-in" id="main-admin-screen">
       <div 
         id="photo-wall-scroll-container"
         className="flex-1 min-h-0 relative overflow-y-auto"
       >
          <PhotoWall 
            mode="admin"
            filters={filtersObj}
          />
       </div>
    </div>
  );
}
