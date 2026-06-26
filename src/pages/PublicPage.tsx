import React, { useMemo, useState, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useFilters } from '@/hooks/useFilters';
import { useTranslation, usePublicSettings, usePhotoGrid } from '@/hooks';
import { PublicHeader } from '@/components/layouts/headers/PublicHeader';
import { FilterBar } from '@/features/filter/FilterBar';
import { PublicPhotoGrid } from '@/components/photo/PublicPhotoGrid';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useColumns } from '@/hooks';
import { useLightbox, photosToLightboxSlides } from '@/lib/lightbox';
import { useUI, hasActiveFiltersSelector, type UIStoreState, uiStore } from '@/lib/store';
import { WhatsAppDialog } from '@/components/shared/WhatsAppDialog';
import { PhotoErrorDisplay } from '@/components/photo/PhotoErrorDisplay';
import { Icon } from '@/components/ui/Icon';

export default function PublicPage() {
  logger.info('[PublicPage] Rendering');
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
  const gridRef = useRef<import('virtua').VListHandle | null>(null);
  
  const hasFilters = useUI(hasActiveFiltersSelector);
  const isAggregated = showGroupsCollapsed && !hasFilters;
  
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

  const showWhatsAppChoice = useUI((s: UIStoreState) => s.showWhatsAppChoice);
  const patch = useUI(s => s.patch);
  const { lang, uiTranslations: t } = useTranslation();
  const { data: settings } = usePublicSettings();

  const handleRefresh = () => {
    refetch();
  };

  const openLightbox = useUI(s => s.openLightbox);
  
  const lightboxItems = useMemo(() => photosToLightboxSlides(photos), [photos]);

  // 同步燈箱數據：當照片列表更新且處於燈箱模式時
  useEffect(() => {
    if (photoId && photos.length > 0) {
      const index = photos.findIndex(p => p.id === photoId);
      if (index !== -1) {
         const { lightboxIsOpen, lightboxCurrentIndex } = uiStore.getState();
         // 只有当灯箱没开，或者灯箱打开但显示的不是当前 photoId 时才打开
         if (!lightboxIsOpen || photos[lightboxCurrentIndex]?.id !== photoId) {
            openLightbox(lightboxItems, index);
         }
      }
    }
  }, [photos, photoId, openLightbox, lightboxItems]);

  const handlePhotoClick = (id: string, index: number) => {
    openLightbox(lightboxItems, index);
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

  return (
    <div 
      className="flex flex-col h-full w-full bg-surface-base relative overflow-hidden" 
      id="public-view"
    >
      <div className="absolute inset-0 pointer-events-none opacity-0 select-none">PUBLIC_PAGE_RENDERED</div>
      
      {/* 頂部導航組 - 確保垂直堆疊，不擠壓照片 */}
      <PublicHeader 
        totalCount={totalCount}
        onRefresh={handleRefresh}
        isRefreshing={isFetching}
      />

      <FilterBar mode="public" className="border-b shadow-sm" />

      {/* 照片網格區域 - 自動佔滿剩餘空間 */}
      <div className="flex-1 min-h-0 relative bg-surface-soft overflow-hidden">
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
            patch({ showWhatsAppChoice: true });
          }}
          type="button"
          className="w-12 h-12 flex items-center justify-center rounded-full bg-success text-text-on-primary shadow-lg hover:opacity-90 transition-all active:scale-90 focus:outline-none"
          title="WhatsApp 諮詢"
        >
          <Icon name="message-circle" size={26} solid />
        </button>
      </div>
    </div>
  );
}
