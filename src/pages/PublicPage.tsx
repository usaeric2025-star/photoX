import React from 'react';
import { useFilters } from '@/hooks/useFilters';
import { useTranslation, usePhotoGrid, usePublicSettings } from '@/hooks';
import { PublicHeader } from '@/components/layouts/headers/PublicHeader';
import { FilterBar } from '@/features/filter/FilterBar';
import { PublicPhotoGrid } from '@/components/photo/PublicPhotoGrid';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useColumns } from '@/features/layout/hooks/useColumns';
import { YarlLightbox } from '@/features/lightbox/YarlLightbox';
import { useUIStore } from '@/store/useUIStore';
import { WhatsAppChoiceDialog } from '@/components/shared/WhatsAppChoiceDialog';
import { PublicFloatingActions } from '@/components/photo/PublicFloatingActions';
import { PhotoErrorDisplay } from '@/components/photo/PhotoErrorDisplay';

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
  
  const photoGridData = usePhotoGrid({
    categoryId: category,
    tagId: tags?.[0],
    searchQuery: search,
    sortOrder: sort,
    onlyGroupsCover: showGroupsCollapsed
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
    console.log('[Diagnostic] PublicPage Check:', info);
    
    if (isError) {
      console.error('[Diagnostic] PublicPage Error:', error);
    }
  }, [photos, totalCount, isFetching, photoGridData.isPending, isError, error, settings, category, tags, search]);

  const lightboxIndex = React.useMemo(() => {
    if (!photoId) return -1;
    return photos.findIndex((p: any) => p.id === photoId);
  }, [photoId, photos]);

  const lightboxOpen = lightboxIndex !== -1;

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

  const openWhatsApp = (num: string) => {
    const pendingPhoto = (window as any)._pendingPhoto as any;
    let message = '';
    
    if (pendingPhoto) {
      const prompt = t.sharePrompt || "您好，我对这个家具感兴趣：";
      const itemCode = pendingPhoto.itemCode || "";
      const name = pendingPhoto.name?.zh || pendingPhoto.name?.en || "";
      const url = pendingPhoto.imageUrl || "";
      message = `${prompt}\n*${name}* (${itemCode})\n${url}`;
      (window as any)._pendingPhoto = undefined;
    } else {
      message = "您好，我正在浏览您的家具相冊，想了解更多信息！";
    }
    
    const encodedText = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${num}?text=${encodedText}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    updateUI({ showWhatsAppChoice: false });
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
    <div className="flex flex-col h-full w-full bg-slate-50" id="public-view">
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
            columns={columns}
            filters={{ category, tags, search, sort, showGroupsCollapsed }}
          />
        </ErrorBoundary>
        
        <PublicFloatingActions 
          onScrollToTop={() => {}} 
          onWhatsAppClick={() => updateUI({ showWhatsAppChoice: true })}
        />
      </div>
      
      <YarlLightbox
        open={lightboxOpen}
        items={lightboxItems}
        currentIndex={Math.max(0, lightboxIndex)}
        onClose={() => setPhotoId(null)}
        onIndexChange={handleIndexChange}
      />

      <WhatsAppChoiceDialog 
        isOpen={showWhatsAppChoice}
        onClose={() => updateUI({ showWhatsAppChoice: false })}
        settings={settings || null}
        onSelect={openWhatsApp}
        labels={t}
      />
      
      {/* 诊断信息悬浮层 (仅限于调试 URL 时显示 或 常驻便于排查) */}
      <div className="fixed bottom-4 left-4 z-[9999] bg-black/80 text-green-400 font-mono text-xs p-4 rounded-lg pointer-events-none max-w-sm overflow-hidden break-all shadow-xl">
        <h3 className="text-white font-bold mb-2 border-b border-white/20 pb-1">Public Page Diagnostics</h3>
        <pre className="whitespace-pre-wrap">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>
    </div>
  );
}
