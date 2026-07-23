import { useAtomValue } from 'jotai';
import { showWhatsAppChoiceAtom, userAtom, authLoadingAtom } from '#src/store/index.js';
import { patch } from '#lib/store/index.js';
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFilters } from '#src/features/filters/index.js';
import { useTranslation } from '#src/hooks/index.js';
import { PublicHeader } from '#src/components/layout/PublicHeader.js';
import { FilterBar } from '#src/features/filters/index.js';
import { PhotoWall } from '#src/features/photo-wall/index.js';
import { ErrorBoundary } from '#src/components/shared/ErrorBoundary.js';
import {  type UIStoreState } from '#lib/store/index.js';
import { Icon } from '#src/components/ui/Icon.js';
import { WhatsAppDialog } from '#src/components/shared/WhatsAppDialog.js';

import { TopLayer } from '#src/components/ui/TopLayer.js';

export default function PublicPage() {
  const user = useAtomValue(userAtom);
  const isAuthLoading = useAtomValue(authLoadingAtom);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { 
    category, 
    tags, 
    search, 
    sort, 
    showGroupsCollapsed,
  } = useFilters();
  
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const filters = useMemo(() => {
    const categoryId = (category && category !== 'all' && category !== '') ? category : undefined;
    const tagId = (tags && tags.length > 0) ? tags[0] : undefined;
    
    return {
      categoryId,
      tagId,
      searchQuery: search || undefined,
      sortOrder: sort || undefined,
      onlyGroupsCover: showGroupsCollapsed
    };
  }, [category, tags, search, sort, showGroupsCollapsed]);

  const showWhatsAppChoice = useAtomValue(showWhatsAppChoiceAtom);
  
  const { t } = useTranslation();

  useEffect(() => {
    if (user && !isAuthLoading && searchParams.get('mode') !== 'public') {
      navigate('/admin', { replace: true });
    }
  }, [user, isAuthLoading, searchParams, navigate]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setShowScrollTop(scrollTop > 400);
  };

  const handleScrollToTop = () => {
    scrollContainerRef.current?.scrollTo({
      top: 0,
      behavior: 'auto'
    });
  };

  return (
    <div 
      className="flex flex-col h-full w-full bg-surface-base relative overflow-hidden" 
      id="public-view"
    >
      <PublicHeader />
      
      {/* 頂部過濾區域 - 增加內邊距確保大搜索框模式下的視覺寬鬆度 */}
      <div className="bg-white">
        <FilterBar mode="public" className="max-w-screen-2xl mx-auto" />
      </div>

      <div 
        id="photo-wall-scroll-container"
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 relative bg-surface-soft overflow-y-auto"
      >
        <ErrorBoundary>
          <PhotoWall 
            mode="public"
            filters={filters}
          />
        </ErrorBoundary>
      </div>

      <TopLayer type="popover" className="bottom-6 right-6 flex flex-col gap-3 top-auto left-auto">
        {showScrollTop && (
          <button
            onClick={handleScrollToTop}
            type="button"
            className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-900/95 text-white border border-slate-800 shadow-xl hover:bg-slate-800 transition-all active:scale-90 focus:outline-none animate-in fade-in slide-in-from-bottom-3 duration-300"
            title="Scroll to Top"
          >
            <Icon name="chevron-up" size={22} />
          </button>
        )}
        <button
          onClick={() => {
            patch({ showWhatsAppChoice: true, pendingPhotoId: null });
          }}
          type="button"
          className="w-12 h-12 flex items-center justify-center rounded-full bg-success text-text-on-primary shadow-lg hover:opacity-90 transition-all active:scale-90 focus:outline-none"
          title={t('whatsAppInquiry')}
        >
          <Icon name="whatsapp" size={26} />
        </button>
      </TopLayer>

      {showWhatsAppChoice && (
        <WhatsAppDialog 
          open={showWhatsAppChoice} 
          onOpenChange={(val) => patch({ showWhatsAppChoice: val })} 
        />
      )}
    </div>
  );
}
