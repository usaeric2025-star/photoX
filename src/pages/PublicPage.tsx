import React, { useMemo, useState, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useFilters } from '@/hooks/useFilters';
import { useTranslation, usePhotoGrid, usePublicSettings } from '@/hooks';
import { PublicHeader } from '@/components/layouts/headers/PublicHeader';
import { FilterBar } from '@/features/filter/FilterBar';
import { PublicPhotoGrid } from '@/components/photo/PublicPhotoGrid';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useColumns } from '@/features/layout/hooks/useColumns';
import { useLightbox, photosToLightboxSlides } from '@/lib/lightbox';
import { useUIStore } from '@/store/useUIStore';
import { WhatsAppDialog } from '@/components/shared/WhatsAppDialog';
import { PhotoErrorDisplay } from '@/components/photo/PhotoErrorDisplay';
import { Icon } from '@/components/ui/Icon';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
export default function PublicPage() {
  const { 
    category, 
    tags, 
    search, 
    sort, 
    showGroupsCollapsed,
    photoId,
    setPhotoId
  } = useFilters();
  
  const { columns } = useColumns();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const gridRef = useRef<{ scrollToIndex: (index: number) => void } | null>(null);
  
  const isAggregated = showGroupsCollapsed && !search && !category && (!tags || tags.length === 0);
  
  const photoGridData = usePhotoGrid({
    categoryId: category || undefined,
    tagId: (tags && tags.length > 0) ? tags[0] : undefined,
    searchQuery: search || undefined,
    sortOrder: sort || undefined,
    onlyGroupsCover: isAggregated
  }, 'public');

  const { 
    photos, 
    totalCount,
    refetch,
    isError,
    error,
    isFetching,
  } = photoGridData;

  const showWhatsAppChoice = useUIStore((s) => s.showWhatsAppChoice);
  const updateUI = useUIStore((s) => s.update);
  const { lang, uiTranslations: t } = useTranslation();
  const { data: settings } = usePublicSettings();

  const handleRefresh = () => {
    refetch();
  };

  const { data: globalTotal, isLoading: isCountLoading } = useQuery({
    queryKey: ['photos', 'count', 'total', 'all'],
    queryFn: async () => {
      const res = await api.photos.count.$post({ json: { isAdminMode: true } });
      if (!res.ok) return 0;
      const json = await res.json() as { data: number };
      return json.data;
    },
    staleTime: 5 * 60 * 1000
  });

  const { open } = useLightbox();
  
  const lightboxItems = React.useMemo(() => photosToLightboxSlides(photos), [photos]);

  // 同步燈箱數據：當照片列表更新且處於燈箱模式時
  React.useEffect(() => {
    if (photoId && photos.length > 0) {
      const index = photos.findIndex(p => p.id === photoId);
      open(lightboxItems, index !== -1 ? index : 0);
    }
  }, [photos, photoId, open, lightboxItems]);

  const handlePhotoClick = (id: string, index: number) => {
    open(lightboxItems, index);
    setPhotoId(id);
  };

  if (isError) {
    return (
      <div className="flex flex-col h-full w-full bg-surface-soft">
        <PublicHeader totalCount={0} onRefresh={handleRefresh} isRefreshing={false} />
        <div className="flex-1 flex items-center justify-center p-8">
           <ErrorBoundary fallback={null}>
             <PhotoErrorDisplay error={error} onRetry={() => refetch()} />
           </ErrorBoundary>
        </div>
      </div>
    );
  }

  const totalToDisplay = globalTotal ?? totalCount;

  return (
    <div 
      className="flex flex-col h-full w-full bg-surface-base relative overflow-hidden" 
      id="public-view"
    >
      <div className="absolute inset-0 pointer-events-none opacity-0 select-none">PUBLIC_PAGE_RENDERED</div>
      <div className="flex-1 min-h-0 relative bg-surface-soft overflow-hidden order-0">
        <ErrorBoundary>
          <PublicPhotoGrid 
            {...photoGridData}
            gridRef={gridRef}
            onScroll={(offset) => setShowScrollTop(offset > 300)}
            columns={columns}
            filters={{ category, tags, search, sort, showGroupsCollapsed }}
            onPhotoClick={handlePhotoClick}
          />
        </ErrorBoundary>
      </div>

      <FilterBar mode="public" className="order-[-1]" />

      <PublicHeader 
        totalCount={totalToDisplay}
        onRefresh={handleRefresh}
        isRefreshing={isFetching || isCountLoading}
        className="order-first"
      />

      {/* 懸浮按鈕組 (回到頂部 & WhatsApp 諮詢) - Apple Style */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3">
        {showScrollTop && (
          <button
            onClick={() => gridRef.current?.scrollToIndex(0)}
            type="button"
            className="w-12 h-12 flex items-center justify-center rounded-full bg-surface-overlay backdrop-blur-xl text-text-main shadow-lg hover:bg-white transition-all active:scale-90 group focus:outline-none"
            title="回到頂部"
          >
            <Icon name="arrow-up" size={22} className="group-hover:-translate-y-0.5 transition-transform" />
          </button>
        )}
        <button
          onClick={() => {
            logger.debug('[PublicPage] WhatsApp button clicked');
            updateUI({ showWhatsAppChoice: true });
          }}
          type="button"
          className="w-12 h-12 flex items-center justify-center rounded-full bg-success text-text-on-primary shadow-lg hover:opacity-90 transition-all active:scale-90 focus:outline-none"
          title="WhatsApp 諮詢"
        >
          <Icon name="message-circle" size={26} solid />
        </button>
      </div>
      
      <WhatsAppDialog />
    </div>
  );
}
