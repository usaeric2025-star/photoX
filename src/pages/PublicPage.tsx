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
import { ArrowUp, MessageCircle } from 'lucide-react';

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
      <div className="flex flex-col h-full w-full bg-slate-50">
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
    <div className="flex flex-col h-full min-h-screen w-full bg-slate-50 relative" id="public-view">
      <PublicHeader 
        totalCount={totalCount}
        onRefresh={handleRefresh}
        isRefreshing={isFetching}
      />
      <FilterBar mode="public" />
      <div className="flex-1 overflow-hidden relative">
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

      {/* 懸浮按鈕組 (回到頂部 & WhatsApp 諮詢) */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3">
        {showScrollTop && (
          <button
            onClick={() => gridRef.current?.scrollToIndex(0)}
            type="button"
            className="w-12 h-12 flex items-center justify-center rounded-full bg-white/95 backdrop-blur border border-slate-200 text-slate-700 shadow-lg hover:shadow-xl hover:bg-slate-50 transition-all active:scale-95 group focus:outline-none"
            title="回到頂部"
          >
            <ArrowUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        )}
        <button
          onClick={() => {
            logger.debug('[PublicPage] WhatsApp button clicked');
            updateUI({ showWhatsAppChoice: true });
          }}
          type="button"
          className="w-12 h-12 flex items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl transition-all active:scale-95 focus:outline-none"
          title="WhatsApp 諮詢"
        >
          <MessageCircle className="w-6 h-6" />
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
