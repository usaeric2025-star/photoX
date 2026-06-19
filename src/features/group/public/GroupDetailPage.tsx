import React, { useState, useRef } from 'react';
import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import { useGroupData } from '../shared/hooks/useGroupData';
import { PhotoListItem } from '@/types/api';
import { Photo, Group, Category } from '@/types';
import { PublicPhotoCard } from '@/components/photo/PublicPhotoCard';
import { YarlLightbox } from '@/features/lightbox/YarlLightbox';
import { useFilters, useTranslation, useCategories } from '@/hooks';
import { getTranslatedCategoryName } from '@/services/category/utils';
import { GroupHeader } from '../shared/components/GroupHeader';
import { PageSkeleton } from '@/components/ui/PageSkeleton';
import { Button } from '@/components/shared/Button';
import { useUIStore } from '@/store/useUIStore';
import { usePublicSettings } from '@/hooks/settings/useSettings';
import { WhatsAppDialog } from '@/components/shared/WhatsAppDialog';

function PublicPhotoGrid({ photos, categories, onPhotoClick }: { photos: PhotoListItem[]; categories?: Category[]; onPhotoClick: (id: string) => void }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1 sm:gap-2 p-1 sm:p-2 lg:p-4">
      {photos.map((photo) => (
        <PublicPhotoCard
          key={photo.id}
          photo={photo as any}
          onClick={() => onPhotoClick(photo.id)}
          hideGroupBadge={true}
          sharedCategories={categories}
        />
      ))}
    </div>
  );
}

export function PublicGroupDetailPage() {
  const routerSafe = useRouterSafe();
  const { groupId: fGroupId, photoId, setPhotoId } = useFilters();
  const groupId = (routerSafe.params as { groupId?: string }).groupId || fGroupId;
  
  const { group, photos, totalCount, loading, error } = useGroupData({ groupId, isAdmin: false });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const showWhatsAppChoice = useUIStore((s) => s.showWhatsAppChoice);
  const updateUI = useUIStore((s) => s.update);
  const { data: settings } = usePublicSettings();

  const lightboxIndex = React.useMemo(() => {
    if (!photoId) return -1;
    return photos.findIndex((p) => p.id === photoId);
  }, [photoId, photos]);

  const lightboxOpen = lightboxIndex !== -1;
  
  const { lang, uiTranslations: t } = useTranslation();
  const { data: categories = [] } = useCategories();
  
  const lightboxItems = photos.map((p) => {
    return {
      id: p.id,
      src: p.imageUrl,
      thumbnail: p.thumbnailUrl || p.imageUrl,
      title: p.name || '',
      description: p.description || '',
      category: '',
      tags: p.tags || [],
      photo: p as any,
    };
  });

  const handleScrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openWhatsApp = () => {
    (window as any)._pendingPhoto = undefined;
    updateUI({ showWhatsAppChoice: false });
  };

  const getWhatsAppOptions = () => {
    const options: { name: string; url: string }[] = [];
    const pendingPhoto = (window as any)._pendingPhoto as any;
    let message = '';
    
    if (pendingPhoto) {
      const prompt = t.sharePrompt || "您好，我对这个家具感兴趣：";
      const name = (pendingPhoto as any).name || "";
      const url = (pendingPhoto as any).imageUrl || "";
      message = `${prompt}\n*${name}*\n${url}`;
    } else {
      const groupName = group?.name || '';
      message = `您好，我對合組 *${groupName}* 很感興趣，想了解更多信息！`;
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

  if (loading) return <PageSkeleton />;
  if (error) return <div className="p-4 text-red-500">錯誤：{error}</div>;
  if (!group) return <div className="p-4 flex flex-col justify-center items-center h-full"><div className="text-xl text-slate-500 mb-4">合組不存在或已被刪除</div><Button onClick={() => window.history.back()}>返回</Button></div>;
  
  return (
    <div className="min-h-screen bg-slate-50 group-detail-public flex flex-col relative w-full h-[100dvh] overflow-hidden overscroll-none">
      <div className="flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm relative">
        <GroupHeader 
          group={group} 
          photoCount={totalCount} 
          isAdmin={false} 
        />
      </div>
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative overscroll-y-auto overscroll-x-none bg-slate-50">
        <PublicPhotoGrid photos={photos} categories={categories} onPhotoClick={(id: string) => {
             setPhotoId(id);
        }} />
      </div>
      <YarlLightbox
        open={lightboxOpen}
        items={lightboxItems}
        currentIndex={Math.max(0, lightboxIndex)}
        onClose={() => setPhotoId(null)}
        onIndexChange={(idx: number) => {
           const photo = photos[idx];
           if (photo) setPhotoId(photo.id);
        }}
      />

      <WhatsAppDialog />
    </div>
  );
}
