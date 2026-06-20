import { logger } from '@/lib/logger';
import React from 'react';
import { useFilters } from '@/hooks/useFilters';
import { useTranslation, usePhotoGrid, usePublicSettings } from '@/hooks';
import { PublicHeader } from '@/components/layouts/headers/PublicHeader';
import { FilterBar } from '@/features/filter/FilterBar';
import { PublicPhotoGrid } from '@/components/photo/PublicPhotoGrid';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useColumns } from '@/features/layout/hooks/useColumns';
import { LazyYarlLightbox } from '@/features/lightbox/LazyYarlLightbox';
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
  const [showScrollTop, setShowScrollTop] = React.useState(false);
  const gridRef = React.useRef<any>(null);
  
  const isAggregated = showGroupsCollapsed && !search && !category && !tags.length;

  const photoGridData = usePhotoGrid({
    categoryId: category,
    tagId: tags?.[0],
    searchQuery: search,
    sortOrder: sort,
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

  // 诊断日志：帮助排查骨头屏阻塞问题
  const [debugInfo, setDebugInfo] = React.useState<any>({});
  
  React.useEffect(() => {
    const info = {
      timestamp: new Date().toISOString(),
      photosCount: photos?.length || 0,
      totalCount,
      isFetching,
      isPending: photoGridData.isPending,
      isError,
      hasError: !!error,
      errorMessage: error?.message || String(error || ''),
      hasSettings: !!settings,
      category,
      tagsCount: tags?.length || 0,
      search,
      tags
    };
    setDebugInfo(info);
    logger.debug('[Diagnostic] PublicPage Check:', info);
    
    if (isError) {
      logger.error('[Diagnostic] PublicPage Error:', error);
    }
  }, [photos, totalCount, isFetching, photoGridData.isPending, isError, error, settings, category, tags, search]);

  const lightboxIndex = React.useMemo(() => {
    if (!photoId) return -1;
    const index = photos.findIndex((p: any) => p.id === photoId);
    logger.debug('[Lightbox Debug] Find Index Result:', { photoId, index });
    return index;
  }, [photoId, photos]);

  const lightboxOpen = lightboxIndex !== -1;

  React.useEffect(() => {
    logger.debug('[Lightbox Debug]', { photoId, lightboxIndex, lightboxOpen, photosCount: photos.length });
  }, [photoId, lightboxIndex, lightboxOpen, photos]);

  const lightboxItems = React.useMemo(() => photos.map((p: any) => {
    return {
      id: p.id,
      src: p.imageUrl,
      thumbnail: p.thumbnailUrl || p.imageUrl,
      title: p.name || '',
      description: p.description || '',
      category: p.groupName || '',
      tags: p.tags || [],
      photo: p,
    };
  }), [photos]);

  const handleIndexChange = (index: number) => {
    const photo = photos[index];
    if (photo && photo.id !== photoId) {
      setPhotoId(photo.id);
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  const openWhatsApp = () => {
    (window as unknown as { _pendingPhoto: undefined })._pendingPhoto = undefined;
    updateUI({ showWhatsAppChoice: false });
  };

  const getWhatsAppOptions = () => {
    const options: { name: string; url: string }[] = [];
    const pendingPhoto = (window as unknown as { _pendingPhoto: Record<string, unknown> | undefined })._pendingPhoto;
    let message = '';
    
    if (pendingPhoto) {
      const prompt = t.sharePrompt || "您好，我对这个家具感兴趣：";
      const itemCode = (pendingPhoto.itemCode as string) || "";
      const nameObj = pendingPhoto.name as Record<string, string> | undefined;
      const name = nameObj?.zh || nameObj?.en || "";
      const url = (pendingPhoto.imageUrl as string) || "";
      message = `${prompt}\n*${name}* (${itemCode})\n${url}`;
    } else {
      message = "您好，我正在浏览您的家具相冊，想了解更多信息！";
    }
    
    const encodedText = encodeURIComponent(message);
    
    if (settings?.whatsapp_1) {
      options.push({ name: settings.whatsapp_1_name || 'Contact 1', url: `https://wa.me/${settings.whatsapp_1}?text=${encodedText}` });
    }
    if (settings?.whatsapp_2) {
      options.push({ name: settings.whatsapp_2_name || 'Contact 2', url: `https://wa.me/${settings.whatsapp_2}?text=${encodedText}` });
    }
    
    if (options.length === 0) {
      const fallback = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_WHATSAPP_NUMBER : '';
      if (fallback) {
        options.push({ name: t.whatsAppInquiry, url: `https://wa.me/${fallback}?text=${encodedText}` });
      }
    }
    
    return options;
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

  const { data: globalTotal, isLoading: isCountLoading } = useQuery({
    queryKey: ['photos', 'count', 'total', 'all'],
    queryFn: async () => {
      // 統一讀取總量，不區分管理者模式以反映真實庫存
      const res = await api.photos.count.$post({ json: { isAdminMode: true } });
      if (!res.ok) return 0;
      const json = await res.json();
      return (json as any).data as number;
    },
    staleTime: 5 * 60 * 1000 // 減少重複 API 調用
  });

  const totalToDisplay = globalTotal ?? totalCount;

  return (
    <div 
      className="flex flex-col h-full w-full bg-surface-base relative overflow-hidden" 
      id="public-view"
      style={{ height: '100dvh' }}
    >
      <div className="flex-1 min-h-0 relative bg-surface-soft overflow-hidden order-0">
        <ErrorBoundary>
          <PublicPhotoGrid 
            {...photoGridData}
            gridRef={gridRef}
            onScroll={(offset) => setShowScrollTop(offset > 300)}
            columns={columns}
            filters={{ category, tags, search, sort, showGroupsCollapsed }}
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
            <Icon name="ArrowUp" size={22} className="group-hover:-translate-y-0.5 transition-transform" />
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
          <Icon name="MessageCircle" size={26} solid />
        </button>
      </div>
      
      <LazyYarlLightbox
        open={lightboxOpen}
        items={lightboxItems}
        currentIndex={Math.max(0, lightboxIndex)}
        onClose={() => setPhotoId(null)}
        onIndexChange={handleIndexChange}
      />

      <WhatsAppDialog />
    </div>
  );
}
