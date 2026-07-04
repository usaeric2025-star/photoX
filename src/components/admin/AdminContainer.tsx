import { logger } from '#lib/logger.js';
import React, { useEffect, useState, useRef } from 'react';
import { PhotoWall, usePhotoWall } from '#src/features/photo-wall/index.js';
import { useTranslation, useFilters } from '#src/hooks/index.js';
import { useGrid } from '#src/context/GridContext.js';
import { AdminEmptyState } from '#src/pages/AdminPage/AdminEmptyState.js';
import { PhotoErrorDisplay } from '#src/components/photo/PhotoErrorDisplay.js';
import { ErrorBoundary } from '#src/components/shared/ErrorBoundary.js';
import { useAdminMaintenance } from '#src/hooks/admin/useAdminMaintenance.js';
import { useUI } from '#lib/store/index.js';
import { Icon } from '#src/components/ui/Icon.js';

import { ScrollToTopButton } from '#src/components/ui/ScrollToTopButton.js';

export function AdminContainer() {
  const filters = useFilters({ enableStatus: true });
  const isAggregated = filters.showGroupsCollapsed;
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const filtersObj = React.useMemo(() => ({
    categoryId: (filters.category && filters.category !== 'all' && filters.category !== '') ? filters.category : undefined,
    tagId: filters.tags?.[0],
    searchQuery: filters.search,
    sortOrder: filters.sort,
    onlyGroupsCover: isAggregated,
    isAdminMode: true
  }), [filters.category, filters.tags, filters.search, filters.sort, isAggregated]);

  const { photos, total, isLoading, error, refresh } = usePhotoWall(filtersObj);
  
  const { uiTranslations: labels } = useTranslation();
  const { columns } = useGrid();
  const adminActions = useAdminMaintenance();

  const patch = useUI(s => s.patch);
  useEffect(() => {
    if (total !== undefined) {
      patch({ totalCount: total });
    }
  }, [total, patch]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setShowScrollTop(scrollTop > 400);
  };

  const handleScrollToTop = () => {
    scrollContainerRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  
  if (error) {
    return (
      <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative justify-center items-center p-8" id="main-admin-error-screen">
        <ErrorBoundary fallback={null}>
          <PhotoErrorDisplay error={error} onRetry={refresh} />
        </ErrorBoundary>
      </div>
    );
  }

  if (photos.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative" id="main-admin-screen">
        <AdminEmptyState labels={labels} />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative animate-fade-in" id="main-admin-screen">
       <div 
         ref={scrollContainerRef}
         onScroll={handleScroll}
         className="flex-1 min-h-0 relative overflow-y-auto"
       >
          <PhotoWall 
            mode="admin"
            filters={filtersObj}
          />
       </div>

       <ScrollToTopButton show={showScrollTop} onClick={handleScrollToTop} />
    </div>
  );
}

